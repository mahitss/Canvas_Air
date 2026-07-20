import { describe, it, expect, vi } from "vitest";
import { CollaborationPermissionSystem } from "../src/permissions/permission_system";
import { CollaborationCommentService } from "../src/comments/comment_service";
import { VersionManager } from "../src/history/manager";
import { OfflineRecoveryEngine } from "../src/sync/recovery";
import { CollaborationSyncEngine } from "../src/sync/sync_engine";
import { ConflictResolver } from "../src/crdt/resolver";
import { TransportAbstraction } from "../src/network/transport_abstraction";

describe("Collaboration Additional Features Suite", () => {
  it("should verify temporary permissions and invitation tokens", () => {
    const ps = new CollaborationPermissionSystem();

    // Regular authorization
    expect(ps.isAuthorized("user-1", "editor", "owner")).toBe(false);
    expect(ps.isAuthorized("user-1", "editor", "editor")).toBe(true);

    // Grant temporary permission
    ps.grantTemporaryPermission("user-1", "owner", 5000);
    expect(ps.isAuthorized("user-1", "editor", "owner")).toBe(true);

    // Invitation token
    const token = ps.createInvitationToken("editor", 10000, 2);
    expect(token).toBeDefined();

    const role = ps.useInvitationToken(token);
    expect(role).toBe("editor");

    // Consume second time
    ps.useInvitationToken(token);
    
    // Expect failure on third try
    expect(() => ps.useInvitationToken(token)).toThrow(/limits exceeded/);
  });

  it("should process comment threads, replies, and mentions", () => {
    const cs = new CollaborationCommentService();

    const comment = cs.addComment("Hey @alice check this zIndex coordinate anchor", "user-1", {
      coords: { x: 50, y: 75 }
    });

    expect(comment.mentions).toContain("alice");
    expect(comment.anchorCoords?.x).toBe(50);
    expect(comment.resolved).toBe(false);

    // Add reply
    const reply = cs.addReply(comment.id, "Acknowledged @user-1", "alice");
    expect(comment.replies.length).toBe(1);
    expect(reply.mentions).toContain("user-1");

    // Resolve
    cs.resolveComment(comment.id, "alice");
    expect(comment.resolved).toBe(true);
    expect(comment.resolvedBy).toBe("alice");
  });

  it("should verify version naming and branch histories in VersionManager", () => {
    const vm = new VersionManager();

    const docState = {
      elements: { "elem-1": { value: "val1" } },
      tombstoneSet: [],
      version: 1
    };

    vm.saveSnapshot(1, docState, "user-owner", "Initial Commit", "main");
    vm.nameVersion("v1-release", 1);

    const restored = vm.getVersionByName("v1-release");
    expect(restored).toBeDefined();
    expect(restored?.elements["elem-1"].value).toBe("val1");

    // Branch history checks
    vm.createBranch("feature-x", 1);
    const branchHistory = vm.getBranchHistory("feature-x");
    expect(branchHistory).toContain(1);

    const timeline = vm.getTimeline();
    expect(timeline.length).toBe(1);
    expect(timeline[0]?.userId).toBe("user-owner");
  });

  it("should test OfflineRecoveryEngine", async () => {
    const resolver = new ConflictResolver();
    const mockNetwork = { send: vi.fn().mockResolvedValue(true) };
    const sync = new CollaborationSyncEngine(resolver, mockNetwork);
    const recovery = new OfflineRecoveryEngine(sync);

    expect(recovery.isOnline()).toBe(true);
    recovery.disconnect();
    expect(recovery.isOnline()).toBe(false);

    // Submit operation while disconnected
    await sync.submitOperation({
      elementId: "test", action: "insert", value: {}, timestamp: Date.now(), vectorClock: 1, userId: "A"
    }, false);

    expect(sync.getOfflineQueue().length).toBe(1);

    // Reconnect
    await recovery.reconnect();
    expect(recovery.isOnline()).toBe(true);
    expect(sync.getOfflineQueue().length).toBe(0); // auto-flushed
    expect(mockNetwork.send).toHaveBeenCalled();
  });

  it("should verify transport fallbacks and heartbeat checkups", () => {
    vi.useFakeTimers();
    const transport = new TransportAbstraction({
      wsUrl: "ws://localhost:8080",
      pingIntervalMs: 2000
    });

    expect(transport.getActiveTransport()).toBe("WebSocket");

    transport.connect();
    expect(transport.getIsConnected()).toBe(true);

    // Simulate connection failure -> fallback WebRTC
    transport.handleConnectionError();
    expect(transport.getActiveTransport()).toBe("WebRTC");

    // Fallback WebRTC to LongPolling
    transport.handleConnectionError();
    expect(transport.getActiveTransport()).toBe("LongPolling");

    transport.disconnect();
    vi.useRealTimers();
  });
});
