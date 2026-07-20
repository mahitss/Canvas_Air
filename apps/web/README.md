# VisionCanvas AI Web Client (`apps/web`)

This Next.js application serves as the frontend spatial presentation layer. It captures video feeds, manages transient local states, coordinates interactions with the sync server via WebSockets, and draws overlay assets directly onto a WebGL canvas.

## Architecture Explanation

```
           +------------------------------+
           |       Next.js Pages / App    |
           +--------------+---------------+
                          |
                          v
           +--------------+---------------+
           |       Zustand State Store    |
           +--------------+---------------+
                          |
                          v
       +------------------+------------------+
       |                                     |
       v                                     v
+------+-------+                     +-------+------+
| WebGL Canvas |                     | WebSocket    |
| (Three.js)   |                     | Gateway      |
+--------------+                     +--------------+
```

The Web Client relies on **Model-View-Controller (MVC)** patterns mapped into React components and hook lifecycles.
*   **View**: Standard Next.js server-side shells, and atomized UI components animated with Framer Motion.
*   **Controller / State**: Managed via Zustand to ensure rendering loops (`requestAnimationFrame`) can access dynamic coordinates without incurring React re-rendering penalties.
*   **Graphics Driver**: Coordinates are drawn using a layered canvas setup (3D layer via Three.js / R3F and 2D overlay layer).

## Folder Explanation

*   **`src/app/`**: Controls standard page routing, metadata definitions, layouts, and public headers.
*   **`src/components/`**: Clean, modular UI units such as the canvas renderer, control toolbars, active user lists, and alerts.
*   **`src/engine/`**: The visual execution core. Handles shader calculations, particle logic, and WebGL drawing cycles.
*   **`src/hooks/`**: Handles external webcam feeds, coordinates synchronization hooks, and encapsulates server REST queries.
*   **`src/services/`**: Low-level networking wrappers (Socket.io client instance and HTTP adapters).
*   **`src/store/`**: System configuration store and high-frequency canvas position caches.

## UI API & Hooks Documentation

### `useActiveRoom`
Handles room settings, presence updates, and coordinates sync.
```typescript
const { roomId, collaborators, joinRoom, leaveRoom } = useActiveRoom();
```

### `useFrameCapture`
Connects directly to the user's camera feed and streams frames via sub-workers or client-side WASM.
```typescript
const { videoRef, active, toggleCapture } = useFrameCapture({ fps: 60 });
```
