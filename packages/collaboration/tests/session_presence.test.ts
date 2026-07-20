import { describe, it, expect } from "vitest";
import { SessionManager } from "../src/session/manager";
import { PresenceEngine } from "../src/presence/engine";
import { DocumentOperation } from "../src/types";

describe("Collaboration Session Manager & Presence Engine Extensions", () => {
  it("should manage reconnects, session timeouts, and host migrations", () => {
    const sm = new SessionManager();

    // 1. Create Session
    sm.createSession("session-1", "user-host", "Collab Space");
    const session = sm.getSession("session-1");
    expect(session).toBeDefined();
    expect(session?.ownerId).toBe("user-host");

    // Join other participants with editor and viewer roles
    sm.joinSession("session-1", "user-editor", "editor");
    sm.joinSession("session-1", "user-viewer", "viewer");

    expect(session?.roles["user-editor"]).toBe("editor");
    expect(session?.roles["user-viewer"]).toBe("viewer");

    // Log operations
    const op1: DocumentOperation = {
      elementId: "el1", action: "insert", value: {}, timestamp: Date.now(), vectorClock: 1, userId: "user-editor"
    };
    const op2: DocumentOperation = {
      elementId: "el2", action: "update", value: {}, timestamp: Date.now(), vectorClock: 2, userId: "user-editor"
    };
    sm.logOperation("session-1", op1);
    sm.logOperation("session-1", op2);

    // 2. Reconnect fetches missed sync logs
    const missed = sm.reconnect("session-1", "user-viewer", 1); // missed op 2
    expect(missed.length).toBe(1);
    expect(missed[0]?.elementId).toBe("el2");

    // 3. Timeouts drop idle users
    const presenceEditor = session?.participants["user-editor"];
    if (presenceEditor) {
      presenceEditor.lastActive = Date.now() - 10000; // set to 10s ago
    }
    sm.checkSessionTimeouts("session-1", 5000); // 5s timeout threshold
    expect(session?.participants["user-editor"]).toBeUndefined(); // should be swept/removed

    // 4. Host Migration: Host leaves, shifts owner to the highest role weight active (user-viewer is left)
    sm.leaveSession("session-1", "user-host");
    expect(session?.ownerId).toBe("user-viewer");
    expect(session?.roles["user-viewer"]).toBe("owner");
  });

  it("should update presence attributes and idle/away indicators", () => {
    const pe = new PresenceEngine();

    // Setup initial presence
    pe.updatePresence("user-1", {
      color: "#ff0000",
      currentTool: "pen",
      selectedElementIds: ["el-1", "el-2"],
      isDrawing: true,
      voiceStatus: "speaking"
    });

    const participants = pe.getParticipants();
    expect(participants.length).toBe(1);
    expect(participants[0]?.selectedElementIds).toContain("el-1");
    expect(participants[0]?.isDrawing).toBe(true);
    expect(participants[0]?.voiceStatus).toBe("speaking");
    expect(participants[0]?.status).toBe("active");

    // Simulate idle elapsed time
    const userPresence = participants[0];
    if (userPresence) {
      userPresence.lastActive = Date.now() - 5000;
    }
    pe.updateIdleStates(2000, 4000); // 2s idle, 4s away
    expect(userPresence?.status).toBe("away");

    // Reaping
    const reaped = pe.reapInactiveParticipants(3000);
    expect(reaped).toContain("user-1");
    expect(pe.getParticipants().length).toBe(0);
  });
});
