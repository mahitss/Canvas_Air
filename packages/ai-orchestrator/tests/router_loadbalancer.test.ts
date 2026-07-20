import { describe, it, expect } from "vitest";
import { ModuleRegistry } from "../src/registry/module_registry";
import { EngineRouter } from "../src/router/engine_router";
import { AiModule, AiTask } from "../src/types";

describe("AI Task Routing and Load Balancing", () => {
  it("should filter candidates by version/health/latency policies and route requests using load balance strategies", async () => {
    const registry = new ModuleRegistry();
    const router = new EngineRouter(registry);

    // 1. Setup multiple handwriting provider engines
    const providerV1: AiModule = {
      name: "HW-Legacy",
      capabilities: ["handwriting"],
      execute: async () => "legacy-out",
      healthCheck: async () => true,
      version: "1.0.0",
      priority: 10,
      status: "healthy",
      metadata: { latencyScoreMs: 15 }
    };

    const providerV2: AiModule = {
      name: "HW-Modern",
      capabilities: ["handwriting"],
      execute: async () => "modern-out",
      healthCheck: async () => true,
      version: "2.0.0",
      priority: 20,
      status: "healthy",
      metadata: { latencyScoreMs: 40 }
    };

    const providerV3: AiModule = {
      name: "HW-Degraded",
      capabilities: ["handwriting"],
      execute: async () => "degraded-out",
      healthCheck: async () => true,
      version: "2.1.0",
      priority: 30,
      status: "degraded",
      metadata: { latencyScoreMs: 200 }
    };

    registry.register(providerV1);
    registry.register(providerV2);
    registry.register(providerV3);

    const task: AiTask = {
      id: "task-route",
      name: "handwriting",
      priority: "high",
      payload: {},
      status: "pending",
      timeoutMs: 1000,
      retryLimit: 1,
      retryCount: 0,
      createdAt: Date.now()
    };

    // --- TEST 1: Version compatibility routing policy ---
    router.registerPolicy("handwriting", {
      strategy: "HealthAware",
      minVersion: "1.5.0", // excludes HW-Legacy (1.0.0)
      allowDegraded: false // excludes HW-Degraded
    });

    // Executor spy simulating slow HW-Modern execution
    let lastUsedModule = "";
    const executor = async (mod: AiModule, t: AiTask) => {
      lastUsedModule = mod.name;
      if (mod.name === "HW-Modern") {
        await new Promise(res => setTimeout(res, 30)); // 30ms latency (greater than 20ms max)
      }
      return mod.execute(t);
    };

    // Execute routing
    await router.routeRequest("handwriting", task, executor);
    expect(lastUsedModule).toBe("HW-Modern"); // Only HW-Modern is compatible

    // --- TEST 2: Latency limit policy ---
    router.registerPolicy("handwriting", {
      strategy: "HealthAware",
      maxLatencyMs: 20 // Only HW-Legacy satisfies this (15ms static vs 30ms dynamic for Modern)
    });

    await router.routeRequest("handwriting", task, executor);
    expect(lastUsedModule).toBe("HW-Legacy");

    // --- TEST 3: Load Balancing strategies - Round Robin ---
    router.registerPolicy("handwriting", {
      strategy: "RoundRobin"
    });

    const choices: string[] = [];
    const runAndRecord = async () => {
      await router.routeRequest("handwriting", task, async (mod) => {
        choices.push(mod.name);
        return "ok";
      });
    };

    // Cycle through candidates (HW-Legacy and HW-Modern since they are healthy)
    await runAndRecord();
    await runAndRecord();
    await runAndRecord();

    expect(choices[0]).not.toBe(choices[1]); // alternating
    expect(choices[2]).toBe(choices[0]); // rotated back

    // --- TEST 4: Load Balancing strategies - Least Busy ---
    router.registerPolicy("handwriting", {
      strategy: "LeastBusy"
    });

    const lb = router.getLoadBalancer();
    // Simulate high active load on modern
    lb.incrementLoad("HW-Modern");
    lb.incrementLoad("HW-Modern");

    // Should choose legacy since it is least busy (0 active vs 2 active)
    let selected = lb.selectProvider("handwriting", [providerV1, providerV2], "LeastBusy");
    expect(selected?.name).toBe("HW-Legacy");

    // Clear loads
    lb.decrementLoad("HW-Modern");
    lb.decrementLoad("HW-Modern");

    // --- TEST 5: Load Balancing strategies - Latency Based ---
    selected = lb.selectProvider("handwriting", [providerV1, providerV2, providerV3], "LatencyBased");
    expect(selected?.name).toBe("HW-Legacy"); // 15ms latency < 40ms < 200ms
  });
});
