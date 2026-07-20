import { HandPresence } from "@visioncanvas/hand-tracking";

export interface CustomLearnedGesture {
  name: string;
  recordedPath: HandPresence[];
  assignedAction: string;
  version: string;
}

export class CustomGestureStudio {
  private readonly learnedGestures = new Map<string, CustomLearnedGesture>();
  private activeRecording: HandPresence[] = [];

  public startRecording(): void {
    this.activeRecording = [];
  }

  public recordFrame(hand: HandPresence): void {
    this.activeRecording.push({ ...hand });
  }

  /**
   * Commits recorded landmark sequences to register new gestures.
   */
  public saveGesture(name: string, assignedAction: string): CustomLearnedGesture {
    const gesture: CustomLearnedGesture = {
      name,
      recordedPath: [...this.activeRecording],
      assignedAction,
      version: "1.0.0"
    };

    this.learnedGestures.set(name, gesture);
    return gesture;
  }

  public exportGestures(): string {
    return JSON.stringify(Array.from(this.learnedGestures.values()));
  }

  public importGestures(json: string): void {
    const list = JSON.parse(json) as CustomLearnedGesture[];
    for (const g of list) {
      this.learnedGestures.set(g.name, { ...g });
    }
  }

  public getGesture(name: string): CustomLearnedGesture | null {
    return this.learnedGestures.get(name) || null;
  }
}
