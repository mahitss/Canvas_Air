from pydantic import BaseModel, Field

class HandTrackerConfig(BaseModel):
    max_num_hands: int = Field(2, ge=1, le=4, description="Maximum number of hands to track simultaneously")
    min_detection_confidence: float = Field(0.75, ge=0.0, le=1.0, description="Minimum confidence value for detection")
    min_tracking_confidence: float = Field(0.75, ge=0.0, le=1.0, description="Minimum confidence value for tracking")
    
    # Noise smoothing parameters
    smoothing_filter: str = Field("one_euro", pattern="^(one_euro|moving_average|none)$")
    one_euro_fc_min: float = Field(1.0, description="Min cutoff frequency for low speed jitter")
    one_euro_beta: float = Field(0.007, description="Speed scaling coefficient to minimize lag")
    one_euro_d_cutoff: float = Field(1.0, description="Cutoff frequency for the derivative")
    moving_average_window: int = Field(5, ge=2, le=15, description="Number of historical frames for moving average")
    
    # Coordinate outputs parameters
    mirror_mode: bool = Field(True, description="Mirror inputs x axis for webcam alignment")
    coordinate_mode: str = Field("world", pattern="^(normalized|screen|camera|world)$")
    screen_width: int = Field(1920, ge=1, description="Target horizontal resolution for screen mapping")
    screen_height: int = Field(1080, ge=1, description="Target vertical resolution for screen mapping")
    
    # Posture parameters
    pinch_threshold_mm: float = Field(25.0, description="Max distance in mm index/thumb to trigger pinch")
