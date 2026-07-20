import { ISpatialDeviceProvider } from "../interfaces";
import { DeviceException } from "../errors";

export class DefaultSpatialDeviceProvider implements ISpatialDeviceProvider {
  public readonly id = "default-webxr-provider";
  public readonly name = "Default WebXR Device Framework";
  public readonly type = "WebXR" as const;
  private initialized = false;
  private connected = false;

  public async initialize(): Promise<void> {
    this.initialized = true;
  }

  public async connect(): Promise<void> {
    if (!this.initialized) {
      throw new DeviceException("Device provider must be initialized before connecting");
    }
    this.connected = true;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public async health(): Promise<"healthy" | "degraded" | "down"> {
    if (!this.initialized) return "down";
    return this.connected ? "healthy" : "degraded";
  }

  public async dispose(): Promise<void> {
    this.connected = false;
    this.initialized = false;
  }
}

export class SpatialDeviceRegistry {
  private readonly providers = new Map<string, ISpatialDeviceProvider>();
  private activeProviderId: string | null = null;

  public register(provider: ISpatialDeviceProvider): void {
    this.providers.set(provider.id, provider);
    if (!this.activeProviderId) {
      this.activeProviderId = provider.id;
    }
  }

  public getActiveProvider(): ISpatialDeviceProvider | null {
    return this.activeProviderId ? this.providers.get(this.activeProviderId) || null : null;
  }

  public selectActiveProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new DeviceException(`Unregistered device provider: ${id}`);
    }
    this.activeProviderId = id;
  }
}
