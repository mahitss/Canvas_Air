# Camera & Video Stream Service Module
## Developer Integration & API Reference

The `@visioncanvas/camera-vision` workspace package manages physical camera connections, captures frame sequences, detects hotplug disconnects/reconnects, and audits frame performance.

---

## 1. Domain Types & Models

*   `CameraDevice`: Holds information about the camera ID and label.
*   `StreamConfig`: Defines width, height, and frame rate parameters for stream initialization.
*   `FrameData`: Holds the captured ImageData along with a timestamp.
*   `PerformanceStats`: Measures dropped frames and execution latencies.

---

## 2. API Reference & Interfaces

### ICameraManager
Coordinates the stream lifecycle:
*   `listDevices()`: Resolves a list of available cameras.
*   `startStream(config)`: Binds camera tracks to video stream constraints.
*   `stopStream()`: Releases active track resources.

### IFrameAcquisitionService
Coordinates continuous frame capture loops and lifecycle events:
*   `captureFrame()`: Grabs the current frame payload.
*   `subscribe(callback)`: Registers listener callbacks for captured frames (`FrameCaptured`, `CaptureStarted`, `CaptureStopped`, `CaptureError` events).
*   `startCapture({ fps })`: Starts the capture loop at a target frame rate.
*   `stopCapture()`: Halts the active capture loop.
*   `pauseCapture()` / `resumeCapture()`: Pauses or resumes the acquisition loop without restarting timers.
*   *Backpressure Relief*: If a subscriber is still executing (e.g. returns a Promise that is not yet resolved), subsequent frame draws are automatically skipped to avoid memory bloating.

### ICameraPermissionService
Coordinates camera access permissions:
*   `queryState()`: Evaluates browser permissions API mapping to exposed states (`PermissionGranted`, `PermissionDenied`, `PermissionRevoked`, `PermissionUnknown`).
*   `requestPermission()`: Prompts user for camera input permissions.
*   `onStateChange(callback)`: Registers custom state update listener callbacks.
*   `dispose()`: Clears active permissions change event listeners to prevent memory leaks.

### IFrameScheduler
Schedules frame dispatches, maintaining target capture rates and pacing consumers:
*   `registerConsumer(callback)`: Registers frame consumers.
*   `scheduleFrame(frame)`: Processes new frames, applying duplicate check filters, adaptive FPS pacing, and starvation guards.
*   `setTargetFPS(fps)`: Sets target FPS baseline.
*   `getTargetFPS()` / `getAdaptiveFPS()`: Gets target and dynamic calculated target FPS states.
*   `stop()`: Resets scheduling caches and disarms active queues.

### ICameraWorkerClient
Manages zero-copy browser background worker threads:
*   `postFrame(frame)`: Dispatches frame payloads using transfer lists, keeping track of acknowledgments.
*   `terminate()`: Shuts down background workers.
*   `onError(callback)`: Hooks unhandled worker execution exceptions.

### IPerformanceMonitor
Tracks execution latency budget indicators and system resource footprints:
*   `recordFrameProcessed(latencyMs, processingTimeMs)`: Increments frame counters and updates historical averages.
*   `recordDroppedFrame()`: Records drops when consumers/schedulers skip frames.
*   `recordCapture(latencyMs)` / `recordWorker(latencyMs)`: Records acquisition and worker thread delays.
*   `updateSystemMetrics()`: Updates heap memory footprints and delta system CPU loads.
*   `getStats()`: Resolves a complete `PerformanceStats` report.

### ICameraRecoveryService
Coordinates failovers and exponential backoff retry cycles:
*   `handleUnplug()`: Attempts automatic failover to another available camera.
*   `handlePermissionRevoked()`: Degrades gracefully by pausing the camera stream and capture loop.
*   `handleStreamInterruption()`: Implements exponential retry backoffs to restart the stream.
*   `handleWorkerCrash()`: Resets background processing worker channels.
*   `handleBrowserError(error)`: Suspends operations and logs unexpected runtime exceptions.
*   `getRecoveryLogs()`: Returns array of logged recovery operations.

---

## 3. Usage Example

```typescript
import { CameraManager, CameraPermissionService, FrameAcquisitionService, FrameScheduler } from "@visioncanvas/camera-vision";

const permissions = new CameraPermissionService();
const state = await permissions.queryState();

if (state !== "PermissionGranted") {
  await permissions.requestPermission();
}

const manager = new CameraManager();
const devices = await manager.listDevices();

await manager.startStream({
  deviceId: devices[0].id,
  width: 1280,
  height: 720,
  frameRate: 60
});

const acquisition = new FrameAcquisitionService(manager);
const scheduler = new FrameScheduler();

scheduler.setTargetFPS(60);
scheduler.registerConsumer(async (frame) => {
  // Slow operation like object detection or handwriting analysis
  await new Promise((resolve) => setTimeout(resolve, 30));
  console.log(`Processed Frame: ${frame.id}`);
});

acquisition.subscribe((event) => {
  if (event.type === "FrameCaptured") {
    scheduler.scheduleFrame(event.payload);
  }
});

acquisition.startCapture({ fps: 60 });
```
