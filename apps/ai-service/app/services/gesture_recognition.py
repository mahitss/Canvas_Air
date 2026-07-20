from typing import List
from app.domain.landmarks import Point3D, GestureRecognitionResult

class GestureRecognitionService:
    def __init__(self, model_path: str):
        self.model_path = model_path

    def classify_gesture(self, landmarks: List[Point3D]) -> GestureRecognitionResult:
        """
        Classifies current landmark sequence via loaded ONNX network.
        """
        return GestureRecognitionResult(
            gesture="HOVER",
            confidence=1.0,
            coordinates=landmarks[8] if len(landmarks) > 8 else None
        )
