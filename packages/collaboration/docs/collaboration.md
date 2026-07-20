# VisionCanvas AI: Real-Time Collaboration SDK Documentation

The **Real-Time Collaboration Engine** (`@visioncanvas/collaboration`) handles concurrent multi-user interactions. It merges canvas elements based on a Last-Write-Wins (LWW) conflict-free replicated data type (CRDT) model, coordinates participant presence cursors, gates action permissions, and provides transport-agnostic synchronization broadcasts.

---

## 1. System Pipeline Architecture

```
                       +-----------------------------------+
                       |        CollaborationEngine        |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |         ConflictResolver          |
                       |       (LWW CRDT operations)       |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          PresenceEngine           |
                       |   (Cursor positions & viewport)   |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------+-----------------+
                       |          SessionManager           |
                       |    (Roles privileges check)       |
                       +-----------------------------------+
```

---

## 2. Hybrid LWW-CRDT Conflict Resolver Heuristics

For concurrent updates matching target element ID $ID_e$, value $V_i$, execution timestamp $T_i$, and sequence vectorClock $VC_i$:
*   `T_a > T_b`: highest timestamp wins.
*   `T_a = T_b`: highest vectorClock sequence wins.
*   `T_a = T_b` and `VC_a = VC_b`: lexical sort order on user IDs acts as final tiebreaker.
*   Deleted elements are pushed to a `tombstoneSet`. Any updates targeting elements inside the tombstone set are ignored:
    $$\text{Apply}(Op) \implies \text{rejected} \quad \text{if } ID_e \in \text{tombstoneSet}$$

---

## 3. Network Transport Abstraction

The engine accepts any network transport interface that conforms to:
```typescript
export interface NetworkTransport {
  broadcast(event: string, payload: any): void;
  sendTo(userId: string, event: string, payload: any): void;
  on(event: string, callback: (payload: any) => void): void;
}
```
Mocks are provided in `packages/collaboration/src/network/transport.ts` for offline and headless testing.
