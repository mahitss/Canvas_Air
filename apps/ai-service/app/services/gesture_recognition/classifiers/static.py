import time
from typing import List, Dict, Any, Optional
from app.services.gesture_recognition.classifiers.base import BaseGestureClassifier
from app.services.gesture_recognition.models import GestureDetectionResult

class StaticGestureClassifier(BaseGestureClassifier):
    def classify(self, sequence: List[Dict[str, Any]], hand_id: int) -> Optional[GestureDetectionResult]:
        if not sequence:
            return None

        # Analyze current/latest frame from history buffer
        frame = sequence[-1]
        
        # Ingest pre-extracted finger angles from features extractor
        angles = frame.get("angles", {})
        distances = frame.get("tip_distances", {})
        
        if not angles or not distances:
            return None

        thumb_angles: List[float] = angles.get("thumb", [])
        index_angles: List[float] = angles.get("index", [])
        middle_angles: List[float] = angles.get("middle", [])
        ring_angles: List[float] = angles.get("ring", [])
        pinky_angles: List[float] = angles.get("pinky", [])
        
        # Fail-safe verify
        if not (thumb_angles and index_angles and middle_angles and ring_angles and pinky_angles):
            return None

        # Check finger straightness: straight joint yields high angles (e.g. >150deg)
        # Folded finger MCP/PIP joints angle falls below ~90deg.
        is_thumb_open = thumb_angles[0] > 140
        is_index_open = index_angles[0] > 140 and index_angles[1] > 140
        is_middle_open = middle_angles[0] > 140 and middle_angles[1] > 140
        is_ring_open = ring_angles[0] > 140 and ring_angles[1] > 140
        is_pinky_open = pinky_angles[0] > 140 and pinky_angles[1] > 140
        
        # 1. Closed Fist: all fingers folded
        if not (is_thumb_open or is_index_open or is_middle_open or is_ring_open or is_pinky_open):
            return self._build_result("Closed Fist", 0.95, hand_id)
            
        # 2. Open Palm: all fingers straight
        if is_thumb_open and is_index_open and is_middle_open and is_ring_open and is_pinky_open:
            return self._build_result("Open Palm", 0.98, hand_id)

        # 3. Pointing: only index is open
        if is_index_open and not (is_middle_open or is_ring_open or is_pinky_open):
            return self._build_result("Pointing", 0.96, hand_id)

        # 4. Finger Gun: index and thumb open, others closed
        if is_thumb_open and is_index_open and not (is_middle_open or is_ring_open or is_pinky_open):
            return self._build_result("Finger Gun", 0.92, hand_id)

        # 5. Peace Sign / Victory: index and middle open, others closed
        if is_index_open and is_middle_open and not (is_ring_open or is_pinky_open):
            # Check spacing to distinguish from closed fingers
            if distances.get("index_middle", 1.0) > 0.05:
                return self._build_result("Peace Sign", 0.94, hand_id)

        # 6. OK Sign: index and thumb forming circle (tip distance very small), others extended
        if distances.get("thumb_index", 1.0) < 0.03 and is_middle_open and is_ring_open and is_pinky_open:
            return self._build_result("OK Sign", 0.90, hand_id)

        # 7. Rock: index, pinky, and thumb open, middle and ring closed
        if is_index_open and is_pinky_open and not (is_middle_open or is_ring_open):
            return self._build_result("Rock", 0.91, hand_id)

        # 8. Call Me: thumb and pinky open, index, middle, ring closed
        if is_thumb_open and is_pinky_open and not (is_index_open or is_middle_open or is_ring_open):
            return self._build_result("Call Me", 0.88, hand_id)

        # 9. Three Fingers: index, middle, ring open
        if is_index_open and is_middle_open and is_ring_open and not (is_thumb_open or is_pinky_open):
            return self._build_result("Three Fingers", 0.85, hand_id)

        # Default fallback: check if pinch is active (checked at raw tracker pipeline level usually)
        if distances.get("thumb_index", 1.0) < 0.025:
            return self._build_result("Pinch", 0.95, hand_id)

        return None

    def _build_result(self, name: str, confidence: float, hand_id: int) -> GestureDetectionResult:
        return GestureDetectionResult(
            gesture_name=name,
            confidence=confidence,
            duration=0.0, # Static has no trajectory duration
            hand_id=hand_id,
            timestamp=time.time(),
            tracking_quality=1.0
        )
