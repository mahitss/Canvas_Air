import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CameraPermissionService } from "../src/permission";

describe("Camera Permission Service", () => {
  let permissionService: CameraPermissionService;
  let mockQuery: any;
  let mockGetUserMedia: any;
  let mockStatus: any;

  beforeEach(() => {
    mockStatus = {
      state: "prompt",
      onchange: null
    };

    mockQuery = vi.fn().mockResolvedValue(mockStatus);
    mockGetUserMedia = vi.fn();

    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {
      permissions: {
        query: mockQuery
      },
      mediaDevices: {
        getUserMedia: mockGetUserMedia
      }
    });

    permissionService = new CameraPermissionService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should query and map permission prompt status to PermissionUnknown", async () => {
    const state = await permissionService.queryState();
    expect(state).toBe("PermissionUnknown");
    expect(mockQuery).toHaveBeenCalledWith({ name: "camera" });
  });

  it("should query and map permission granted status to PermissionGranted", async () => {
    mockStatus.state = "granted";
    const state = await permissionService.queryState();
    expect(state).toBe("PermissionGranted");
  });

  it("should trigger state update callbacks on permission change events", async () => {
    const changeSpy = vi.fn();
    permissionService.onStateChange(changeSpy);

    // Re-initialize to bind mockStatus state listener
    const service = new CameraPermissionService();
    service.onStateChange(changeSpy);

    // Wait microtask tick for query promise resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockStatus.onchange).toBeDefined();
    mockStatus.state = "granted";
    mockStatus.onchange();

    expect(changeSpy).toHaveBeenCalledWith("PermissionGranted");
  });

  it("should resolve PermissionGranted if getUserMedia call succeeds", async () => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    });

    const result = await permissionService.requestPermission();
    expect(result).toBe("PermissionGranted");
  });

  it("should resolve PermissionDenied if getUserMedia call throws NotAllowedError", async () => {
    const error = new Error("Permission rejected");
    error.name = "NotAllowedError";
    mockGetUserMedia.mockRejectedValue(error);

    const result = await permissionService.requestPermission();
    expect(result).toBe("PermissionDenied");
  });
});
