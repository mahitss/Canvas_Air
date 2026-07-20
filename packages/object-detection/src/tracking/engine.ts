import { DetectedObject, ObjectTrajectory } from "../types";
import { DEFAULT_DETECTION_CONFIG } from "../config";

export interface OccludedObject {
  trackingId: string;
  label: string;
  predictedPath: { x: number; y: number };
  framesOccluded: number;
}

export class TrackingEngine {
  private trajectories: Map<string, ObjectTrajectory> = new Map();
  private occludedObjects = new Map<string, OccludedObject>();
  private maxHistory: number;
  private trackDistThreshold = 120;
  private maxOcclusionFrames = 3;

  constructor(maxHistory: number = DEFAULT_DETECTION_CONFIG.maxTrackHistoryFrames) {
    this.maxHistory = maxHistory;
  }

  public getTrajectories(): Map<string, ObjectTrajectory> {
    return this.trajectories;
  }

  /**
   * Tracks multiple moving objects across frames, predicting paths, recovering from occlusions,
   * and assigning persistent tracking IDs.
   */
  public trackObjects(newDetections: DetectedObject[]): DetectedObject[] {
    const updated: DetectedObject[] = [];
    const timestamp = Date.now();
    const matchedTrackIds = new Set<string>();

    for (const det of newDetections) {
      const centerX = det.x + det.w / 2;
      const centerY = det.y + det.h / 2;

      let bestTrackingId: string | null = null;
      let minDistance = Infinity;

      // 1. Search in active trajectories
      for (const [trackingId, traj] of this.trajectories.entries()) {
        if (traj.label !== det.label) continue;

        const predictedPos = this.predictMotion(traj);
        const dist = Math.hypot(centerX - predictedPos.x, centerY - predictedPos.y);

        if (dist < minDistance && dist <= this.trackDistThreshold) {
          minDistance = dist;
          bestTrackingId = trackingId;
        }
      }

      // 2. Search in occluded objects for Re-identification
      if (!bestTrackingId) {
        for (const [trackingId, occluded] of this.occludedObjects.entries()) {
          if (occluded.label !== det.label) continue;

          const dist = Math.hypot(centerX - occluded.predictedPath.x, centerY - occluded.predictedPath.y);
          if (dist <= this.trackDistThreshold) {
            bestTrackingId = trackingId;
            this.occludedObjects.delete(trackingId); // Recovered
            break;
          }
        }
      }

      if (bestTrackingId) {
        matchedTrackIds.add(bestTrackingId);
        const traj = this.trajectories.get(bestTrackingId)!;
        traj.path.push({ x: centerX, y: centerY, timestamp });

        if (traj.path.length > this.maxHistory) {
          traj.path.shift();
        }

        updated.push({
          ...det,
          trackingId: bestTrackingId
        });
      } else {
        // Allocate a new trajectory ID
        const newTrackingId = `track-${Math.random().toString(36).substr(2, 9)}`;
        this.trajectories.set(newTrackingId, {
          trackingId: newTrackingId,
          label: det.label,
          path: [{ x: centerX, y: centerY, timestamp }]
        });

        matchedTrackIds.add(newTrackingId);
        updated.push({
          ...det,
          trackingId: newTrackingId
        });
      }
    }

    // 3. Occlusion Recovery: handle unmatched trajectories
    for (const [id, traj] of this.trajectories.entries()) {
      if (!matchedTrackIds.has(id)) {
        const lastPos = traj.path[traj.path.length - 1];
        if (lastPos) {
          const predicted = this.predictMotion(traj);
          const occluded = this.occludedObjects.get(id);

          const frames = (occluded?.framesOccluded ?? 0) + 1;
          if (frames <= this.maxOcclusionFrames) {
            this.occludedObjects.set(id, {
              trackingId: id,
              label: traj.label,
              predictedPath: predicted,
              framesOccluded: frames
            });
            // Keep active in main trajectories list
            traj.path.push({ ...predicted, timestamp });
          } else {
            this.trajectories.delete(id);
            this.occludedObjects.delete(id);
          }
        }
      }
    }

    return updated;
  }

  /**
   * Motion Prediction: linearly extrapolates velocity to predict next centroid coordinate.
   */
  private predictMotion(traj: ObjectTrajectory): { x: number; y: number } {
    const len = traj.path.length;
    if (len < 2) {
      return traj.path[0] || { x: 0, y: 0 };
    }

    const p1 = traj.path[len - 2]!;
    const p2 = traj.path[len - 1]!;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    return {
      x: p2.x + dx,
      y: p2.y + dy
    };
  }
}
