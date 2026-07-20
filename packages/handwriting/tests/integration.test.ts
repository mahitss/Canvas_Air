import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DrawingHandwritingBridge, IMinimalDrawingEngine } from "../src/integration/bridge";
import { IHandwritingEngine } from "../src/interfaces";
import { RecognitionResult } from "../src/types";

describe("Drawing Handwriting Integration Bridge", () => {
  let mockDrawingEngine: IMinimalDrawingEngine;
  let mockHandwritingEngine: IHandwritingEngine;
  let eventCallback: (event: any) => void;
  let unsubscribeMock: any;

  beforeEach(() => {
    vi.useFakeTimers();

    unsubscribeMock = vi.fn();
    mockDrawingEngine = {
      getStrokes: vi.fn().mockReturnValue([
        {
          id: "stroke_1",
          points: [
            { x: 10, y: 15 },
            { x: 20, y: 25 }
          ]
        }
      ]),
      eventBus: {
        subscribe: vi.fn().mockImplementation((type, cb) => {
          eventCallback = cb;
          return unsubscribeMock;
        })
      }
    };

    mockHandwritingEngine = {
      recognize: vi.fn().mockResolvedValue({
        text: "hello",
        confidence: 0.95,
        words: [],
        lines: [],
        paragraphs: []
      } as RecognitionResult)
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should subscribe to StrokeCompleted on start and unsubscribe on stop", () => {
    const bridge = new DrawingHandwritingBridge(mockDrawingEngine, mockHandwritingEngine);

    bridge.start();
    expect(mockDrawingEngine.eventBus.subscribe).toHaveBeenCalledWith("StrokeCompleted", expect.any(Function));

    bridge.stop();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("should trigger recognition asynchronously after debounce period on stroke completion", async () => {
    const bridge = new DrawingHandwritingBridge(mockDrawingEngine, mockHandwritingEngine, {
      debounceMs: 200,
      minPointsCount: 2
    });

    bridge.start();

    // Fire StrokeCompleted event
    eventCallback({
      payload: {
        strokeId: "stroke_1",
        pointsCount: 2
      }
    });

    // Verify it is not called immediately
    expect(mockHandwritingEngine.recognize).not.toHaveBeenCalled();

    // Fast-forward debounce timer
    vi.advanceTimersByTime(200);

    expect(mockHandwritingEngine.recognize).toHaveBeenCalledWith(
      [
        [
          { x: 10, y: 15 },
          { x: 20, y: 25 }
        ]
      ],
      ["stroke_1"]
    );
  });

  it("should ignore strokes shorter than minPointsCount", () => {
    const bridge = new DrawingHandwritingBridge(mockDrawingEngine, mockHandwritingEngine, {
      debounceMs: 200,
      minPointsCount: 3
    });

    bridge.start();

    eventCallback({
      payload: {
        strokeId: "stroke_1",
        pointsCount: 2 // less than minPointsCount
      }
    });

    vi.advanceTimersByTime(200);
    expect(mockHandwritingEngine.recognize).not.toHaveBeenCalled();
  });
});
