# Gesture Recognition Engine Module

This package (`@visioncanvas/gesture-recognition`) implements the architectural boundaries and stubs for recognizing gestures from hand tracking keypoints.

---

## 1. Domain Models

*   **`GestureState`**: Represents the phase transitions of a gesture (`"started" | "active" | "ended"`).
*   **`GesturePresence`**: Encapsulates hand IDs, gesture types, confidence levels, timestamps, and current state.

---

## 2. Core Interfaces

*   **`IGestureProvider`**: Defines hooks for gesture classification backends.
*   **`IGestureLifecycleTracker`**: Preserves event sequences to manage started/active/ended state timings.
*   **`IGestureRecognitionEngine`**: Exposes registers for custom providers and maps incoming frames.

### StaticGestureProvider
A rule-based geometric classifier recognizing static positions:
*   **Recognized Gestures**: `Open Palm`, `Closed Fist`, `Point`, `Pinch`, `Peace`, `Thumbs Up`, `OK Sign`.
*   **Configurable Thresholds**:
    *   `pinchThreshold`: Limit to trigger tips proximity (default `0.05`).
    *   `extendRatioThreshold`: Distance ratio of joints to classify extended fingers (default `1.05`).

### DynamicGestureProvider
A temporal-based tracker analyzing motion history across frames:
*   **Recognized Gestures**: `Swipe Left`, `Swipe Right`, `Swipe Up`, `Swipe Down`, `Circle`, `Zoom In`, `Zoom Out`, `Rotate`.
*   **Algorithms & Rules**:
    *   *Path Linearity*: Uses straight-line distance to total path length ratios to filter linear swipes from curved circle sweeps.
    *   *Circle Checks*: Validates radius standard deviations and sweep angles (at least 3.5 radians).
    *   *Distance Deltas*: Tracks index and thumb tip separations for Zoom In and Zoom Out.
*   **Configurable Thresholds**:
    *   `swipeVelocityThreshold`: Coordinate units per second (default `0.25`).
    *   `zoomDistanceThreshold`: Delta distance change (default `0.04`).
    *   `rotateAngleThreshold`: Delta angle in radians (default `0.4`).

### MultiHandGestureEngine
A specialized engine synchronizing landmarks from multiple concurrent hands (requiring exactly one `"left"` and one `"right"` hand):
*   **Recognized Gestures**:
    *   `Two-hand pinch`: Both left and right index and thumb tips are pinched together simultaneously.
    *   `Expand` / `Contract`: The absolute distance between left and right wrists increases or decreases over time.
    *   `Rotate`: The angle of the line connecting left and right wrists rotates dynamically.
    *   `Mirror`: Hands move horizontally in opposite directions with coordinated velocity signs.
    *   `Symmetric gestures`: Both hands move in the exact same direction concurrently.
*   **Safety & Disappearance Management**:
    *   If one or both hands leave the tracking viewport, the coordinate history is immediately cleared.
*   **Configurable Thresholds**:
    *   `maxAgeMs`: Sliding window time limit (default `600`ms).
    *   `pinchDistanceThreshold`: Touch distance for pinch detection (default `0.05`).
    *   `expandThreshold`: Change in distance between hands (default `0.04`).
    *   `rotateThreshold`: Change in angle in radians (default `0.3`).

### CustomGestureFramework
A runtime framework enabling developers to register, remove, and configure custom user gestures dynamically:
*   **Public APIs**:
    *   `registerGesture(gesture: CustomGestureDefinition): void`: Registers a new custom gesture matching algorithm with custom thresholds and metadata.
    *   `removeGesture(name: string): void`: Removes a gesture from the evaluator registry.
    *   `listGestures(): CustomGestureDefinition[]`: Lists all currently registered custom gestures.
    *   `configureThresholds(name: string, thresholds: Record<string, number>): void`: Safely updates thresholds of an active gesture.
    *   `setGestureEnabled(name: string, enabled: boolean): void`: Flags a custom gesture as active or inactive during pipeline ticks.
*   **Evaluation Engine**:
    *   `evaluate(hand: HandPresence, history: HandPresence[]): string[]`: Processes current hand tracking frames against all registered and enabled custom rules, returning matched gesture names.

### GestureConfidenceService
Calculates signal quality, stability, and recognition scores to drive dynamic UI thresholds:
*   **Evaluation Factors**:
    *   *Landmark Quality*: Checks existence of key joints (wrist, tips) and scales based on detector confidence.
    *   *Motion Stability*: Examines acceleration variance of velocities over sliding history steps.
    *   *Detection History*: Matches percentage of positive hits within the recent sliding buffer.
    *   *Frame Consistency*: Tracks frame-rate delta variance (jitter) and detects coordinate teleport jumps.
*   **Metrics Exposed**:
    *   `confidence`: Final composite confidence weight (`0.0` to `1.0`).
    *   `stability`: Magnitude of velocity acceleration transitions (`0.0` to `1.0`).
    *   `trackingQuality`: Signal health combining landmark count presence and capture consistency (`0.0` to `1.0`).

### GestureEventBus
A strongly-typed, thread-safe pub/sub dispatch event bus supporting history buffers for event replay:
*   **Emitted Events**:
    *   `GestureStarted`: Fired when a gesture begins.
    *   `GestureUpdated`: Fired during active updates.
    *   `GestureCompleted`: Fired when a gesture successfully completes.
    *   `GestureCancelled`: Fired if tracking parameters are lost mid-gesture.
    *   `GestureFailed`: Fired if a processing anomaly or tracking error breaks the gesture lifecycle.
*   **Public APIs**:
    *   `publish(event: GestureBusEvent): void`: Dispatches an event atomically to all matching type and wildcard (`*`) subscribers, copying to history.
    *   `subscribe(type: GestureEventType | "*", callback: (event: GestureBusEvent) => void, options?: { replay?: boolean }): () => void`: Registers listener callbacks with optional historical replay of matching buffered logs. Returns an unsubscription callback.
    *   `clearHistory(): void`: Resets the historical replay buffer logs.
    *   `unsubscribeAll(): void`: Clears all registered callbacks in the subscribers map.

### HandTrackingGestureBridge
An integration layer that binds the Hand Tracking Engine to the single and multi-hand Gesture Recognition Engines:
*   **Key Operations**:
    *   *Landmark Subscriptions*: Listens to `"LandmarksUpdated"` and `"HandLost"` tracking outputs without altering public tracking APIs.
    *   *Sequential Order Preservation*: Uses an asynchronous execution chain to guarantee frame order classification.
    *   *Dropped Updates*: Discards outdated frames whose timestamp is older than the last processed frame.
    *   *Multi-Hand Coordination*: Batches landmark updates of the same `frameId` using microtask scheduling and forwards them simultaneously to the `MultiHandGestureEngine`.

---

## 3. Usage Example

```typescript
import { GestureProvider, GestureLifecycleTracker, GestureRecognitionEngine } from "@visioncanvas/gesture-recognition";

const tracker = new GestureLifecycleTracker();
const engine = new GestureRecognitionEngine(tracker);

engine.registerProvider(new GestureProvider());

engine.subscribe((event) => {
  if (event.type === "GestureStarted") {
    console.log(`User started gesture: ${event.payload.gesture.gesture}`);
  }
});
```
