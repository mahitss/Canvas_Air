export interface DiagnosticPayload {
  crashLog?: string;
  fps: number;
  gpuRenderer: string;
  cameraResolution: string;
  trackingScore: number;
  timestamp: number;
}

export class DiagnosticsCollector {
  private consentGranted = false;
  private readonly reports: DiagnosticPayload[] = [];

  public setConsent(consent: boolean): void {
    this.consentGranted = consent;
  }

  /**
   * Commits crash and performance traces when user diagnostics consents are valid.
   */
  public submitPayload(payload: DiagnosticPayload): boolean {
    if (!this.consentGranted) return false;

    this.reports.push({ ...payload, timestamp: Date.now() });
    return true;
  }

  public getReports(): DiagnosticPayload[] {
    return this.reports;
  }

  public isConsentGranted(): boolean {
    return this.consentGranted;
  }

  public clear(): void {
    this.reports.length = 0;
  }
}
