import uuid
import time
from typing import List, Dict, Any, Optional, Callable
from app.services.hand_tracking.models import HandDetectionFrame, Point3D
from app.services.gesture_recognition.config import GestureTrackerConfig
from app.services.gesture_recognition.models import GestureDetectionResult, GestureEvent, ShortcutAction
from app.services.gesture_recognition.features import FeatureExtractor
from app.services.gesture_recognition.buffer import TemporalBuffer
from app.services.gesture_recognition.classifiers.static import StaticGestureClassifier
from app.services.gesture_recognition.classifiers.dynamic import DynamicGestureClassifier
from app.services.gesture_recognition.classifiers.multihand import MultiHandGestureClassifier
from app.services.gesture_recognition.false_positive import FalsePositiveReducer
from app.services.gesture_recognition.custom import CustomGestureManager
from app.services.gesture_recognition.mapping import ActionMapper

class GestureRecognitionPipeline:
    def __init__(self, config: GestureTrackerConfig):
        self.config = config
        
        # Pipeline modules
        self.extractor = FeatureExtractor()
        self.buffer = TemporalBuffer(config)
        self.static_classifier = StaticGestureClassifier(config)
        self.dynamic_classifier = DynamicGestureClassifier(config)
        self.multihand_classifier = MultiHandGestureClassifier(config)
        self.false_positive = FalsePositiveReducer(config)
        self.custom_manager = CustomGestureManager()
        self.mapper = ActionMapper()
        
        # Event listeners queue
        self.event_listeners: List[Callable[[GestureEvent], None]] = []
        
        # Active gesture cache to track GESTURE_STARTED vs GESTURE_UPDATED transitions
        # Key: hand_id -> current_gesture_name
        self.active_gestures: Dict[int, str] = {}

    def register_listener(self, listener: Callable[[GestureEvent], None]) -> None:
        self.event_listeners.append(listener)

    def _publish_event(self, event: GestureEvent) -> None:
        for listener in self.event_listeners:
            try:
                listener(event)
            except Exception as e:
                print(f"[GestureEventError] Failed to execute callback listener: {e}")

    def process_hand_frame(
        self,
        hand_frame: HandDetectionFrame,
        user_id: Optional[str] = None
    ) -> Optional[GestureDetectionResult]:
        """
        Processes a single hand frame coordinate stream: extracts features, buffers history,
        classifies static/dynamic/custom shapes, filters false positives, and executes actions.
        """
        hand_id = hand_frame.hand_id
        current_time = time.time()
        
        # 1. Feature Extraction stage
        angles = self.extractor.extract_finger_angles(hand_frame.landmarks)
        tip_distances = self.extractor.extract_tip_distances(hand_frame.landmarks)
        v_vector, speed = self.extractor.extract_kinematic_features(hand_frame.landmarks)
        
        # Frame centroids and specific points references
        centroid = hand_frame.landmarks[0] # Wrist (0)
        index_tip = hand_frame.landmarks[8]
        thumb_tip = hand_frame.landmarks[4]
        
        features_frame = {
            "angles": angles,
            "tip_distances": tip_distances,
            "velocity": v_vector,
            "speed": speed,
            "wrist": centroid,
            "index_tip": index_tip,
            "thumb_tip": thumb_tip,
            "is_pinching": hand_frame.state.is_pinching
        }
        
        # 2. Sliding sequence buffer stage
        self.buffer.push(hand_id, features_frame)
        sequence = self.buffer.get_sequence(hand_id)
        
        # 3. Custom Gesture Classifier check (Nearest neighbor trajectory match)
        custom_result: Optional[Tuple[str, float]] = None
        if user_id is not None:
            trajectory_pts = self.buffer.get_trajectory(hand_id, "index_tip")
            custom_result = self.custom_manager.classify_custom(user_id, trajectory_pts)

        # 4. Gesture Classification stage
        raw_result: Optional[GestureDetectionResult] = None
        
        if custom_result is not None:
            name, confidence = custom_result
            raw_result = GestureDetectionResult(
                gesture_name=name,
                confidence=confidence,
                duration=self.buffer.get_duration(hand_id),
                hand_id=hand_id,
                timestamp=current_time,
                tracking_quality=hand_frame.confidence_score
            )
        else:
            # Check dynamic trajectory classifier first
            raw_result = self.dynamic_classifier.classify(sequence, hand_id)
            if raw_result is None:
                # Fall back to static classifier
                raw_result = self.static_classifier.classify(sequence, hand_id)

        # 5. False Positive Reduction stage
        validated_result = self.false_positive.filter_gesture(hand_id, raw_result)
        
        # 6. Action mapping & Event publishing transitions evaluation
        last_gesture = self.active_gestures.get(hand_id)
        
        if validated_result is not None:
            gesture_name = validated_result.gesture_name
            
            if last_gesture != gesture_name:
                # Trigger Action Shortcut executions
                self.mapper.execute_mapped_action(gesture_name)
                
                # Emit GESTURE_STARTED event
                self._publish_event(
                    GestureEvent(
                        event_id=str(uuid.uuid4()),
                        event_type="GESTURE_STARTED",
                        gesture_name=gesture_name,
                        hand_id=hand_id,
                        confidence=validated_result.confidence,
                        timestamp=current_time
                    )
                )
                self.active_gestures[hand_id] = gesture_name
            else:
                # Emit GESTURE_UPDATED event
                self._publish_event(
                    GestureEvent(
                        event_id=str(uuid.uuid4()),
                        event_type="GESTURE_UPDATED",
                        gesture_name=gesture_name,
                        hand_id=hand_id,
                        confidence=validated_result.confidence,
                        timestamp=current_time,
                        metadata={"duration": self.buffer.get_duration(hand_id)}
                    )
                )
        else:
            # Check if active gesture was lost or completed
            if last_gesture is not None:
                self._publish_event(
                    GestureEvent(
                        event_id=str(uuid.uuid4()),
                        event_type="GESTURE_COMPLETED",
                        gesture_name=last_gesture,
                        hand_id=hand_id,
                        confidence=1.0,
                        timestamp=current_time
                    )
                )
                del self.active_gestures[hand_id]
                
        return validated_result

    def process_multi_hand_frame(
        self,
        hand_frames: List[HandDetectionFrame]
    ) -> Optional[GestureDetectionResult]:
        """
        Evaluates dual hand coordinate interactions (Expand, Compress, Clap).
        """
        if len(hand_frames) < 2:
            # Check transitions to GESTURE_COMPLETED for multi-hand IDs
            multihand_id = 999
            if multihand_id in self.active_gestures:
                last_g = self.active_gestures[multihand_id]
                self._publish_event(
                    GestureEvent(
                        event_id=str(uuid.uuid4()),
                        event_type="GESTURE_COMPLETED",
                        gesture_name=last_g,
                        hand_id=multihand_id,
                        confidence=1.0,
                        timestamp=time.time()
                    )
                )
                del self.active_gestures[multihand_id]
            return None

        # Check multi-hand interactions
        hand0_seq = self.buffer.get_sequence(hand_frames[0].hand_id)
        hand1_seq = self.buffer.get_sequence(hand_frames[1].hand_id)
        
        raw_result = self.multihand_classifier.classify_multi_hand(hand0_seq, hand1_seq)
        
        multihand_id = 999
        validated_result = self.false_positive.filter_gesture(multihand_id, raw_result)
        
        last_gesture = self.active_gestures.get(multihand_id)
        current_time = time.time()
        
        if validated_result is not None:
            g_name = validated_result.gesture_name
            if last_gesture != g_name:
                self.mapper.execute_mapped_action(g_name)
                self._publish_event(
                    GestureEvent(
                        event_id=str(uuid.uuid4()),
                        event_type="GESTURE_STARTED",
                        gesture_name=g_name,
                        hand_id=multihand_id,
                        confidence=validated_result.confidence,
                        timestamp=current_time
                    )
                )
                self.active_gestures[multihand_id] = g_name
        else:
            if last_gesture is not None:
                self._publish_event(
                    GestureEvent(
                        event_id=str(uuid.uuid4()),
                        event_type="GESTURE_COMPLETED",
                        gesture_name=last_gesture,
                        hand_id=multihand_id,
                        confidence=1.0,
                        timestamp=current_time
                    )
                )
                del self.active_gestures[multihand_id]
                
        return validated_result

    def process_all_hands(
        self,
        hand_frames: List[HandDetectionFrame],
        user_id: Optional[str] = None
    ) -> List[GestureDetectionResult]:
        """
        Coordinates full spatial gesture processing across single and multi hand frames.
        """
        active_ids = [frame.hand_id for frame in hand_frames]
        self.buffer.prune_stale_buffers(active_ids)
        self.false_positive.prune_stale_records(active_ids + [999])
        
        detected_gestures: List[GestureDetectionResult] = []
        
        # Process individual hands
        for frame in hand_frames:
            res = self.process_hand_frame(frame, user_id)
            if res is not None:
                detected_gestures.append(res)
                
        # Process multi-hand interactions
        multi_res = self.process_multi_hand_frame(hand_frames)
        if multi_res is not None:
            detected_gestures.append(multi_res)
            
        return detected_gestures
