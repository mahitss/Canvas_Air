from pydantic import BaseModel, Field

class GestureTrackerConfig(BaseModel):
    min_gesture_confidence: float = Field(0.70, ge=0.0, le=1.0, description="Min probability threshold to trigger events")
    gesture_timeout_seconds: float = Field(1.5, ge=0.1, le=5.0, description="Max duration before dynamic trajectories expire")
    cooldown_seconds: float = Field(0.3, ge=0.05, le=2.0, description="Cooldown lock to prevent multiple triggers")
    history_window_length: int = Field(30, ge=5, le=120, description="Frame window length for sliding sequence buffers")
    motion_distance_threshold_mm: float = Field(50.0, ge=5.0, le=500.0, description="Min distance a finger must travel to qualify for swipes")
    max_simultaneous_gestures: int = Field(3, ge=1, le=10, description="Maximum concurrent gestures to track across hands")
