import cv2
import numpy as np
from typing import List, Dict, Any, Optional
import mediapipe as mp
from app.services.hand_tracking.models import Point3D
from app.services.hand_tracking.config import HandTrackerConfig

class HandDetector:
    def __init__(self, config: HandTrackerConfig):
        self.config = config
        
        # Load MediaPipe Hands components
        self.mp_hands = mp.solutions.hands
        self.hands_instance = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=self.config.max_num_hands,
            min_detection_confidence=self.config.min_detection_confidence,
            min_tracking_confidence=self.config.min_tracking_confidence
        )

    def detect_landmarks(self, frame_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """
        Ingests a BGR numpy frame (standard OpenCV camera output), converts it to RGB,
        and runs MediaPipe Hands inference. Returns list of detected hands with landmarks.
        """
        if frame_bgr is None or frame_bgr.size == 0:
            return []

        # Convert the BGR image to RGB before processing.
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self.hands_instance.process(frame_rgb)
        
        detections: List[Dict[str, Any]] = []
        
        if not results.multi_hand_landmarks or not results.multi_handedness:
            return []

        # Map results to unified detection envelopes
        for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
            # Parse handedness classification
            handedness = results.multi_handedness[idx]
            classification = handedness.classification[0]
            label = classification.label # "Left" or "Right"
            score = classification.score # Confidence score
            
            landmarks_list: List[Point3D] = []
            visibility_list: List[float] = []
            confidence_list: List[float] = []
            
            for lm in hand_landmarks.landmark:
                # MediaPipe outputs coordinates normalized inside [0, 1] bounds
                landmarks_list.append(Point3D(x=lm.x, y=lm.y, z=lm.z))
                visibility_list.append(lm.visibility if hasattr(lm, "visibility") else 1.0)
                # MediaPipe does not provide individual point confidence values;
                # default to hand classification confidence score
                confidence_list.append(score)
                
            detections.append({
                "label": label,
                "score": score,
                "landmarks": landmarks_list,
                "visibility": visibility_list,
                "confidence": confidence_list
            })
            
        return detections

    def close(self) -> None:
        """
        Properly releases model parameters and cleanup allocated memory.
        """
        try:
            self.hands_instance.close()
        except Exception:
            pass
