import math
from typing import List, Tuple
from app.services.hand_tracking.models import Point3D
from app.services.hand_tracking.config import HandTrackerConfig

class CoordinateProjector:
    def __init__(self, config: HandTrackerConfig):
        self.config = config
        
        # Camera Intrinsic properties (Standard webcam mock specs: focal length in pixels)
        self.focal_length_x = 800.0
        self.focal_length_y = 800.0
        
        # Standard average distance between Wrist (0) and Middle MCP (9) is ~8.5cm (85mm)
        self.reference_hand_size_mm = 85.0

    def project_to_screen(self, x_norm: float, y_norm: float) -> tuple[float, float]:
        """
        Maps normalized coordinates to screen pixel values. Supports mirror mode.
        """
        x_mapped = 1.0 - x_norm if self.config.mirror_mode else x_norm
        
        screen_x = x_mapped * self.config.screen_width
        screen_y = y_norm * self.config.screen_height
        
        return screen_x, screen_y

    def estimate_camera_depth_z(self, landmarks_norm: List[Point3D]) -> float:
        """
        Estimates hand distance (Z depth in mm) from camera based on the pixel distance
        between the Wrist (0) and Middle-MCP (9) joint landmarks.
        """
        if len(landmarks_norm) < 10:
            return 1000.0 # Default fallback: 1 meter

        p0 = landmarks_norm[0]
        p9 = landmarks_norm[9]
        
        # Distance in normalized 2D camera space
        dx = p0.x - p9.x
        dy = p0.y - p9.y
        dz = p0.z - p9.z
        norm_distance = math.sqrt(dx*dx + dy*dy + dz*dz)
        
        if norm_distance <= 0.001:
            return 1000.0
            
        # Z-depth calculation: Z = (FocalLength * RealSize) / ProjectedSize
        estimated_z = (self.focal_length_x * self.reference_hand_size_mm) / (norm_distance * 1000.0)
        
        # Limit boundary bounds (e.g. 10cm to 3meters)
        return max(100.0, min(3000.0, estimated_z))

    def project_to_world_3d(self, x_norm: float, y_norm: float, depth_z_mm: float) -> tuple[float, float, float]:
        """
        Computes 3D coordinates relative to camera principal point using intrinsic focal lengths.
        """
        x_mapped = 1.0 - x_norm if self.config.mirror_mode else x_norm
        
        # Center coordinates relative to image center (0.5)
        x_world = ((x_mapped - 0.5) * depth_z_mm) / self.focal_length_x
        y_world = ((y_norm - 0.5) * depth_z_mm) / self.focal_length_y
        
        return x_world, y_world, depth_z_mm
