import { ReleaseChannel } from "../types";

interface ReleaseRecord {
  version: string;
  artifactId: string;
  publishedAt: number;
}

export class ReleaseManager {
  private history: Map<ReleaseChannel, ReleaseRecord[]> = new Map();

  /**
   * Registers a new channel release version.
   */
  public publish(channel: ReleaseChannel, version: string, artifactId: string): void {
    let records = this.history.get(channel);
    if (!records) {
      records = [];
      this.history.set(channel, records);
    }
    
    records.push({
      version,
      artifactId,
      publishedAt: Date.now()
    });
  }

  public getActiveVersion(channel: ReleaseChannel): string | null {
    const records = this.history.get(channel);
    if (!records || records.length === 0) return null;
    const last = records[records.length - 1];
    return last ? last.version : null;
  }

  /**
   * Safe rollback mechanism: deletes latest update registration and restores previous version.
   */
  public rollback(channel: ReleaseChannel): string | null {
    const records = this.history.get(channel);
    if (!records || records.length <= 1) {
      // Cannot rollback if zero or only single base release exists
      return null;
    }

    records.pop(); // Remove latest update
    const active = records[records.length - 1];
    return active ? active.version : null;
  }

  public clearHistory(): void {
    this.history.clear();
  }
}
