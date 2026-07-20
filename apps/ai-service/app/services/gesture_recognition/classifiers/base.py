from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.services.gesture_recognition.models import GestureDetectionResult
from app.services.gesture_recognition.config import GestureTrackerConfig

class BaseGestureClassifier(ABC):
    def __init__(self, config: GestureTrackerConfig):
        self.config = config

    @abstractmethod
    def classify(self, sequence: List[Dict[str, Any]], hand_id: int) -> Optional[GestureDetectionResult]:
        """
        Ingests the sliding temporal frame features history list and runs classification rules.
        """
        pass
