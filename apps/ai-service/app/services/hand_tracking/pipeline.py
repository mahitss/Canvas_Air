import time
import numpy as np
from typing import List, Dict, Callable
from app.services.hand_tracking.models import HandDetectionFrame, HandLandmarkData, HandTrackingEvent
from app.services.hand_tracking.config import HandTrackerConfig
from app.services.hand_tracking.detector import HandDetector
from app.services.hand_tracking.validator import LandmarkValidator
from app.services.hand_tracking.projection import CoordinateProjector
from app.services.hand_tracking.state import HandStateClassifier
from app.services.hand_tracking.events import HandTrackingEventPublisher
from app.services.hand_tracking.filters import OneEuroFilter3D, MovingAverageFilter3D

class HandTrackingPipeline:
    def __init__(self, config: HandTrackerConfig):
        self.config = config
        
        # Pipelines stages components
        self.detector = HandDetector(config)
        self.validator = LandmarkValidator(config)
        self.projector = CoordinateProjector(config)
        self.classifier = HandStateClassifier(config)
        self.publisher = HandTrackingEventPublisher()
        
        # Caching dictionaries for dynamic filters
        # Key: hand_id (e.g. index tracker) -> FilterInstance
        self.filters_one_euro: Dict[int, List[OneEuroFilter3D]] = {}
        self.filters_moving_avg: Dict[int, List[MovingAverageFilter3D]] = {}
        
        # Track persistent hand IDs to support continuity
        self.hand_label_map: Dict[int, str] = {}

    def _get_filter_for_landmark(self, hand_id: int, lm_idx: int) -> OneEuroFilter3D | MovingAverageFilter3D | None:
        """
        Returns or instantiates filter objects corresponding to the landmark point index.
        """
        if self.config.smoothing_filter == "none":
            return None
            
        if self.config.smoothing_filter == "one_euro":
            hand_filters = self.filters_one_euro.get(hand_id, [])
            if not hand_filters:
                # Instantiate 21 filters for the skeletal joints
                hand_filters = [
                    OneEuroFilter3D(
                        freq=60.0,
                        mincutoff=self.config.one_euro_fc_min,
                        beta=self.config.one_euro_beta,
                        dcutoff=self.config.one_euro_d_cutoff
                    )
                    for _ in range(21)
                ]
                self.filters_one_euro[hand_id] = hand_filters
            return hand_filters[lm_idx] if lm_idx < len(hand_filters) else None
            
        if self.config.smoothing_filter == "moving_average":
            hand_filters = self.filters_moving_avg.get(hand_id, [])
            if not hand_filters:
                hand_filters = [
                    MovingAverageFilter3D(window_size=self.config.moving_average_window)
                    for _ in range(21)
                ]
                self.filters_moving_avg[hand_id] = hand_filters
            return hand_filters[lm_idx] if lm_idx < len(hand_filters) else None

        return None

    def process_frame(self, frame_bgr: np.ndarray) -> List[HandDetectionFrame]:
        """
        Orchestrates full computer vision frames coordinate calculations,
        kinematic estimates, smoothing filters, state posturing, and events mapping.
        """
        raw_detections = self.detector.detect_landmarks(frame_bgr)
        current_time = time.time()
        active_frames: List[HandDetectionFrame] = []
        
        # Keep track of active IDs to prune dead filters
        active_ids = []

        for idx, detection in enumerate(raw_detections):
            # MediaPipe does not provide persistent tracking IDs.
            # Map index as hand_id (limit to max hands configured)
            if idx >= self.config.max_num_hands:
                break
                
            hand_id = idx
            active_ids.append(hand_id)
            
            label = detection["label"]
            score = detection["score"]
            raw_pts = detection["landmarks"]
            vis_list = detection["visibility"]
            conf_list = detection["confidence"]
            
            # 1. Validation & Kinematics calculations stage
            validated_pts = self.validator.validate_and_compute_kinematics(
                hand_id, raw_pts, vis_list, conf_list
            )
            
            # 2. Filtering / Smoothing stage
            smoothed_pts: List[HandLandmarkData] = []
            for i, pt in enumerate(validated_pts):
                filter_instance = self._get_filter_for_landmark(hand_id, i)
                
                if filter_instance is not None:
                    if isinstance(filter_instance, OneEuroFilter3D):
                        fx, fy, fz = filter_instance.filter(pt.x, pt.y, pt.z, current_time)
                    else: # MovingAverageFilter3D
                        fx, fy, fz = filter_instance.filter(pt.x, pt.y, pt.z)
                else:
                    fx, fy, fz = pt.x, pt.y, pt.z
                    
                smoothed_pts.append(
                    HandLandmarkData(
                        x=fx,
                        y=fy,
                        z=fz,
                        visibility=pt.visibility,
                        confidence=pt.confidence,
                        velocity_x=pt.velocity_x,
                        velocity_y=pt.velocity_y,
                        velocity_z=pt.velocity_z,
                        acceleration_x=pt.acceleration_x,
                        acceleration_y=pt.acceleration_y,
                        acceleration_z=pt.acceleration_z,
                        timestamp=current_time
                    )
                )

            # 3. Depth Estimations & Coordinate Projections stage
            estimated_z_mm = self.projector.estimate_camera_depth_z(
                [Point3D(x=p.x, y=p.y, z=p.z) for p in smoothed_pts]
            )
            
            projected_pts: List[HandLandmarkData] = []
            for pt in smoothed_pts:
                if self.config.coordinate_mode == "screen":
                    px, py = self.projector.project_to_screen(pt.x, pt.y)
                    pz = pt.z # Screen has 2D, keep z raw
                elif self.config.coordinate_mode == "camera":
                    # Simple relative coordinates scaled to mm
                    px, py = pt.x * estimated_z_mm, pt.y * estimated_z_mm
                    pz = estimated_z_mm
                elif self.config.coordinate_mode == "world":
                    px, py, pz = self.projector.project_to_world_3d(pt.x, pt.y, estimated_z_mm)
                else: # normalized
                    px, py, pz = pt.x, pt.y, pt.z
                    
                projected_pts.append(
                    HandLandmarkData(
                        x=px,
                        y=py,
                        z=pz,
                        visibility=pt.visibility,
                        confidence=pt.confidence,
                        velocity_x=pt.velocity_x,
                        velocity_y=pt.velocity_y,
                        velocity_z=pt.velocity_z,
                        acceleration_x=pt.acceleration_x,
                        acceleration_y=pt.acceleration_y,
                        acceleration_z=pt.acceleration_z,
                        timestamp=current_time
                    )
                )

            # 4. Posture Classification stage
            state = self.classifier.classify_hand_state(projected_pts, estimated_z_mm)
            
            # Formulate final frame object
            active_frames.append(
                HandDetectionFrame(
                    hand_id=hand_id,
                    label=label,
                    confidence_score=score,
                    landmarks=projected_pts,
                    state=state,
                    timestamp=current_time
                )
            )

        # 5. Evaluate state transitions and publish events
        self.publisher.evaluate_transitions(active_frames)
        
        # 6. Cleanup obsolete hand filters when hands disappear
        obsolete_ids = [hid for hid in list(self.filters_one_euro.keys()) if hid not in active_ids]
        for hid in obsolete_ids:
            if hid in self.filters_one_euro:
                del self.filters_one_euro[hid]
            if hid in self.filters_moving_avg:
                del self.filters_moving_avg[hid]
            self.validator.clear_history_for_hand(hid)

        return active_frames

    def register_listener(self, callback: Callable[[HandTrackingEvent], None]) -> None:
        """
        Attaches event handlers to receive tracking transitions.
        """
        self.publisher.subscribe(callback)

    def shutdown(self) -> None:
        """
        Clean release resources.
        """
        self.detector.close()
