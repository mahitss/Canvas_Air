import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.hand_tracking.config import HandTrackerConfig
from app.services.hand_tracking.pipeline import HandTrackingPipeline
from app.services.hand_tracking.models import HandTrackingEvent
from app.services.gesture_recognition.config import GestureTrackerConfig
from app.services.gesture_recognition.pipeline import GestureRecognitionPipeline
from app.services.gesture_recognition.models import GestureEvent

api_router = APIRouter()

# Instantiate pipeline services
tracking_config = HandTrackerConfig()
tracking_pipeline = HandTrackingPipeline(tracking_config)

gesture_config = GestureTrackerConfig()
gesture_pipeline = GestureRecognitionPipeline(gesture_config)

# Store events emitted by both pipelines to broadcast them over dedicated events socket
latest_events: list[HandTrackingEvent | GestureEvent] = []

def on_tracking_event(event: HandTrackingEvent) -> None:
    latest_events.append(event)
    if len(latest_events) > 200:
        latest_events.pop(0)

def on_gesture_event(event: GestureEvent) -> None:
    latest_events.append(event)
    if len(latest_events) > 200:
        latest_events.pop(0)

# Register listeners
tracking_pipeline.register_listener(on_tracking_event)
gesture_pipeline.register_listener(on_gesture_event)


@api_router.websocket("/ws/tracking")
async def hand_tracking_feed(websocket: WebSocket):
    """
    WebSocket channel that ingests raw camera image binary frames (WebP/JPEG)
    and streams back calculated landmark kinematics, states, and coordinates
    along with recognized static and dynamic gestures.
    """
    await websocket.accept()
    try:
        while True:
            # 1. Ingest raw frame bytes
            data = await websocket.receive_bytes()
            if not data:
                continue

            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None or frame.size == 0:
                await websocket.send_json({"error": "Failed to decode frame image stream."})
                continue

            # 2. Run high-performance tracking pipeline
            detection_frames = tracking_pipeline.process_frame(frame)
            
            # 3. Run gesture recognition pipeline
            gestures = gesture_pipeline.process_all_hands(detection_frames, user_id=None)
            
            # 4. Formulate output payload
            response_payload = {
                "hands": [f.dict() for f in detection_frames],
                "gestures": [g.dict() for g in gestures],
                "timestamp": float(websocket.scope.get("time", 0.0)) or None
            }
            
            # Send results
            await websocket.send_json(response_payload)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": f"Internal pipeline error: {str(e)}"})
        except Exception:
            pass


@api_router.websocket("/ws/events")
async def events_channel(websocket: WebSocket):
    """
    WebSocket channel that streams state transitions (pinch, entry/exit)
    and dynamic/static gesture events (started, completed, etc.).
    """
    await websocket.accept()
    last_sent_idx = len(latest_events)
    try:
        while True:
            # Quick async sleep to avoid busy waiting loop
            await websocket.receive_text() # keep-alive block or wait for client signal
            
            # Output any new events
            current_len = len(latest_events)
            if current_len > last_sent_idx:
                new_events = latest_events[last_sent_idx:current_len]
                for event in new_events:
                    await websocket.send_json(event.dict())
                last_sent_idx = current_len
    except WebSocketDisconnect:
        pass
