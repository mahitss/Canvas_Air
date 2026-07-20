# VisionCanvas AI: Plugin SDK & Extension Platform Documentation

The **Plugin SDK & Extension Platform** (`@visioncanvas/plugin-sdk`) provides a secure, isolated runtime environment that lets developers extend VisionCanvas AI safely without compromising performance.

---

## 1. System Pipeline Architecture

```
                       +-----------------------------------+
                       |            PluginLoader           |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |        PermissionManager          |
                       | (Authorizes access context APIs)  |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          SandboxRuntime           |
                       |    (Wraps calls in safe blocks)   |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         LifecycleManager          |
                       |  (Ticks loaded & enabled states)  |
                       +-----------------------------------+
```

---

## 2. Manifest Formats

Each extension must register a `manifest.json`:
```json
{
  "id": "neon-brush-addon",
  "name": "Neon custom brush package",
  "version": "1.0.0",
  "author": "Third Party Developer",
  "description": "Exposes vibrant dynamic lines.",
  "permissions": ["canvas_access", "notifications_access"],
  "entryPoint": "index.js",
  "supportedSdkVersion": "^1.0.0"
}
```

---

## 3. Sandboxed Facades

Plugins call methods using protected API contexts. Trying to run canvas operations without listing the `"canvas_access"` permission throws a security violation error:
$$\text{drawCircle}() \implies \operatorname{checkPermission}("canvas\_access")$$
Any unexpected crashes are caught by the `runSafe()` wrapper, avoiding crashes in core main application renderers.
