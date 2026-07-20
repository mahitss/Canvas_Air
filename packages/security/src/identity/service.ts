import { UserIdentity } from "../types";

export class IdentityService {
  private users: Map<string, UserIdentity> = new Map();
  private trustedDevices: Map<string, Set<string>> = new Map();

  public registerUser(user: UserIdentity): void {
    this.users.set(user.id, { ...user });
  }

  public getUser(userId: string): UserIdentity | null {
    return this.users.get(userId) || null;
  }

  /**
   * Registers trusted device identifiers to satisfy Zero Trust dynamic constraints.
   */
  public registerDevice(userId: string, deviceId: string): void {
    let devices = this.trustedDevices.get(userId);
    if (!devices) {
      devices = new Set();
      this.trustedDevices.set(userId, devices);
    }
    devices.add(deviceId);
  }

  public isDeviceTrusted(userId: string, deviceId: string): boolean {
    const devices = this.trustedDevices.get(userId);
    if (!devices) return false;
    return devices.has(deviceId);
  }

  public removeDevice(userId: string, deviceId: string): void {
    const devices = this.trustedDevices.get(userId);
    if (devices) {
      devices.delete(deviceId);
    }
  }

  public clearAll(): void {
    this.users.clear();
    this.trustedDevices.clear();
  }
}
export * from "../types";
export * from "../config";
