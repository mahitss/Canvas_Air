import { describe, it, expect } from "vitest";
import { InputParser } from "../src/parser/input_parser";
import { DefaultSceneDetectionProvider } from "../src/adapters/provider_framework";

describe("Object Detection Input Parser & Provider Framework", () => {
  it("should parse static images, camera frames, and video streams into normalized inputs", async () => {
    const parser = new InputParser();

    // 1. Static image
    const normImg = parser.parseStaticImage("raw-pixel-data");
    expect(normImg.sourceType).toBe("image");
    expect(normImg.width).toBe(1920);

    // 2. Camera frame
    const normFrame = parser.parseCameraFrame({ pixels: "raw", width: 640, height: 480 });
    expect(normFrame.sourceType).toBe("frame");
    expect(normFrame.height).toBe(480);

    // 3. Video stream generator
    const generator = parser.parseVideoStream({});
    const frames = [];
    for await (const frame of generator) {
      frames.push(frame);
    }
    expect(frames.length).toBe(3);
    expect(frames[0]?.sourceType).toBe("stream");
  });

  it("should initialize default provider and verify health and dispose lifecycle states", async () => {
    const provider = new DefaultSceneDetectionProvider();
    expect(await provider.health()).toBe("down");

    await provider.initialize();
    expect(await provider.health()).toBe("healthy");

    const result = await provider.detect("local://image.png");
    expect(result.length).toBe(1);
    expect(result[0]?.label).toBe("person");
    expect(result[0]?.confidence).toBe(0.94);

    await provider.dispose();
    expect(await provider.health()).toBe("down");
  });
});
