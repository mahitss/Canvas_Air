# Hand Tracking Engine Module
## Developer Integration & API Reference

The `@visioncanvas/hand-tracking` workspace package consumes camera frames from the computer vision engine, detects active hand shapes, tracks individual hand identities temporally, extracts 3D landmarks, and publishes gestural event updates.

---

## 1. Domain Types & Models

*   `HandLandmark`: Normalized 3D coordinate point.
*   `JointName`: Binds structural finger joints (wrist, thumb, index, middle, ring, pinky tip/pip/mcp).
*   `HandPresence`: Combines hand side identity, confidence factor, and joint maps.
*   `HandTrackingEvent`: Defines structured events published by the engine:
    *   `HandDetected`: Triggered on new hand entry.
    *   `HandLost`: Triggered when hand is no longer tracked.
    *   `HandMoved`: Emitted on coordinate coordinate updates.
    *   `GestureRecognized`: Dispatched on hand gestures match.

---

## 2. API Reference & Interfaces

### IHandDetector
Processes video frames to isolate hand regions and calculate normalized joint locations.
*   `detect(frame)`: Resolves list of hand presences.

### IHandTracker
Traces hand identities temporally across frames using stable ID assignments.
*   `track(hands)`: Evaluates Euclidean distance between wrist coordinates across consecutive frames. Associates detections to active tracks of the same handedness, manages occlusion grace periods, and generates sequential identifiers (e.g. `hand-right-1`).

### IHandTrackingEngine
Consumes frames and dispatches tracking events.
*   `processFrame(frame)`: Consumes a frame snapshot.
*   `subscribe(callback)` / `unsubscribeAll()`: Registers event update callbacks.

### IHandTrackingProvider
Interface isolating third-party hand tracking solution wrapper logic.
*   `initialize()`: Downloads/loads ML scripts and resources.
*   `start()` / `stop()`: Binds and stops processing pipelines.
*   `processFrame(frame)`: Processes single frame for landmarks.
*   `dispose()`: Clears instances and stops resource allocations.

### IHandLandmarkExtractor
Validates joint counts and normalizes MediaPipe coordinate landmarks.
*   `extract(rawResults, timestamp)`: Processes raw detector structures to return normalized `HandPresence` arrays.
*   `validate(presence)`: Runs strict coordinate checks, requiring all 21 keypoints.

### IHandLandmarkSmoother
Implements One-Euro filtering logic to attenuate noise.
*   `smooth(presence)`: Applies adaptive low-pass filter to the hand coordinate sequence.
*   `reset(handId)`: Discards internal velocity states for the specified hand identifier.

### IHandTrackingEventBus
Strongly-typed, UI-free publish/subscribe bus for tracking lifecycle events.
*   `publish(event)`: Dispatches events to registered listener callbacks.
*   `subscribe(type, callback)`: Binds callback to target event type.
*   `clear()`: Dereferences all active subscription callbacks.

### ICameraVisionHandTrackingBridge
Coordinates integration frame bindings between engines.
*   `start()`: Subscribes to the frame acquisition service callback loop.
*   `stop()`: Detaches subscription listeners and resets tracking flags.
*   `isActive()`: Resolves current bridge status state.

---

## 3. Usage Example

```typescript
import { HandDetector, HandTracker, HandTrackingEngine } from "@visioncanvas/hand-tracking";

const detector = new HandDetector();
const tracker = new HandTracker();
const engine = new HandTrackingEngine(detector, tracker);

engine.subscribe((event) => {
  if (event.type === "HandDetected") {
    console.log(`Detected hand: ${event.payload.hand.id}`);
  }
});
```

---

## 4. Performance & Optimizations Reference

*   [Smoothing Benchmarks Report](file:///c:/Users/pc/OneDrive/Desktop/Air%20canvas/packages/hand-tracking/docs/benchmarks.md)
*   [Engine Optimizations & Resource Management Report](file:///c:/Users/pc/OneDrive/Desktop/Air%20canvas/packages/hand-tracking/docs/engine-optimization.md)
