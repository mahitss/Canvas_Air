import { DocumentOperation, CanvasDocumentState } from "../types";

export interface ElementLock {
  userId: string;
  expiresAt: number;
}

export class ConflictResolver {
  private docState: CanvasDocumentState;
  private readonly elementLocks = new Map<string, ElementLock>(); // elementId -> lock info

  constructor(initialState?: CanvasDocumentState) {
    this.docState = initialState || {
      elements: {},
      tombstoneSet: [],
      version: 0
    };
  }

  public getState(): CanvasDocumentState {
    return this.docState;
  }

  /**
   * Applies an incoming document operation using LWW-Element-Set CRDT rules.
   * Handles deletion conflicts (tombstones win) and selection locks.
   */
  public applyOperation(op: DocumentOperation): boolean {
    // 1. Deletion conflict: Deletes win. If already in tombstone set, reject
    if (this.docState.tombstoneSet.includes(op.elementId)) {
      return false;
    }

    if (op.action === "delete") {
      this.docState.tombstoneSet.push(op.elementId);
      delete this.docState.elements[op.elementId];
      this.elementLocks.delete(op.elementId); // Clear locks on delete
      this.docState.version++;
      return true;
    }

    // 2. Selection conflict: Check if element is locked by another active user
    const currentLock = this.elementLocks.get(op.elementId);
    if (currentLock && currentLock.userId !== op.userId && currentLock.expiresAt > Date.now()) {
      // Locked by another user - reject edit operation
      return false;
    }

    const existing = this.docState.elements[op.elementId];
    if (!existing) {
      this.docState.elements[op.elementId] = {
        value: op.value,
        timestamp: op.timestamp,
        vectorClock: op.vectorClock,
        userId: op.userId,
        zIndex: op.value.zIndex ?? 0 // Layer tracking
      };
      this.docState.version++;
      return true;
    }

    // 3. Layer / zIndex conflict: resolve by LWW
    // Compare timestamps (LWW rule)
    if (op.timestamp > existing.timestamp) {
      this.applyUpdate(op);
      return true;
    }

    if (op.timestamp === existing.timestamp) {
      // Resolve using vectorClock sequences
      if (op.vectorClock > existing.vectorClock) {
        this.applyUpdate(op);
        return true;
      }
      
      if (op.vectorClock === existing.vectorClock) {
        // Fallback lexical sort order
        if (op.userId > existing.userId) {
          this.applyUpdate(op);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Attempts to lock an element for a specific user to prevent selection conflicts.
   */
  public acquireLock(elementId: string, userId: string, durationMs: number = 5000): boolean {
    if (this.docState.tombstoneSet.includes(elementId)) {
      return false; // Cannot lock deleted element
    }
    const currentLock = this.elementLocks.get(elementId);
    const now = Date.now();
    
    if (currentLock && currentLock.userId !== userId && currentLock.expiresAt > now) {
      return false; // Locked by someone else
    }

    this.elementLocks.set(elementId, {
      userId,
      expiresAt: now + durationMs
    });
    return true;
  }

  /**
   * Releases a lock for an element.
   */
  public releaseLock(elementId: string, userId: string): void {
    const currentLock = this.elementLocks.get(elementId);
    if (currentLock && currentLock.userId === userId) {
      this.elementLocks.delete(elementId);
    }
  }

  /**
   * Merges a remote document state into the local state.
   */
  public mergeState(remote: CanvasDocumentState): void {
    // Merge Tombstones
    for (const id of remote.tombstoneSet) {
      if (!this.docState.tombstoneSet.includes(id)) {
        this.docState.tombstoneSet.push(id);
        delete this.docState.elements[id];
      }
    }

    // Merge Elements
    for (const [id, element] of Object.entries(remote.elements)) {
      if (this.docState.tombstoneSet.includes(id)) continue;

      const local = this.docState.elements[id];
      if (!local) {
        this.docState.elements[id] = { ...element };
      } else {
        if (element.timestamp > local.timestamp) {
          this.docState.elements[id] = { ...element };
        } else if (element.timestamp === local.timestamp) {
          if (element.vectorClock > local.vectorClock) {
            this.docState.elements[id] = { ...element };
          } else if (element.vectorClock === local.vectorClock) {
            if (element.userId > local.userId) {
              this.docState.elements[id] = { ...element };
            }
          }
        }
      }
    }

    this.docState.version = Math.max(this.docState.version, remote.version) + 1;
  }

  private applyUpdate(op: DocumentOperation): void {
    this.docState.elements[op.elementId] = {
      value: op.value,
      timestamp: op.timestamp,
      vectorClock: op.vectorClock,
      userId: op.userId,
      zIndex: op.value.zIndex ?? (this.docState.elements[op.elementId]?.zIndex ?? 0)
    };
    this.docState.version++;
  }
}
