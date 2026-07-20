import time
from typing import List, Dict, Callable
from app.services.hand_tracking.models import HandTrackingEvent, HandDetectionFrame

class HandTrackingEventPublisher:
    def __init__(self):
        self.listeners: List[Callable[[HandTrackingEvent], None]] = []
        
        # Keep track of active hand states from previous frames to detect transitions
        self.last_pinched: Dict[int, bool] = {}
        self.last_presence: Dict[int, float] = {}

    def subscribe(self, listener: Callable[[HandTrackingEvent], None]) -> None:
        self.listeners.append(listener)

    def publish(self, event: HandTrackingEvent) -> None:
        for listener in self.listeners:
            try:
                listener(event)
            except Exception as e:
                # Shield the main pipeline from individual listener errors
                print(f"[EventError] Failed to execute listener hook: {e}")

    def evaluate_transitions(self, active_frames: List[HandDetectionFrame]) -> None:
        """
        Compares current frames with history keys to verify entered/lost/pinch events.
        """
        current_time = time.time()
        active_ids = {frame.hand_id for frame in active_frames}
        
        # 1. Detect Hand Entrance Events
        for frame in active_frames:
            hand_id = frame.hand_id
            if hand_id not in self.last_presence:
                self.publish(
                    HandTrackingEvent(
                        event_type="HAND_ENTERED",
                        hand_id=hand_id,
                        label=frame.label,
                        timestamp=current_time,
                        metadata={"confidence": frame.confidence_score}
                    )
                )
            
            # 2. Detect Pinch State Transitions
            was_pinched = self.last_pinched.get(hand_id, False)
            is_pinched = frame.state.is_pinching
            
            if is_pinched and not was_pinched:
                self.publish(
                    HandTrackingEvent(
                        event_type="FINGER_PINCHED",
                        hand_id=hand_id,
                        label=frame.label,
                        timestamp=current_time,
                        metadata={"distance_mm": frame.state.pinch_distance_mm}
                    )
                )
            elif not is_pinched and was_pinched:
                self.publish(
                    HandTrackingEvent(
                        event_type="FINGER_RELEASED",
                        hand_id=hand_id,
                        label=frame.label,
                        timestamp=current_time,
                        metadata={"distance_mm": frame.state.pinch_distance_mm}
                    )
                )
            
            # Update pinch state cache
            self.last_pinched[hand_id] = is_pinched
            self.last_presence[hand_id] = current_time

        # 3. Detect Hand Exit/Lost Events
        lost_ids = [hid for hid in self.last_presence if hid not in active_ids]
        for hid in lost_ids:
            self.publish(
                HandTrackingEvent(
                    event_type="HAND_LOST",
                    hand_id=hid,
                    label="Unknown",
                    timestamp=current_time
                )
            )
            # Remove from active tracking state maps
            if hid in self.last_presence:
                del self.last_presence[hid]
            if hid in self.last_pinched:
                del self.last_pinched[hid]
