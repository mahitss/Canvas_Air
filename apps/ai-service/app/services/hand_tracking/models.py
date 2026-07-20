from typing import List, Optional
from pydantic import BaseModel, Field

class Point3D(BaseModel):
    x: float = Field(..., description="X coordinate in spatial space")
    y: float = Field(..., description="Y coordinate in spatial space")
    z: float = Field(..., description="Z coordinate (depth)")

class HandLandmarkData(BaseModel):
    x: float
    y: float
    z: float
    visibility: float = Field(1.0, ge=0.0, le=1.0)
    confidence: float = Field(1.0, ge=0.0, le=1.0)
    velocity_x: float = 0.0
    velocity_y: float = 0.0
    velocity_z: float = 0.0
    acceleration_x: float = 0.0
    acceleration_y: float = 0.0
    acceleration_z: float = 0.0
    timestamp: float

class FingerState(BaseModel):
    is_extended: bool = Field(..., description="True if finger is fully extended")
    joint_angle_mcp: float = Field(..., description="Angle at Metacarpophalangeal joint in degrees")
    joint_angle_pip: float = Field(..., description="Angle at Proximal Interphalangeal joint in degrees")

class HandState(BaseModel):
    is_open: bool = Field(..., description="True if all fingers are extended")
    is_fist: bool = Field(..., description="True if all fingers are folded close to palm")
    is_pointing: bool = Field(..., description="True if index finger is extended and others are folded")
    is_pinching: bool = Field(..., description="True if index and thumb tips are in close proximity")
    pinch_distance_mm: float = Field(..., description="Euclidean distance between thumb and index tips in mm")
    palm_direction: Point3D = Field(..., description="Unit normal vector representing the palm surface vector")
    wrist_orientation_deg: float = Field(..., description="Rotation angle of the wrist along the roll axis")

class HandTrackingEvent(BaseModel):
    event_type: str = Field(..., description="Type of event: HAND_DETECTED, HAND_LOST, PINCHED, MOVED, CONFIDENCE_CHANGED")
    hand_id: int
    label: str
    timestamp: float
    metadata: Optional[dict] = None

class HandDetectionFrame(BaseModel):
    hand_id: int = Field(..., description="Unique track ID maintained for continuous hand identification")
    label: str = Field(..., description="Left or Right classification")
    confidence_score: float = Field(..., description="Overall tracking reliability score")
    landmarks: List[HandLandmarkData] = Field(..., description="Array of 21 tracked skeletal points")
    state: HandState = Field(..., description="Current classified hand pose state metadata")
    timestamp: float
