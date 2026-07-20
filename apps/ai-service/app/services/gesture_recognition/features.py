import math
from typing import List, Dict, Tuple
from app.services.hand_tracking.models import HandLandmarkData, Point3D

class FeatureExtractor:
    @staticmethod
    def calculate_joint_angle(a: Point3D, b: Point3D, c: Point3D) -> float:
        """
        Calculates angle at vertex B in degrees between vectors BA and BC.
        """
        v1_x, v1_y, v1_z = a.x - b.x, a.y - b.y, a.z - b.z
        v2_x, v2_y, v2_z = c.x - b.x, c.y - b.y, c.z - b.z
        
        dot_product = v1_x * v2_x + v1_y * v2_y + v1_z * v2_z
        len_v1 = math.sqrt(v1_x*v1_x + v1_y*v1_y + v1_z*v1_z)
        len_v2 = math.sqrt(v2_x*v2_x + v2_y*v2_y + v2_z*v2_z)
        
        if len_v1 <= 0.0001 or len_v2 <= 0.0001:
            return 0.0
            
        cos_val = dot_product / (len_v1 * len_v2)
        # Handle floating precision edge bounds
        cos_val = max(-1.0, min(1.0, cos_val))
        
        return math.degrees(math.acos(cos_val))

    def extract_finger_angles(self, landmarks: List[HandLandmarkData]) -> Dict[str, List[float]]:
        """
        Computes joint angles for MCP, PIP, DIP joints of all 5 fingers.
        Fingers landmarks configuration indices:
          - Thumb: 1 -> 2 -> 3 -> 4
          - Index: 5 -> 6 -> 7 -> 8
          - Middle: 9 -> 10 -> 11 -> 12
          - Ring: 13 -> 14 -> 15 -> 16
          - Pinky: 17 -> 18 -> 19 -> 20
        """
        angles: Dict[str, List[float]] = {
            "thumb": [],
            "index": [],
            "middle": [],
            "ring": [],
            "pinky": []
        }
        
        if len(landmarks) < 21:
            return angles
            
        def get_pt(idx: int) -> Point3D:
            return Point3D(x=landmarks[idx].x, y=landmarks[idx].y, z=landmarks[idx].z)

        # Thumb
        angles["thumb"].append(self.calculate_joint_angle(get_pt(1), get_pt(2), get_pt(3)))
        angles["thumb"].append(self.calculate_joint_angle(get_pt(2), get_pt(3), get_pt(4)))

        # Index
        angles["index"].append(self.calculate_joint_angle(get_pt(5), get_pt(6), get_pt(7)))
        angles["index"].append(self.calculate_joint_angle(get_pt(6), get_pt(7), get_pt(8)))

        # Middle
        angles["middle"].append(self.calculate_joint_angle(get_pt(9), get_pt(10), get_pt(11)))
        angles["middle"].append(self.calculate_joint_angle(get_pt(10), get_pt(11), get_pt(12)))

        # Ring
        angles["ring"].append(self.calculate_joint_angle(get_pt(13), get_pt(14), get_pt(15)))
        angles["ring"].append(self.calculate_joint_angle(get_pt(14), get_pt(15), get_pt(16)))

        # Pinky
        angles["pinky"].append(self.calculate_joint_angle(get_pt(17), get_pt(18), get_pt(19)))
        angles["pinky"].append(self.calculate_joint_angle(get_pt(18), get_pt(19), get_pt(20)))

        return angles

    @staticmethod
    def calculate_euclidean_distance(a: Point3D, b: Point3D) -> float:
        dx = a.x - b.x
        dy = a.y - b.y
        dz = a.z - b.z
        return math.sqrt(dx*dx + dy*dy + dz*dz)

    def extract_tip_distances(self, landmarks: List[HandLandmarkData]) -> Dict[str, float]:
        """
        Computes distances between adjacent fingertips (e.g. index-to-thumb, index-to-middle).
        Fingertips are at indexes: Thumb (4), Index (8), Middle (12), Ring (16), Pinky (20).
        """
        distances: Dict[str, float] = {
            "thumb_index": 0.0,
            "index_middle": 0.0,
            "middle_ring": 0.0,
            "ring_pinky": 0.0
        }
        
        if len(landmarks) < 21:
            return distances

        def get_pt(idx: int) -> Point3D:
            return Point3D(x=landmarks[idx].x, y=landmarks[idx].y, z=landmarks[idx].z)

        distances["thumb_index"] = self.calculate_euclidean_distance(get_pt(4), get_pt(8))
        distances["index_middle"] = self.calculate_euclidean_distance(get_pt(8), get_pt(12))
        distances["middle_ring"] = self.calculate_euclidean_distance(get_pt(12), get_pt(16))
        distances["ring_pinky"] = self.calculate_euclidean_distance(get_pt(16), get_pt(20))

        return distances

    def extract_kinematic_features(self, landmarks: List[HandLandmarkData]) -> Tuple[Tuple[float, float, float], float]:
        """
        Extracts index fingertip velocity vector and speed.
        """
        if len(landmarks) < 21:
            return (0.0, 0.0, 0.0), 0.0
            
        index_tip = landmarks[8]
        v_vector = (index_tip.velocity_x, index_tip.velocity_y, index_tip.velocity_z)
        speed = math.sqrt(v_vector[0]**2 + v_vector[1]**2 + v_vector[2]**2)
        
        return v_vector, speed
