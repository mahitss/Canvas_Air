export type GestureProfileType =
  | "Gaming"
  | "Creative"
  | "Presentation"
  | "Accessibility"
  | "Developer"
  | "Custom";

export interface GestureProfile {
  id: string;
  name: string;
  type: GestureProfileType;
  mappings: Record<string, string>;
}

export class GestureProfileManager {
  private activeProfile: GestureProfile | null = null;
  private readonly profiles = new Map<string, GestureProfile>();

  public createProfile(profile: GestureProfile): void {
    this.profiles.set(profile.id, { ...profile });
    if (!this.activeProfile) {
      this.activeProfile = profile;
    }
  }

  public activateProfile(id: string): void {
    const prof = this.profiles.get(id);
    if (!prof) {
      throw new Error(`Profile ID not found: ${id}`);
    }
    this.activeProfile = prof;
  }

  public getActiveProfile(): GestureProfile | null {
    return this.activeProfile;
  }

  public getProfile(id: string): GestureProfile | null {
    return this.profiles.get(id) || null;
  }
}
