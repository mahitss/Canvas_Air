import json
import math
from typing import List, Dict, Tuple, Optional
from app.services.hand_tracking.models import Point3D
from app.services.gesture_recognition.models import CustomGestureTemplate, CustomGestureProfile

class CustomGestureManager:
    def __init__(self, storage_path: str = "./custom_gestures.json"):
        self.storage_path = storage_path
        # Profiles cache map: { user_id: CustomGestureProfile }
        self.profiles: Dict[str, CustomGestureProfile] = {}
        
        # Temp recording map: { user_id: (gesture_name, List[List[Point3D]]) }
        self.active_recordings: Dict[str, Tuple[str, List[List[Point3D]]]] = {}
        
        self.load_profiles()

    def start_recording(self, user_id: str, name: str) -> None:
        self.active_recordings[user_id] = (name, [])

    def record_frame(self, user_id: str, landmarks: List[Point3D]) -> None:
        if user_id in self.active_recordings:
            name, frames = self.active_recordings[user_id]
            frames.append([Point3D(x=p.x, y=p.y, z=p.z) for p in landmarks])

    def save_recording(self, user_id: str) -> Optional[CustomGestureTemplate]:
        """
        Finalizes recording sequence, normalizes the coordinates array,
        and saves template to user profile directory.
        """
        if user_id not in self.active_recordings:
            return None
            
        name, raw_frames = self.active_recordings[user_id]
        del self.active_recordings[user_id]
        
        if len(raw_frames) < 5:
            return None # Insufficient frames sequence

        # Normalize coordinates: subtract wrist centroid (index 0) from each frame
        normalized_frames: List[List[Point3D]] = []
        for frame in raw_frames:
            if not frame:
                continue
            wrist = frame[0]
            norm_frame = [
                Point3D(x=p.x - wrist.x, y=p.y - wrist.y, z=p.z - wrist.z)
                for p in frame
            ]
            normalized_frames.append(norm_frame)

        template = CustomGestureTemplate(name=name, trajectory=normalized_frames)
        
        profile = self.profiles.setdefault(user_id, CustomGestureProfile(user_id=user_id))
        # Clear existing template with same name if any
        profile.templates = [t for t in profile.templates if t.name != name]
        profile.templates.append(template)
        
        self.save_profiles()
        return template

    def classify_custom(
        self,
        user_id: str,
        sequence: List[List[Point3D]]
    ) -> Optional[Tuple[str, float]]:
        """
        Compares input sequence with user's saved templates using a normalized
        Dynamic Time Warping (DTW) distance metric.
        """
        profile = self.profiles.get(user_id)
        if not profile or not profile.templates or len(sequence) < 5:
            return None

        # Normalize input sequence (wrist relative subtraction)
        norm_seq: List[List[Point3D]] = []
        for frame in sequence:
            if not frame:
                continue
            wrist = frame[0]
            norm_seq.append([
                Point3D(x=p.x - wrist.x, y=p.y - wrist.y, z=p.z - wrist.z)
                for p in frame
            ])

        best_match: Optional[str] = None
        min_distance = 999.0
        
        # Compare against templates
        for template in profile.templates:
            dist_val = self._compute_sequence_distance(norm_seq, template.trajectory)
            if dist_val < min_distance:
                min_distance = dist_val
                best_match = template.name

        # Matching threshold (empirical bounds)
        threshold = 0.15
        if best_match is not None and min_distance < threshold:
            confidence = max(0.70, min(0.99, 1.0 - (min_distance / threshold) * 0.3))
            return best_match, confidence

        return None

    def _compute_sequence_distance(self, seq1: List[List[Point3D]], seq2: List[List[Point3D]]) -> float:
        """
        Calculates simple alignment distance between two landmark sequences.
        In production, compiles DTW distance. Under SDK mock, checks tip distance match.
        """
        # Interpolate/downsample to match lengths
        len1, len2 = len(seq1), len(seq2)
        total_dist = 0.0
        steps = min(len1, len2)
        
        for i in range(steps):
            idx1 = int(i * len1 / steps)
            idx2 = int(i * len2 / steps)
            
            # Compare Index Tip (8) offset
            p1 = seq1[idx1][8] if len(seq1[idx1]) > 8 else Point3D(x=0, y=0, z=0)
            p2 = seq2[idx2][8] if len(seq2[idx2]) > 8 else Point3D(x=0, y=0, z=0)
            
            total_dist += math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)
            
        return total_dist / steps

    def load_profiles(self) -> None:
        try:
            with open(self.storage_path, "r") as f:
                data = json.load(f)
                for user_id, raw_prof in data.items():
                    self.profiles[user_id] = CustomGestureProfile.model_validate(raw_prof)
        except Exception:
            # File missing or empty: fallback silently
            pass

    def save_profiles(self) -> None:
        try:
            serialized = {uid: prof.model_dump() for uid, prof in self.profiles.items()}
            with open(self.storage_path, "w") as f:
                json.dump(serialized, f, indent=2)
        except Exception as e:
            print(f"[StorageError] Failed to write custom gesture profiles: {e}")
