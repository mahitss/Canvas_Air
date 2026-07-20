import { Conflict, ConflictResolutionStrategy, StorageEntry } from "../types";
import { ConflictException } from "../errors";

export class LastWriteWinsStrategy implements ConflictResolutionStrategy {
  public async resolve(conflict: Conflict): Promise<StorageEntry> {
    const local = conflict.localEntry;
    const remote = conflict.remoteEntry;

    if (local.timestamp > remote.timestamp) {
      return local;
    }
    return remote;
  }
}

export class DeletionWinsStrategy implements ConflictResolutionStrategy {
  public async resolve(conflict: Conflict): Promise<StorageEntry> {
    const local = conflict.localEntry;
    const remote = conflict.remoteEntry;

    // If either local or remote is marked empty (representing deletion), return it
    if (!local.val) return local;
    if (!remote.val) return remote;

    return local.timestamp > remote.timestamp ? local : remote;
  }
}

export class MergeStrategy implements ConflictResolutionStrategy {
  public async resolve(conflict: Conflict): Promise<StorageEntry> {
    const local = conflict.localEntry;
    const remote = conflict.remoteEntry;

    try {
      const mergedVal = `${local.val};${remote.val}`;
      return {
        key: local.key,
        val: mergedVal,
        checksum: 0, // Recalculated by DB
        timestamp: Date.now()
      };
    } catch {
      throw new ConflictException("Failed to merge concurrent values");
    }
  }
}

export class ConflictResolver {
  private strategy: ConflictResolutionStrategy;

  constructor(strategy: ConflictResolutionStrategy = new LastWriteWinsStrategy()) {
    this.strategy = strategy;
  }

  public setStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategy = strategy;
  }

  public async resolveConflict(conflict: Conflict): Promise<StorageEntry> {
    return this.strategy.resolve(conflict);
  }
}
