import time
from typing import List, Dict, Any, Optional
from app.services.gesture_recognition.config import GestureTrackerConfig

class TemporalBuffer:
    def __init__(self, config: GestureTrackerConfig):
        self.config = config
        
        # History format: { hand_id: [ List[Dict[str, Any]] (features frame dictionary) ] }
        self.buffers: Dict[int, List[Dict[str, Any]]] = {}

    def push(self, hand_id: int, features: Dict[str, Any]) -> None:
        """
        Pushes a new feature set snapshot into the hand buffer, keeping it within
        the max history window length bounds.
        """
        hand_buf = self.buffers.setdefault(hand_id, [])
        
        # Attach current timestamp
        features_snapshot = features.copy()
        features_snapshot["timestamp"] = time.time()
        
        hand_buf.append(features_snapshot)
        
        # Maintain window bounds limit
        if len(hand_buf) > self.config.history_window_length:
            hand_buf.pop(0)

    def get_sequence(self, hand_id: int) -> List[Dict[str, Any]]:
        """
        Returns the historical sequence buffer for the specified hand.
        """
        return self.buffers.get(hand_id, [])

    def get_trajectory(self, hand_id: int, feature_key: str = "index_tip") -> List[Any]:
        """
        Extracts coordinate lists for a specific landmark trajectory (e.g. index_tip).
        """
        sequence = self.get_sequence(hand_id)
        trajectory = []
        for frame in sequence:
            if feature_key in frame:
                trajectory.append(frame[feature_key])
        return trajectory

    def clear(self, hand_id: int) -> None:
        if hand_id in self.buffers:
            del self.buffers[hand_id]
            
    def prune_stale_buffers(self, active_hand_ids: List[int]) -> None:
        """
        Removes historical buffers for hands that are no longer active.
        """
        stale_ids = [hid for hid in self.buffers if hid not in active_hand_ids]
        for hid in stale_ids:
            self.clear(hid)
            
    def get_duration(self, hand_id: int) -> float:
        """
        Returns elapsed duration of active tracking window in seconds.
        """
        buf = self.get_sequence(hand_id)
        if len(buf) < 2:
            return 0.0
        return buf[-1]["timestamp"] - buf[0]["timestamp"]
