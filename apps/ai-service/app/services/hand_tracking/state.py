import math
from typing import List
from app.services.hand_tracking.models import HandState, Point3D, HandLandmarkData
from app.services.hand_tracking.config import HandTrackerConfig

class HandStateClassifier:
    def __init__(self, config: HandTrackerConfig):
        self.config = config

    def _get_distance_mm(self, p1: HandLandmarkData, p2: HandLandmarkData) -> float:
        dx = p1.x - p2.x
        dy = p1.y - p2.y
        dz = p1.z - p2.z
        # Scale to millimeters assuming 0.0-1.0 coords inside 1-meter range (approx conversion)
        return math.sqrt(dx*dx + dy*dy + dz*dz) * 1000.0

    def classify_hand_state(
        self,
        landmarks: List[HandLandmarkData],
        estimated_z_mm: float
    ) -> HandState:
        """
        Classifies current finger angles and proximity markers to output
        Open/Fist/Pointing/Pinching state attributes.
        """
        if len(landmarks) < 21:
            # Fallback mock empty state
            return HandState(
                is_open=True, is_fist=False, is_pointing=False, is_pinching=False,
                pinch_distance_mm=999.0, palm_direction=Point3D(x=0.0, y=0.0, z=-1.0),
                wrist_orientation_deg=0.0
            )

        # 1. Finger Extension Check (MCP -> PIP -> DIP -> TIP)
        # We check ifTIP coordinate y-level is above MCP joint coordinate (for normal orientation)
        # or distance from Wrist (0).
        def is_finger_extended(mcp_idx: int, tip_idx: int) -> bool:
            # Vector Wrist to MCP vs MCP to TIP
            wrist = landmarks[0]
            mcp = landmarks[mcp_idx]
            tip = landmarks[tip_idx]
            
            dist_wrist_mcp = self._get_distance_mm(wrist, mcp)
            dist_wrist_tip = self._get_distance_mm(wrist, tip)
            
            return dist_wrist_tip > dist_wrist_mcp * 1.25

        # Check fingers extension (Index: 5-8, Middle: 9-12, Ring: 13-16, Pinky: 17-20)
        index_extended = is_finger_extended(5, 8)
        middle_extended = is_finger_extended(9, 12)
        ring_extended = is_finger_extended(13, 16)
        pinky_extended = is_finger_extended(17, 20)
        
        # Thumb state is specific (check index-MCP to thumb-TIP distance relative to thumb-MCP)
        thumb_tip = landmarks[4]
        index_mcp = landmarks[5]
        thumb_mcp = landmarks[2]
        thumb_extended = self._get_distance_mm(thumb_tip, index_mcp) > self._get_distance_mm(thumb_mcp, index_mcp) * 1.1

        # 2. Gesture Postures Classifications
        is_open = thumb_extended and index_extended and middle_extended and ring_extended and pinky_extended
        is_fist = not (thumb_extended or index_extended or middle_extended or ring_extended or pinky_extended)
        is_pointing = index_extended and not (middle_extended or ring_extended or pinky_extended)
        
        # 3. Pinch Detection
        index_tip = landmarks[8]
        thumb_tip = landmarks[4]
        
        # Use estimated Z-depth to convert coordinate normalized distance to millimeters
        # Standard camera frame normalized space covers ~60cm width at 1m distance (fov dependent)
        fov_multiplier = (estimated_z_mm / 800.0) # focal length ratio
        raw_dx = (index_tip.x - thumb_tip.x) * fov_multiplier
        raw_dy = (index_tip.y - thumb_tip.y) * fov_multiplier
        raw_dz = (index_tip.z - thumb_tip.z) * fov_multiplier
        
        pinch_distance_mm = math.sqrt(raw_dx*raw_dx + raw_dy*raw_dy + raw_dz*raw_dz)
        is_pinching = pinch_distance_mm < self.config.pinch_threshold_mm

        # 4. Palm direction normal calculation (cross product)
        # Vector A: Wrist (0) -> Index-MCP (5)
        # Vector B: Wrist (0) -> Pinky-MCP (17)
        p0, p5, p17 = landmarks[0], landmarks[5], landmarks[17]
        
        ax, ay, az = p5.x - p0.x, p5.y - p0.y, p5.z - p0.z
        bx, by, bz = p17.x - p0.x, p17.y - p0.y, p17.z - p0.z
        
        # Cross product: N = A x B
        nx = ay * bz - az * by
        ny = az * bx - ax * bz
        nz = ax * by - ay * bx
        
        # Normalize vector
        n_len = math.sqrt(nx*nx + ny*ny + nz*nz)
        if n_len > 0.0001:
            nx, ny, nz = nx / n_len, ny / n_len, nz / n_len
            
        palm_direction = Point3D(x=nx, y=ny, z=nz)

        # 5. Wrist orientation (Roll)
        # Calculated from Wrist (0) to Middle-MCP (9) vector angle relative to vertical axis
        p9 = landmarks[9]
        dy_wrist = p9.y - p0.y
        dx_wrist = p9.x - p0.x
        wrist_orientation_deg = math.degrees(math.atan2(dy_wrist, dx_wrist))

        return HandState(
            is_open=is_open,
            is_fist=is_fist,
            is_pointing=is_pointing,
            is_pinching=is_pinching,
            pinch_distance_mm=pinch_distance_mm,
            palm_direction=palm_direction,
            wrist_orientation_deg=wrist_orientation_deg
        )
