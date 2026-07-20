import time
from typing import Dict, Optional, List
from app.services.gesture_recognition.config import GestureTrackerConfig
from app.services.gesture_recognition.models import GestureDetectionResult

class FalsePositiveReducer:
    def __init__(self, config: GestureTrackerConfig):
        self.config = config
        
        # Cooldown record: { hand_id: timestamp_of_last_trigger }
        self.cooldowns: Dict[int, float] = {}
        
        # Debounce record for static gestures: { hand_id: (gesture_name, consecutive_frames_count) }
        self.static_debounce: Dict[int, tuple[str, int]] = {}

    def filter_gesture(
        self,
        hand_id: int,
        raw_result: Optional[GestureDetectionResult]
    ) -> Optional[GestureDetectionResult]:
        """
        Applies cooldown rules, minimum confidence scores, and consecutive frame
        debouncing to filter out false positive predictions.
        """
        if raw_result is None:
            # Clear static debounce if no gesture is detected
            if hand_id in self.static_debounce:
                del self.static_debounce[hand_id]
            return None

        current_time = time.time()
        
        # 1. Minimum Confidence Filter check
        if raw_result.confidence < self.config.min_gesture_confidence:
            return None

        # Determine if static or dynamic based on duration
        is_dynamic = raw_result.duration > 0.0
        
        # 2. Cooldown lock for dynamic gestures
        if is_dynamic:
            last_trigger = self.cooldowns.get(hand_id, 0.0)
            if current_time - last_trigger < self.config.cooldown_seconds:
                # Dynamic lock is active: ignore event
                return None
                
            # Update cooldown lock
            self.cooldowns[hand_id] = current_time
            return raw_result

        # 3. Debouncing lock for static gestures (require 3 consecutive matching frames)
        else:
            last_gesture, count = self.static_debounce.get(hand_id, ("", 0))
            if last_gesture == raw_result.gesture_name:
                count += 1
            else:
                last_gesture = raw_result.gesture_name
                count = 1
                
            self.static_debounce[hand_id] = (last_gesture, count)
            
            # Require at least 3 matching frames to validate the pose
            if count >= 3:
                return raw_result
                
            return None

    def clear(self, hand_id: int) -> None:
        if hand_id in self.cooldowns:
            del self.cooldowns[hand_id]
        if hand_id in self.static_debounce:
            del self.static_debounce[hand_id]
            
    def prune_stale_records(self, active_hand_ids: List[int]) -> None:
        stale_ids = [hid for hid in list(self.cooldowns.keys()) if hid not in active_hand_ids]
        for hid in stale_ids:
            self.clear(hid)
