# VisionCanvas AI: Enterprise API Specifications
## OpenAPI & Interface Reference Guide

---

## 1. Authentication REST API

### 1.1 POST /api/v1/auth/login
*   **Description**: Authenticates user credentials and issues a signed JSON Web Token (JWT).
*   **Authentication**: None.
*   **Authorization**: Public.
*   **Rate Limits**: 10 requests per minute per IP.
*   **Request Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "email": { "type": "string", "format": "email" },
        "secret": { "type": "string", "minLength": 8 }
      },
      "required": ["email", "secret"]
    }
    ```
*   **Response Schema (200 OK)**:
    ```json
    {
      "type": "object",
      "properties": {
        "success": { "type": "boolean" },
        "token": { "type": "string" }
      },
      "required": ["success", "token"]
    }
    ```
*   **Errors**:
    *   `400 Bad Request`: Invalid email format.
    *   `401 Unauthorized`: Invalid credentials.
*   **Example Request**:
    ```bash
    curl -X POST https://api.visioncanvas.ai/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"developer@visioncanvas.ai", "secret":"passkey-secret-key-123"}'
    ```
*   **Example Response**:
    ```json
    {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoiZGV2ZWxvcGVyQHZpc2lvbmNhbnZhcy5haSIsInJvbGVzIjpbImVkaXRvciJdLCJleHAiOjE3ODQ5MDkyMDB9.sig-hash-signed"
    }
    ```

---

## 2. Collaboration WebSocket API

### 2.1 Channel: ws://api.visioncanvas.ai/ws/v1/session/{sessionId}
*   **Description**: Establishes a real-time collaborative state-merging WebSocket tunnel.
*   **Authentication**: Bearer JWT passed in query string `?token=...` or headers.
*   **Authorization**: User must hold `editor` or `owner` role.
*   **Rate Limits**: 120 message broadcasts per minute per socket.

### 2.2 Event: CLIENT_CURSOR_BROADCAST
*   **Direction**: Client to Server (Broadcasted to all room peers).
*   **Request Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "event": { "type": "string", "enum": ["client_cursor"] },
        "userId": { "type": "string" },
        "x": { "type": "number" },
        "y": { "type": "number" }
      },
      "required": ["event", "userId", "x", "y"]
    }
    ```
*   **Example Payload**:
    ```json
    {
      "event": "client_cursor",
      "userId": "user-123",
      "x": 340.5,
      "y": 120.4
    }
    ```

---

## 3. AI Sketch-to-Diagram gRPC API

### 3.1 Service: DiagramGenerator
*   **Description**: Translates raw gesture-coordinates streams into snapped diagram structures.
*   **Authentication**: JWT Token passed inside metadata key `authorization`.
*   **Authorization**: Requires `ai_inference` permission.
*   **Rate Limits**: 30 requests per minute per user.

### 3.2 Method: TranslateSketch
*   **Protobuf Contract**:
    ```protobuf
    syntax = "proto3";

    package visioncanvas.ai.v1;

    service DiagramGenerator {
      rpc TranslateSketch(SketchRequest) returns (SketchResponse);
    }

    message Point2D {
      float x = 1;
      float y = 2;
    }

    message Stroke {
      repeated Point2D points = 1;
    }

    message SketchRequest {
      repeated Stroke strokes = 1;
      string model_id = 2;
    }

    message DiagramNode {
      string id = 1;
      string type = 2;
      float x = 3;
      float y = 4;
      float width = 5;
      float height = 6;
    }

    message SketchResponse {
      bool success = 1;
      repeated DiagramNode nodes = 2;
      float confidence = 3;
    }
    ```
*   **Errors**:
    *   `16 UNAUTHENTICATED`: Token is missing or expired.
    *   `3 INVALID_ARGUMENT`: Empty stroke arrays.
*   **Example Request Metadata**:
    ```
    authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
    ```

---

## 4. Internal Service APIs

### 4.1 Internal API: SecretsManager.rotateKey
*   **Description**: Rotates the secret keys vault.
*   **Authentication**: Internal system token verification.
*   **Authorization**: System administrators only.
*   **Request Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "newSaltKey": { "type": "string", "minLength": 16 }
      },
      "required": ["newSaltKey"]
    }
    ```
*   **Response Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "rotated": { "type": "boolean" },
        "timestamp": { "type": "number" }
      },
      "required": ["rotated", "timestamp"]
    }
    ```

---

## 5. Plugin API Contracts

### 5.1 Callback: Plugin.draw(context)
*   **Description**: Extension hook called on every draw tick inside Web Worker context.
*   **Authentication**: Sandbox verification token checks.
*   **Authorization**: Declared permissions inside manifest.json (requires `canvas_write`).
*   **Interface Contract**:
    ```typescript
    export interface CanvasRenderingProxy {
      beginPath(): void;
      moveTo(x: number, y: number): void;
      lineTo(x: number, y: number): void;
      stroke(): void;
      fillRect(x: number, y: number, w: number, h: number): void;
    }

    export interface PluginContract {
      onInit(sdk: any): Promise<void>;
      draw(ctx: CanvasRenderingProxy): void;
    }
    ```

---

## 6. Cloud Sync REST API

### 6.1 POST /api/v1/sync/replicate
*   **Description**: Pushes offline buffered data changes to the cloud databases.
*   **Authentication**: Bearer JWT.
*   **Authorization**: Scoped to user workspace editors.
*   **Rate Limits**: 60 requests per minute.
*   **Request Schema**:
    ```json
    {
      "type": "object",
      "properties": {
        "changes": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "key": { "type": "string" },
              "val": { "type": "string" },
              "timestamp": { "type": "number" }
            },
            "required": ["key", "val", "timestamp"]
          }
        }
      },
      "required": ["changes"]
    }
    ```
*   **Response Schema (200 OK)**:
    ```json
    {
      "type": "object",
      "properties": {
        "replicatedCount": { "type": "number" },
        "serverVectorClock": { "type": "number" }
      },
      "required": ["replicatedCount", "serverVectorClock"]
    }
    ```
*   **Example Request**:
    ```bash
    curl -X POST https://api.visioncanvas.ai/api/v1/sync/replicate \
      -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..." \
      -H "Content-Type: application/json" \
      -d '{"changes":[{"key":"layer-1","val":"serialized-crdt-string","timestamp":1784909200}]}'
    ```
