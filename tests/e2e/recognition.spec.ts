import WebSocket from "ws";

describe("VisionCanvas AI Recognition Inference E2E", () => {
  let wsClient: WebSocket;

  beforeAll((done) => {
    // In E2E runs, spawn FastAPI uvicorn runner first
    const wsUrl = "ws://localhost:8000/api/v1/ws/inference";
    wsClient = new WebSocket(wsUrl);
    wsClient.on("open", () => done());
  });

  afterAll(() => {
    wsClient.close();
  });

  it("should process landmark tracking arrays and return predictions", (done) => {
    wsClient.on("message", (data) => {
      const response = JSON.parse(data.toString());
      expect(response).toHaveProperty("gesture");
      expect(response).toHaveProperty("confidence");
      done();
    });

    // Send mock camera coordinate frames or landmark packets
    const mockFrameBytes = Buffer.from("mock-binary-image-data-payload");
    wsClient.send(mockFrameBytes);
  });
});
