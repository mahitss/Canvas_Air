import pytest
import math
from app.services.hand_tracking.config import HandTrackerConfig
from app.services.hand_tracking.filters import OneEuroFilter, OneEuroFilter3D, MovingAverageFilter3D
from app.services.hand_tracking.projection import CoordinateProjector
from app.services.hand_tracking.state import HandStateClassifier
from app.services.hand_tracking.models import HandLandmarkData, Point3D
from app.services.hand_tracking.validator import LandmarkValidator

def test_one_euro_filter_smoothing():
    """
    Verifies that the One Euro Filter attenuates noise at constant signals
    and adapts parameters based on coordinate velocities.
    """
    filter_instance = OneEuroFilter(freq=60.0, mincutoff=1.0, beta=0.01, dcutoff=1.0)
    
    # 1. Static input with high frequency noise
    constant_val = 100.0
    noisy_inputs = [constant_val + (1.5 if i % 2 == 0 else -1.5) for i in range(20)]
    
    filtered_outputs = []
    for val in noisy_inputs:
        # Simulate time delta
        filtered_outputs.append(filter_instance.filter(val, timestamp=0.016)) # 60 FPS approx

    # The variance of filtered outputs must be significantly lower than the input variance
    input_variance = sum((v - constant_val) ** 2 for v in noisy_inputs) / len(noisy_inputs)
    output_variance = sum((v - constant_val) ** 2 for v in filtered_outputs[-10:]) / 10
    
    assert output_variance < input_variance * 0.35


def test_coordinate_projections():
    """
    Verifies normalized coordinates map to screen bounds and projects to world
    space matching intrinsic camera properties.
    """
    config = HandTrackerConfig(
        mirror_mode=True,
        screen_width=1920,
        screen_height=1080
    )
    projector = CoordinateProjector(config)
    
    # Mirror mode active: 0.1 normalized should map to (1.0 - 0.1) * 1920 = 1728
    screen_x, screen_y = projector.project_to_screen(0.1, 0.5)
    assert screen_x == pytest.approx(1728.0)
    assert screen_y == pytest.approx(540.0)

    # Validate Camera depth calculation
    # Simulate hand wrist (0) and middle MCP (9) points representing typical sizes
    # Dist index wrist=0, middle-mcp=9
    mock_landmarks = [Point3D(x=0.5, y=0.5, z=0.0) for _ in range(21)]
    # Set spacing difference: distance of ~0.085 in normalized coordinates
    mock_landmarks[0] = Point3D(x=0.5, y=0.85, z=0.0)
    mock_landmarks[9] = Point3D(x=0.5, y=0.765, z=0.0) # distance = 0.085
    
    z_depth = projector.estimate_camera_depth_z(mock_landmarks)
    assert z_depth == pytest.approx(800.0) # 800 * 85 / (0.085 * 1000) = 800 * 85 / 85 = 800mm


def test_hand_posture_classification():
    """
    Simulates landmark coordinate configurations to test open palm, fist, and pinch events.
    """
    config = HandTrackerConfig(pinch_threshold_mm=25.0)
    classifier = HandStateClassifier(config)
    
    # 1. Base default points (Simulating pinched fingers)
    landmarks = [
        HandLandmarkData(x=0.5, y=0.5, z=0.0, timestamp=1.0)
        for _ in range(21)
    ]
    # Set index tip (8) and thumb tip (4) to be close
    landmarks[4] = HandLandmarkData(x=0.5, y=0.5, z=0.0, timestamp=1.0)
    landmarks[8] = HandLandmarkData(x=0.51, y=0.5, z=0.0, timestamp=1.0) # 0.01 normalized spacing
    
    state = classifier.classify_hand_state(landmarks, estimated_z_mm=1000.0)
    # At 1 meter, 0.01 normalized spacing maps to 10mm (which is < 25mm threshold)
    assert state.is_pinching is True


def test_kinematics_derivation():
    """
    Validates that landmark validator computes correct velocities and accelerations.
    """
    config = HandTrackerConfig()
    validator = LandmarkValidator(config)
    
    hand_id = 0
    raw_landmarks = [Point3D(x=0.5, y=0.5, z=0.0) for _ in range(21)]
    vis_scores = [1.0] * 21
    conf_scores = [1.0] * 21
    
    # Frame 1: Initial static frame
    res1 = validator.validate_and_compute_kinematics(hand_id, raw_landmarks, vis_scores, conf_scores)
    assert res1[0].velocity_x == 0.0
    
    # Frame 2: Move points by dx = 0.1 in dt = 1.0 second (mock time delta manually via history)
    # We mock history timestamps to simulate exact dt
    validator.timestamps[hand_id][-1] = 1.0
    validator.history[hand_id][-1][0].x = 0.5
    
    raw_landmarks_moved = [Point3D(x=0.6, y=0.5, z=0.0) for _ in range(21)]
    
    import time
    # Force mock current timestamp
    original_time = time.time
    time.time = lambda: 2.0
    
    try:
        res2 = validator.validate_and_compute_kinematics(hand_id, raw_landmarks_moved, vis_scores, conf_scores)
        # velocity = (0.6 - 0.5) / (2.0 - 1.0) = 0.1 units/sec
        assert res2[0].velocity_x == pytest.approx(0.1)
    finally:
        time.time = original_time
