from typing import List, Optional
from pydantic import BaseModel, Field

class Point3D(BaseModel):
    x: float
    y: float
    z: float

class HandLandmarks(BaseModel):
    label: str = Field(..., description="Left or Right hand classification label")
    score: float = Field(..., description="MediaPipe confidence tracker metric")
    landmarks: List[Point3D] = Field(..., description="Points representing joint landmarks")

class GestureRecognitionResult(BaseModel):
    gesture: str = Field(..., description="Classified gesture tag")
    confidence: float = Field(..., description="Probability of tag prediction accuracy")
    coordinates: Optional[Point3D] = Field(None, description="Primary drawing point coordinates")
