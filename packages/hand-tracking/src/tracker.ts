import { IHandTracker } from "./interfaces";
import { HandPresence, HandType, JointName, HandLandmark } from "./types";

interface TrackState {
  id: string;
  type: HandType;
  lastLandmarks: Record<JointName, HandLandmark>;
  lastTimestamp: number;
}

/**
 * Production-quality Spatial Hand Tracker.
 * Manages identity continuity using nearest-neighbor Euclidean distance mapping and age-out registers.
 */
export class HandTracker implements IHandTracker {
  private activeTracks: Map<string, TrackState> = new Map();
  private trackCounters: Record<HandType, number> = { left: 0, right: 0 };
  private readonly maxTrackAgeMs = 500; // Keep track alive for up to 500ms after occlusion
  private readonly maxMatchDistance = 0.2; // Maximum distance to keep the same hand ID (normalized coordinates)

  public track(hands: HandPresence[]): HandPresence[] {
    const now = Date.now();
    const result: HandPresence[] = [];

    // 1. Clean up stale tracks that exceeded max age
    for (const [id, state] of this.activeTracks.entries()) {
      if (now - state.lastTimestamp > this.maxTrackAgeMs) {
        this.activeTracks.delete(id);
      }
    }

    // 2. Map distances between detections and active tracks of matching handedness
    const candidates: Array<{ detIdx: number; trackId: string; dist: number }> = [];

    hands.forEach((det, detIdx) => {
      for (const [trackId, track] of this.activeTracks.entries()) {
        if (det.type === track.type) {
          const dist = this.calculateDistance(det.landmarks.wrist, track.lastLandmarks.wrist);
          if (dist < this.maxMatchDistance) {
            candidates.push({ detIdx, trackId, dist });
          }
        }
      }
    });

    // 3. Sort candidates by distance ascending
    candidates.sort((a, b) => a.dist - b.dist);

    const matchedDets = new Set<number>();
    const matchedTracks = new Set<string>();

    // 4. Resolve identity matches (greedy nearest neighbor association)
    for (const cand of candidates) {
      if (!matchedDets.has(cand.detIdx) && !matchedTracks.has(cand.trackId)) {
        matchedDets.add(cand.detIdx);
        matchedTracks.add(cand.trackId);

        const det = hands[cand.detIdx]!;
        const track = this.activeTracks.get(cand.trackId)!;

        // Assign stable ID
        const updatedHand: HandPresence = {
          ...det,
          id: track.id
        };
        result.push(updatedHand);

        // Update tracking state
        this.activeTracks.set(track.id, {
          id: track.id,
          type: det.type,
          lastLandmarks: det.landmarks,
          lastTimestamp: now
        });
      }
    }

    // 5. Initialize new tracks for unmatched detections
    hands.forEach((det, detIdx) => {
      if (!matchedDets.has(detIdx)) {
        this.trackCounters[det.type]++;
        const stableId = `hand-${det.type}-${this.trackCounters[det.type]}`;

        const updatedHand: HandPresence = {
          ...det,
          id: stableId
        };
        result.push(updatedHand);

        // Save new track state
        this.activeTracks.set(stableId, {
          id: stableId,
          type: det.type,
          lastLandmarks: det.landmarks,
          lastTimestamp: now
        });
      }
    });

    return result;
  }

  private calculateDistance(a: HandLandmark, b: HandLandmark): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }
}
