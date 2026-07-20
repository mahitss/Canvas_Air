import numpy as np
from typing import List
from app.domain.landmarks import HandLandmarks

class HandTrackingService:
    def __init__(self, confidence_threshold: float = 0.70):
        self.confidence_threshold = confidence_threshold

    def extract_landmarks(self, frame: np.ndarray) -> List[HandLandmarks]:
        """
        Takes raw BGR numpy array and extracts MediaPipe hand landmark arrays.
        """
        return []
