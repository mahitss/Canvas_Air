export type OnboardingStep =
  | "CameraPermission"
  | "HandCalibration"
  | "BasicGesturesTutorial"
  | "FirstAirDrawing"
  | "AIAssistedSketch"
  | "Completed";

export class FirstTimeExperience {
  private currentStep: OnboardingStep = "CameraPermission";
  private cameraPermissionGranted = false;
  private calibrated = false;

  public grantCameraPermission(): void {
    this.cameraPermissionGranted = true;
    this.currentStep = "HandCalibration";
  }

  public calibrateHand(): void {
    if (this.cameraPermissionGranted) {
      this.calibrated = true;
      this.currentStep = "BasicGesturesTutorial";
    }
  }

  /**
   * Promotes onboarding stages sequences to guide users through initial tutorials.
   */
  public advanceStep(): OnboardingStep {
    switch (this.currentStep) {
      case "BasicGesturesTutorial":
        this.currentStep = "FirstAirDrawing";
        break;
      case "FirstAirDrawing":
        this.currentStep = "AIAssistedSketch";
        break;
      case "AIAssistedSketch":
        this.currentStep = "Completed";
        break;
      default:
        break;
    }
    return this.currentStep;
  }

  public getStatus() {
    return {
      currentStep: this.currentStep,
      cameraPermissionGranted: this.cameraPermissionGranted,
      calibrated: this.calibrated
    };
  }

  public reset(): void {
    this.currentStep = "CameraPermission";
    this.cameraPermissionGranted = false;
    this.calibrated = false;
  }
}
