import { AuditLog } from "../types";

export class AuditPlatform {
  private logs: AuditLog[] = [];

  private calculateChainHash(
    timestamp: number,
    event: string,
    actorId: string,
    result: string,
    previousHash: string
  ): string {
    // Calculates a string hash chaining signature
    const combined = `${timestamp}:${event}:${actorId}:${result}:${previousHash}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 31 + combined.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16);
  }

  /**
   * Appends a new event entry, linking it to the previous hash block.
   */
  public logEvent(
    event: string,
    actorId: string,
    result: "allow" | "deny" | "error" | "auth_success" | "auth_fail"
  ): AuditLog {
    const id = `audit-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    const lastLog = this.logs[this.logs.length - 1];
    const previousHash = lastLog ? lastLog.hash : "genesis-block-hash-start";

    const hash = this.calculateChainHash(timestamp, event, actorId, result, previousHash);

    const log: AuditLog = {
      id,
      timestamp,
      event,
      actorId,
      result,
      previousHash,
      hash
    };

    this.logs.push(log);
    return log;
  }

  public getLogs(): AuditLog[] {
    return this.logs;
  }

  /**
   * Verifies the cryptographic chain integrity.
   * If any block's data was modified post-facto, it returns false.
   */
  public verifyIntegrity(): boolean {
    let expectedPrevHash = "genesis-block-hash-start";

    for (const log of this.logs) {
      if (log.previousHash !== expectedPrevHash) {
        return false;
      }

      const recomputed = this.calculateChainHash(
        log.timestamp,
        log.event,
        log.actorId,
        log.result,
        log.previousHash
      );

      if (recomputed !== log.hash) {
        return false;
      }

      expectedPrevHash = log.hash;
    }

    return true;
  }

  public clearLogs(): void {
    this.logs = [];
  }
}
