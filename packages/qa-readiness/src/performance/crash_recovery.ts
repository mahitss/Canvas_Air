export type RecoveryAction = "reinitialize" | "fallback-cpu" | "mock-provider" | "restart-render";

export class CrashRecoveryManager {
  private cameraFailuresCount = 0;
  private gpuResetsCount = 0;
  private aiFailuresCount = 0;

  /**
   * Resets driver references and swaps active adapters dynamically when exceptions occur.
   */
  public handleFailure(component: "camera" | "gpu" | "ai" | "render"): RecoveryAction {
    switch (component) {
      case "camera":
        this.cameraFailuresCount++;
        return "reinitialize";
      case "gpu":
        this.gpuResetsCount++;
        return "fallback-cpu";
      case "ai":
        this.aiFailuresCount++;
        return "mock-provider";
      default:
        return "restart-render";
    }
  }

  public getStats() {
    return {
      cameraFailures: this.cameraFailuresCount,
      gpuResets: this.gpuResetsCount,
      aiFailures: this.aiFailuresCount
    };
  }

  public clearStats(): void {
    this.cameraFailuresCount = 0;
    this.gpuResetsCount = 0;
    this.aiFailuresCount = 0;
  }
}
