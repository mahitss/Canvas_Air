import time
from typing import List, Dict, Optional
from app.services.hand_tracking.models import HandLandmarkData, Point3D
from app.services.hand_tracking.config import HandTrackerConfig

class LandmarkValidator:
    def __init__(self, config: HandTrackerConfig, max_history_len: int = 30):
        self.config = config
        self.max_history_len = max_history_len
        
        # History map format: { hand_id: [ List[HandLandmarkData] (snapshot of 21 points) ] }
        self.history: Dict[int, List[List[HandLandmarkData]]] = {}
        # Timestamps map format: { hand_id: [ List[float] ] }
        self.timestamps: Dict[int, List[float]] = {}

    def clear_history_for_hand(self, hand_id: int) -> None:
        if hand_id in self.history:
            del self.history[hand_id]
        if hand_id in self.timestamps:
            del self.timestamps[hand_id]

    def validate_and_compute_kinematics(
        self,
        hand_id: int,
        raw_landmarks: List[Point3D],
        visibility_scores: List[float],
        confidence_scores: List[float]
    ) -> List[HandLandmarkData]:
        """
        Validates landmark points, keeps history trackers, and updates kinematics
        (velocities & accelerations) based on elapsed timestamps.
        """
        current_time = time.time()
        validated_landmarks: List[HandLandmarkData] = []
        
        # Check if we have history for this hand
        hand_history = self.history.get(hand_id, [])
        hand_timestamps = self.timestamps.get(hand_id, [])
        
        has_history = len(hand_history) > 0
        last_frame: Optional[List[HandLandmarkData]] = hand_history[-1] if has_history else None
        prev_frame: Optional[List[HandLandmarkData]] = hand_history[-2] if len(hand_history) > 1 else None
        
        dt = current_time - hand_timestamps[-1] if len(hand_timestamps) > 0 else 0.0
        prev_dt = hand_timestamps[-1] - hand_timestamps[-2] if len(hand_timestamps) > 1 else 0.0

        for i in range(21):
            raw_pt = raw_landmarks[i] if i < len(raw_landmarks) else Point3D(x=0.0, y=0.0, z=0.0)
            vis = visibility_scores[i] if i < len(visibility_scores) else 1.0
            conf = confidence_scores[i] if i < len(confidence_scores) else 1.0
            
            # 1. Validation filter: enforce min tracking limits
            is_valid = conf >= self.config.min_tracking_confidence and vis >= 0.5
            
            x = raw_pt.x
            y = raw_pt.y
            z = raw_pt.z
            
            # Kinematics variables initialization
            vx, vy, vz = 0.0, 0.0, 0.0
            ax, ay, az = 0.0, 0.0, 0.0
            
            if not is_valid and last_frame is not None:
                # Occlusion handling: carry over last known point if current is invalid
                last_pt = last_frame[i]
                x, y, z = last_pt.x, last_pt.y, last_pt.z
                conf = last_pt.confidence * 0.8 # Decay confidence score slightly
            
            # 2. Kinematics calculations:
            if last_frame is not None and dt > 0.001:
                last_pt = last_frame[i]
                vx = (x - last_pt.x) / dt
                vy = (y - last_pt.y) / dt
                vz = (z - last_pt.z) / dt
                
                if prev_frame is not None and prev_dt > 0.001:
                    last_vx = (last_pt.x - prev_frame[i].x) / prev_dt
                    last_vy = (last_pt.y - prev_frame[i].y) / prev_dt
                    last_vz = (last_pt.z - prev_frame[i].z) / prev_dt
                    
                    ax = (vx - last_vx) / dt
                    ay = (vy - last_vy) / dt
                    az = (vz - last_vz) / dt
            
            validated_landmarks.append(
                HandLandmarkData(
                    x=x,
                    y=y,
                    z=z,
                    visibility=vis,
                    confidence=conf,
                    velocity_x=vx,
                    velocity_y=vy,
                    velocity_z=vz,
                    acceleration_x=ax,
                    acceleration_y=ay,
                    acceleration_z=az,
                    timestamp=current_time
                )
            )
            
        # Update history queues
        hand_history.append(validated_landmarks)
        hand_timestamps.append(current_time)
        
        if len(hand_history) > self.max_history_len:
            hand_history.pop(0)
            hand_timestamps.pop(0)
            
        self.history[hand_id] = hand_history
        self.timestamps[hand_id] = hand_timestamps
        
        return validated_landmarks
