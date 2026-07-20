import time
import math
from typing import List, Dict, Any, Optional
from app.services.gesture_recognition.classifiers.base import BaseGestureClassifier
from app.services.gesture_recognition.models import GestureDetectionResult

class MultiHandGestureClassifier:
    def __init__(self, config: Any):
        self.config = config

    def classify_multi_hand(
        self,
        hand_left_seq: List[Dict[str, Any]],
        hand_right_seq: List[Dict[str, Any]]
    ) -> Optional[GestureDetectionResult]:
        """
        Ingests tracking buffers for left and right hands to check spatial interactions.
        """
        if len(hand_left_seq) < 5 or len(hand_right_seq) < 5:
            return None

        # 1. Ingest coordinates of index tip landmarks
        left_tip = hand_left_seq[-1].get("index_tip")
        right_tip = hand_right_seq[-1].get("index_tip")
        
        left_start_tip = hand_left_seq[0].get("index_tip")
        right_start_tip = hand_right_seq[0].get("index_tip")
        
        if not (left_tip and right_tip and left_start_tip and right_start_tip):
            return None

        # Calculate distances at start and end of window
        def dist(p1: Any, p2: Any) -> float:
            return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

        start_dist = dist(left_start_tip, right_start_tip)
        end_dist = dist(left_tip, right_tip)
        
        delta_dist = end_dist - start_dist
        duration = hand_left_seq[-1]["timestamp"] - hand_left_seq[0]["timestamp"]

        # 1. Expand / Zoom Out
        if delta_dist > 0.08:
            return self._build_result("Two Hand Expand", 0.92, duration)

        # 2. Compress / Zoom In
        if delta_dist < -0.08:
            return self._build_result("Two Hand Compress", 0.92, duration)

        # 3. Two Hand Pinch
        left_pinched = hand_left_seq[-1].get("is_pinching", False)
        right_pinched = hand_right_seq[-1].get("is_pinching", False)
        if left_pinched and right_pinched:
            return self._build_result("Two Hand Pinch", 0.95, duration)

        # 4. Hand Clapping
        # Wrist centroids are index 0. Compare velocity vector alignments.
        left_wrist = hand_left_seq[-1].get("wrist")
        right_wrist = hand_right_seq[-1].get("wrist")
        if left_wrist and right_wrist:
            current_spacing = dist(left_wrist, right_wrist)
            if current_spacing < 0.05: # wrist centroids very close
                # Verify they moved towards each other (clapped)
                left_start_wrist = hand_left_seq[0].get("wrist")
                right_start_wrist = hand_right_seq[0].get("wrist")
                if left_start_wrist and right_start_wrist:
                    start_spacing = dist(left_start_wrist, right_start_wrist)
                    if start_spacing > current_spacing + 0.06:
                        return self._build_result("Hand Clapping", 0.89, duration)

        return None

    def _build_result(self, name: str, confidence: float, duration: float) -> GestureDetectionResult:
        return GestureDetectionResult(
            gesture_name=name,
            confidence=confidence,
            duration=duration,
            hand_id=999, # Scoped identifier indicating multi-hand interaction
            timestamp=time.time(),
            tracking_quality=1.0
        )
