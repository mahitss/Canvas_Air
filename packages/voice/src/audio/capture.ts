import { IAudioCaptureService, AudioDeviceInfo, AudioFrame } from "../interfaces";

/**
 * Audio Capture Service handles microphone enumeration, stream starting, pause/resumes,
 * frame timestamping, root mean square audio level monitoring, and hot-disconnect handlers.
 */
export class AudioCaptureService implements IAudioCaptureService {
  private preferredDeviceId: string | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isStreamActive = false;
  private isStreamPaused = false;
  private disconnectListener: (() => void) | null = null;

  // Mock streaming fallback for test runs and headless pipelines
  private mockIntervalId: any = null;

  public async enumerateDevices(): Promise<AudioDeviceInfo[]> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      // Node fallback mode
      return [
        { deviceId: "default", label: "Default Microphone (Mocked)" },
        { deviceId: "external-mic", label: "Studio External Mic (Mocked)" }
      ];
    }

    try {
      // Trigger permission query if labels are empty
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(d => d.kind === "audioinput");
      
      return audioInputDevices.map(d => ({
        deviceId: d.deviceId || "default",
        label: d.label || `Microphone (${d.deviceId})`
      }));
    } catch {
      return [{ deviceId: "default", label: "Default System Microphone" }];
    }
  }

  public selectDevice(deviceId: string): void {
    this.preferredDeviceId = deviceId;
    if (this.isStreamActive) {
      // Restart streaming to switch active devices immediately
      this.stopStreaming();
    }
  }

  public getPreferredDeviceId(): string | null {
    return this.preferredDeviceId;
  }

  public async startStreaming(
    onFrame: (frame: AudioFrame) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    if (this.isStreamActive) return;

    this.isStreamActive = true;
    this.isStreamPaused = false;

    // Set up disconnect handler
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.mediaDevices) {
      this.disconnectListener = () => {
        // Double check if device still exists
        this.enumerateDevices().then(devices => {
          const activeDeviceExists = devices.some(d => d.deviceId === this.preferredDeviceId);
          if (!activeDeviceExists && this.isStreamActive) {
            this.stopStreaming();
            onError(new Error("Active audio recording device has been disconnected."));
          }
        });
      };
      navigator.mediaDevices.addEventListener("devicechange", this.disconnectListener);
    }

    // Browser real streaming setup
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof (window as any).AudioContext !== "undefined"
    ) {
      try {
        const constraints: MediaStreamConstraints = {
          audio: this.preferredDeviceId ? { deviceId: { exact: this.preferredDeviceId } } : true
        };
        const acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.stream = acquiredStream;

        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContextClass();
        this.audioContext = context;
        
        const source = context.createMediaStreamSource(acquiredStream);
        this.sourceNode = source;

        // We use ScriptProcessorNode for standard cross-browser compatibility wrapper
        const processor = context.createScriptProcessor(1024, 1, 1);
        this.processorNode = processor;
        
        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          if (this.isStreamPaused) return;

          const channelData = e.inputBuffer.getChannelData(0);
          const level = this.calculateRMS(channelData);

          const rawBuffer = new Float32Array(channelData.length);
          rawBuffer.set(channelData);

          onFrame({
            data: rawBuffer,
            timestamp: Date.now(),
            audioLevel: level
          });
        };

        source.connect(processor);
        processor.connect(context.destination);
      } catch (err) {
        this.isStreamActive = false;
        onError(err instanceof Error ? err : new Error("Could not acquire microphone stream."));
      }
    } else {
      // Headless / Test mock interval simulation
      let phase = 0;
      this.mockIntervalId = setInterval(() => {
        if (this.isStreamPaused) return;

        const buffer = new Float32Array(1024);
        for (let i = 0; i < buffer.length; i++) {
          // Generate a smooth sinusoidal wave simulated frame
          buffer[i] = Math.sin(phase + i * 0.05) * 0.4;
        }
        phase += 1.0;

        const level = this.calculateRMS(buffer);

        onFrame({
          data: buffer,
          timestamp: Date.now(),
          audioLevel: level
        });
      }, 50);
    }
  }

  public stopStreaming(): void {
    if (!this.isStreamActive) return;

    // Remove event listener
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      this.disconnectListener
    ) {
      navigator.mediaDevices.removeEventListener("devicechange", this.disconnectListener);
      this.disconnectListener = null;
    }

    // Stop mock pipeline
    if (this.mockIntervalId) {
      clearInterval(this.mockIntervalId);
      this.mockIntervalId = null;
    }

    // Stop browser MediaStream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clean connections
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isStreamActive = false;
    this.isStreamPaused = false;
  }

  public pauseStreaming(): void {
    if (this.isStreamActive) {
      this.isStreamPaused = true;
    }
  }

  public resumeStreaming(): void {
    if (this.isStreamActive) {
      this.isStreamPaused = false;
    }
  }

  public isCapturing(): boolean {
    return this.isStreamActive && !this.isStreamPaused;
  }

  /**
   * Root Mean Square (RMS) calculation for volume level checking.
   */
  private calculateRMS(data: Float32Array): number {
    if (data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const sample = data[i];
      if (sample !== undefined) {
        sum += sample * sample;
      }
    }
    return Math.sqrt(sum / data.length);
  }
}
