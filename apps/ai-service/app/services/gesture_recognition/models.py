from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.services.hand_tracking.models import Point3D

class GestureDetectionResult(BaseModel):
    gesture_name: str = Field(..., description="Name of the recognized static or dynamic gesture")
    confidence: float = Field(..., description="Classifier certainty score (0.0 to 1.0)")
    duration: float = Field(..., description="Duration of gesture execution in seconds")
    hand_id: int = Field(..., description="ID of the hand performing the gesture")
    timestamp: float = Field(..., description="System timestamp when gesture was recognized")
    tracking_quality: float = Field(..., description="Underlying landmarks confidence multiplier")

class CustomGestureTemplate(BaseModel):
    name: str = Field(..., description="Identifier name assigned by user to this custom gesture")
    # A template is a sequence of hand coordinates (Wrist, Index MCP, Index TIP, etc.) over N frames
    trajectory: List[List[Point3D]] = Field(..., description="Sequence of landmark point sets recorded during gesture training")

class CustomGestureProfile(BaseModel):
    user_id: str
    templates: List[CustomGestureTemplate] = Field(default_factory=list)

class ShortcutAction(BaseModel):
    action_type: str = Field(..., description="Type of action: SHORTCUT, DRAW_ACTION, MOUSE_EMULATION, SYSTEM_CMD")
    target: str = Field(..., description="Target value (e.g. 'ctrl+z', 'brush_draw', 'left_click', 'shutdown')")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Parameters mapped to execution methods")

class GestureEvent(BaseModel):
    event_id: str
    event_type: str = Field(..., description="Type of event: GESTURE_STARTED, GESTURE_UPDATED, GESTURE_COMPLETED, GESTURE_CANCELLED")
    gesture_name: str
    hand_id: int
    confidence: float
    timestamp: float
    metadata: Optional[Dict[str, Any]] = None
