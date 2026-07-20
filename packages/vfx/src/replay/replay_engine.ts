export interface ReplayFrame {
  timestamp: number;
  x: number;
  y: number;
  z: number;
  width: number;
}

export class MotionReplayEngine {
  private recordedFrames: ReplayFrame[] = [];
  private replaying = false;
  private replaySpeedMultiplier = 1.0; // 0.5 for slow motion

  public startRecording(): void {
    this.recordedFrames = [];
    this.replaying = false;
  }

  public isReplaying(): boolean {
    return this.replaying;
  }

  public play(): void {
    this.replaying = true;
  }

  public recordFrame(frame: ReplayFrame): void {
    this.recordedFrames.push({ ...frame });
  }

  public getRecordedFrames(): ReplayFrame[] {
    return this.recordedFrames;
  }

  /**
   * Spawns ghost frames offsets shifted for slow-mo comparison overlays.
   */
  public generateGhostTrails(playbackIndex: number, ghostCount = 3): ReplayFrame[] {
    const ghosts: ReplayFrame[] = [];
    for (let i = 1; i <= ghostCount; i++) {
      const idx = playbackIndex - i;
      if (idx >= 0) {
        const frame = this.recordedFrames[idx]!;
        ghosts.push({
          ...frame,
          width: frame.width * (1.0 - i * 0.25) // Fade width
        });
      }
    }
    return ghosts;
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.replaySpeedMultiplier = multiplier;
  }

  public getSpeedMultiplier(): number {
    return this.replaySpeedMultiplier;
  }

  public clear(): void {
    this.recordedFrames = [];
    this.replaying = false;
  }
}
