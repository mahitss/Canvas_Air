import time
import math
from typing import List, Dict, Any, Optional
from app.services.gesture_recognition.classifiers.base import BaseGestureClassifier
from app.services.gesture_recognition.models import GestureDetectionResult

class DynamicGestureClassifier(BaseGestureClassifier):
    def classify(self, sequence: List[Dict[str, Any]], hand_id: int) -> Optional[GestureDetectionResult]:
        if len(sequence) < 8:
            return None

        # 1. Extract dynamic trajectory points of the Index fingertip
        trajectory = [frame.get("index_tip") for frame in sequence if frame.get("index_tip") is not None]
        if len(trajectory) < 8:
            return None

        # Get initial, final and midpoint elements
        start_pt = trajectory[0]
        end_pt = trajectory[-1]
        
        # Calculate elapsed duration
        duration = sequence[-1]["timestamp"] - sequence[0]["timestamp"]
        
        # Calculate displacement vectors
        dx = end_pt.x - start_pt.x
        dy = end_pt.y - start_pt.y
        dz = end_pt.z - start_pt.z
        
        # Total trajectory path length (to verify active movement vs static float)
        path_length = 0.0
        for i in range(1, len(trajectory)):
            p1, p2 = trajectory[i-1], trajectory[i]
            path_length += math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2 + (p2.z - p1.z)**2)

        # Minimum required displacement to ignore fine tracking jitter
        motion_threshold = 0.08 # relative unit coords
        
        # 1. Swipe Gestures
        if path_length > motion_threshold and path_length < abs(dx) * 1.5:
            # Linear movement check
            abs_dx, abs_dy = abs(dx), abs(dy)
            
            if abs_dx > abs_dy and abs_dx > motion_threshold:
                # Horizontal Swipe
                if dx > 0:
                    return self._build_result("Swipe Right", 0.90, duration, hand_id)
                else:
                    return self._build_result("Swipe Left", 0.90, duration, hand_id)
            elif abs_dy > abs_dx and abs_dy > motion_threshold:
                # Vertical Swipe
                if dy > 0:
                    # In standard image coordinates, Y-increases downwards
                    return self._build_result("Swipe Down", 0.88, duration, hand_id)
                else:
                    return self._build_result("Swipe Up", 0.88, duration, hand_id)

        # 2. Push / Pull (Z depth shift)
        if abs(dz) > motion_threshold and abs(dz) > max(abs(dx), abs(dy)):
            if dz < -motion_threshold * 0.5:
                return self._build_result("Push", 0.85, duration, hand_id)
            elif dz > motion_threshold * 0.5:
                return self._build_result("Pull", 0.85, duration, hand_id)

        # 3. Wave Gesture Detection
        # Check sign transitions in horizontal velocity of index tip
        velocities = [trajectory[i].x - trajectory[i-1].x for i in range(1, len(trajectory))]
        sign_changes = 0
        for i in range(1, len(velocities)):
            if (velocities[i] >= 0 > velocities[i-1]) or (velocities[i] <= 0 < velocities[i-1]):
                sign_changes += 1
                
        # A quick hand waving yields multiple horizontal coordinate switches
        if sign_changes >= 3 and path_length > motion_threshold:
            return self._build_result("Wave", 0.87, duration, hand_id)

        # 4. Circle Gesture Detection
        # Checks if coordinate offsets form a box envelope closing around start coordinates
        # and has sign changes on both X and Y.
        if len(trajectory) >= 15:
            mid_pt = trajectory[len(trajectory) // 2]
            # Verify that middle point is far from start/end, and start/end are close
            start_end_dist = math.sqrt((end_pt.x - start_pt.x)**2 + (end_pt.y - start_pt.y)**2)
            start_mid_dist = math.sqrt((mid_pt.x - start_pt.x)**2 + (mid_pt.y - start_pt.y)**2)
            
            if start_end_dist < motion_threshold * 0.5 and start_mid_dist > motion_threshold * 0.4:
                # Verify CW vs CCW: cross product of vector start->mid and mid->end
                ux, uy = mid_pt.x - start_pt.x, mid_pt.y - start_pt.y
                vx, vy = end_pt.x - mid_pt.x, end_pt.y - mid_pt.y
                cross_product = ux * vy - uy * vx
                
                if cross_product > 0.001:
                    return self._build_result("Circle Clockwise", 0.82, duration, hand_id)
                elif cross_product < -0.001:
                    return self._build_result("Circle Counter Clockwise", 0.82, duration, hand_id)

        return None

    def _build_result(self, name: str, confidence: float, duration: float, hand_id: int) -> GestureDetectionResult:
        return GestureDetectionResult(
            gesture_name=name,
            confidence=confidence,
            duration=duration,
            hand_id=hand_id,
            timestamp=time.time(),
            tracking_quality=1.0
        )
