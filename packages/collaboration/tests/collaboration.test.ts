import { describe, it, expect, beforeEach } from "vitest";
import { CollaborationEngine } from "../src/engine";
import { MockNetworkTransport } from "../src/network/transport";
import { DocumentOperation, ParticipantPresence } from "../src/types";

describe("Real-Time Collaboration Engine System", () => {
  let transport: MockNetworkTransport;
  let engine: CollaborationEngine;
  const sessionId = "collab-session-123";

  beforeEach(() => {
    transport = new MockNetworkTransport();
    engine = new CollaborationEngine(transport);
    engine.createSession(sessionId, "user-owner");
  });

  it("should register participants and track coordinate positions", () => {
    engine.joinSession(sessionId, "user-owner", "owner");
    
    // Broadcast cursor position update
    engine.broadcastPresence(sessionId, "user-owner", {
      cursor: { x: 15, y: 30 },
      color: "#ff00bb",
      currentTool: "laser"
    });

    const participants = engine.getPresenceEngine().getParticipants();
    expect(participants.length).toBe(1);
    
    const owner = participants.find(p => p.userId === "user-owner");
    expect(owner?.cursor.x).toBe(15);
    expect(owner?.color).toBe("#ff00bb");
  });

  it("should enforce participant permission roles check", () => {
    engine.joinSession(sessionId, "user-editor", "editor");
    engine.joinSession(sessionId, "user-viewer", "viewer");

    const strokeOp: DocumentOperation = {
      elementId: "element-stroke-1",
      action: "insert",
      value: { points: [0, 0, 10, 10] },
      timestamp: Date.now(),
      vectorClock: 1,
      userId: "user-editor"
    };

    // Editor should be allowed to sync modifications
    expect(() => {
      engine.syncOperation(sessionId, "user-editor", strokeOp);
    }).not.toThrow();

    // Viewer should be blocked from syncing modifications
    expect(() => {
      engine.syncOperation(sessionId, "user-viewer", strokeOp);
    }).toThrow(/Permission Denied/);
  });

  it("should merge concurrent shape operations based on LWW CRDT rules", () => {
    engine.joinSession(sessionId, "user-editor", "editor");

    const opA: DocumentOperation = {
      elementId: "circle-shape",
      action: "insert",
      value: { radius: 10 },
      timestamp: 1000,
      vectorClock: 1,
      userId: "user-editor"
    };

    const opB: DocumentOperation = {
      elementId: "circle-shape",
      action: "update",
      value: { radius: 25 },
      timestamp: 2000, // Higher timestamp wins (LWW)
      vectorClock: 2,
      userId: "user-editor"
    };

    const resolver = engine.getConflictResolver();
    
    resolver.applyOperation(opA);
    resolver.applyOperation(opB);

    const elements = resolver.getState().elements;
    expect(elements["circle-shape"].value.radius).toBe(25);
  });

  it("should save and restore version snapshots", () => {
    const resolver = engine.getConflictResolver();
    const vm = engine.getVersionManager();

    const op: DocumentOperation = {
      elementId: "line-element",
      action: "insert",
      value: { len: 50 },
      timestamp: Date.now(),
      vectorClock: 1,
      userId: "user-owner"
    };

    resolver.applyOperation(op);

    // Save snapshot at version 1
    vm.saveSnapshot(1, resolver.getState());

    // Modify document state
    resolver.applyOperation({
      elementId: "line-element",
      action: "update",
      value: { len: 100 },
      timestamp: Date.now() + 10,
      vectorClock: 2,
      userId: "user-owner"
    });

    expect(resolver.getState().elements["line-element"].value.len).toBe(100);

    // Restore to version 1 snapshot
    const restored = vm.restoreSnapshot(1);
    expect(restored).toBeDefined();
    expect(restored?.elements["line-element"].value.len).toBe(50);
  });
});
