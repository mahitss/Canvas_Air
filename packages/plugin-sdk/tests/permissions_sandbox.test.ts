import { describe, it, expect } from "vitest";
import { PermissionManager } from "../src/permissions/manager";
import { SandboxRuntime } from "../src/sandbox/runtime";
import { MockCanvas, MockStorage, MockNotifications } from "../src/sdk/context";

describe("Sandbox Permission & Resource Sandbox Integration", () => {
  it("should validate platform permissions, restrict context execution, enforce timeouts and memory limits", () => {
    const pm = new PermissionManager();
    const runtime = new SandboxRuntime(pm);

    // 1. Least privilege validation: reject invalid permissions
    expect(() => {
      pm.grantPermissions("test-plugin", ["Canvas", "MaliciousPermission" as any]);
    }).toThrow(/Invalid Permission Request/);

    // Grant valid permissions
    pm.grantPermissions("test-plugin", ["Canvas", "Storage"]);

    const canvas = new MockCanvas();
    const storage = new MockStorage();
    const notify = new MockNotifications();

    const context = runtime.createContext("test-plugin", canvas, storage, notify);

    // Should succeed because they are granted
    context.canvas.drawCircle(0, 0, 10);
    context.storage.setItem("key", "val");
    expect(canvas.drawCalls.length).toBe(1);

    // Revoke permissions
    pm.revokePermissions("test-plugin");
    expect(() => {
      context.canvas.drawCircle(0, 0, 10);
    }).toThrow(/Security Violation/);

    // 2. Sandbox Resource Limits - Timeout
    const slowOperation = () => {
      const start = Date.now();
      while (Date.now() - start < 15) {
        // block thread for 15ms
      }
    };

    expect(() => {
      runtime.runSafe(slowOperation, { executionTimeoutMs: 5 }); // 5ms timeout limit
    }).toThrow(/Execution Timeout/);

    // 3. Sandbox Resource Limits - Memory
    const memoryAllocatingOperation = () => {
      const arr = new Array(500000).fill("data");
      return arr.length;
    };

    // Low memory limit trigger
    expect(() => {
      runtime.runSafe(memoryAllocatingOperation, { maxMemoryLimitMb: 0.01 }); // tiny memory limit
    }).toThrow(/Memory Limit Exceeded|Plugin Sandboxed Execution Exception/);
  });
});
