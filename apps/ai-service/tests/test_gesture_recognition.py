import pytest
import time
import math
from app.services.hand_tracking.models import HandDetectionFrame, HandLandmarkData, Point3D, HandState
from app.services.gesture_recognition.config import GestureTrackerConfig
from app.services.gesture_recognition.pipeline import GestureRecognitionPipeline
from app.services.gesture_recognition.features import FeatureExtractor
from app.services.gesture_recognition.custom import CustomGestureManager
from app.services.gesture_recognition.models import GestureEvent

def test_feature_extractor_angles():
    """
    Verifies that straight joint vectors yield expected angles (e.g. near 180 degrees).
    """
    a = Point3D(x=0.5, y=0.5, z=0.0)
    b = Point3D(x=0.5, y=0.6, z=0.0)
    c = Point3D(x=0.5, y=0.7, z=0.0)
    
    # Vertex B lies exactly in-line between A and C (180 deg straight vector)
    angle = FeatureExtractor.calculate_joint_angle(a, b, c)
    assert angle == pytest.approx(180.0)

    # 90 degrees joint check
    d = Point3D(x=0.6, y=0.6, z=0.0)
    angle_90 = FeatureExtractor.calculate_joint_angle(a, b, d)
    assert angle_90 == pytest.approx(90.0)


def test_dynamic_swipe_classification():
    """
    Simulates a sequence of index tip points moving horizontally to test swipe right detection.
    """
    config = GestureTrackerConfig(min_gesture_confidence=0.70)
    pipeline = GestureRecognitionPipeline(config)
    
    hand_id = 0
    # Simulate a fast swipe right trajectory (X shifts from 0.2 to 0.7 over 10 frames)
    frames_count = 12
    dt = 0.016 # 60 FPS approx
    
    detected_swipe = False
    for i in range(frames_count):
        x_coord = 0.2 + (0.5 * (i / (frames_count - 1)))
        
        # Build raw landmarks array for frame
        landmarks = [
            HandLandmarkData(x=x_coord, y=0.8 - 0.02 * idx, z=0.0, timestamp=i * dt)
            for idx in range(21)
        ]
        
        frame = HandDetectionFrame(
            hand_id=hand_id,
            label="Right",
            confidence_score=0.95,
            landmarks=landmarks,
            state=HandState(
                is_open=True, is_fist=False, is_pointing=False, is_pinching=False,
                pinch_distance_mm=99.0, palm_direction=Point3D(x=0.0, y=0.0, z=-1.0),
                wrist_orientation_deg=0.0
            ),
            timestamp=i * dt
        )
        
        res = pipeline.process_hand_frame(frame)
        if res is not None and res.gesture_name == "Swipe Right":
            detected_swipe = True
            
    assert detected_swipe is True


def test_false_positive_cooldown():
    """
    Ensures that once a dynamic swipe gesture is triggered, the cooldown lock blocks
    further dynamic triggers for the same hand within the lock timeframe.
    """
    config = GestureTrackerConfig(cooldown_seconds=0.3, min_gesture_confidence=0.7)
    pipeline = GestureRecognitionPipeline(config)
    
    hand_id = 0
    dt = 0.016
    
    # 1. Simulate first swipe right sequence
    first_triggered = False
    for i in range(10):
        x = 0.2 + (0.5 * (i / 9))
        landmarks = [HandLandmarkData(x=x, y=0.8 - 0.02 * idx, z=0.0, timestamp=i*dt) for idx in range(21)]
        frame = HandDetectionFrame(
            hand_id=hand_id, label="Right", confidence_score=0.95, landmarks=landmarks,
            state=HandState(is_open=True, is_fist=False, is_pointing=False, is_pinching=False, pinch_distance_mm=99.0, palm_direction=Point3D(x=0,y=0,z=-1), wrist_orientation_deg=0),
            timestamp=i*dt
        )
        res = pipeline.process_hand_frame(frame)
        if res is not None and res.gesture_name == "Swipe Right":
            first_triggered = True
            
    assert first_triggered is True
            
    # 2. Simulate immediately a second swipe right sequence (within 0.3s cooldown lock)
    second_triggered = False
    for i in range(10):
        x = 0.2 + (0.5 * (i / 9))
        # Keep timestamps within 100ms of first trigger
        t = 0.15 + (i * dt)
        landmarks = [HandLandmarkData(x=x, y=0.8 - 0.02 * idx, z=0.0, timestamp=t) for idx in range(21)]
        frame = HandDetectionFrame(
            hand_id=hand_id, label="Right", confidence_score=0.95, landmarks=landmarks,
            state=HandState(is_open=True, is_fist=False, is_pointing=False, is_pinching=False, pinch_distance_mm=99.0, palm_direction=Point3D(x=0,y=0,z=-1), wrist_orientation_deg=0),
            timestamp=t
        )
        res2 = pipeline.process_hand_frame(frame)
        if res2 is not None and res2.gesture_name == "Swipe Right":
            second_triggered = True
            
    assert second_triggered is False


def test_custom_gesture_profiles(tmp_path):
    """
    Tests custom user gesture profile recording and alignment matching.
    """
    storage = tmp_path / "custom_gestures_test.json"
    manager = CustomGestureManager(storage_path=str(storage))
    
    user_id = "user-alice"
    name = "CustomWave"
    
    # 1. Record custom template sequence (Index tip moves up-down sinusoidally)
    manager.start_recording(user_id, name)
    for i in range(15):
        y = 0.5 + 0.3 * math.sin(i / 14 * math.pi)
        pts = [Point3D(x=0.5, y=y, z=0.0) for _ in range(21)]
        manager.record_frame(user_id, pts)
        
    template = manager.save_recording(user_id)
    assert template is not None
    assert template.name == "CustomWave"

    # 2. Verify that same trajectory matches template
    test_seq = []
    for i in range(15):
        y = 0.5 + 0.3 * math.sin(i / 14 * math.pi)
        # Add slight noise to coordinates (e.g. 0.01 offset)
        test_seq.append([Point3D(x=0.51, y=y + 0.01, z=0.0) for _ in range(21)])
        
    match = manager.classify_custom(user_id, test_seq)
    assert match is not None
    assert match[0] == "CustomWave"
    assert match[1] >= 0.70 # high confidence match
