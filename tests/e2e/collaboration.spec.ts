import { io as ClientSocket, Socket } from "socket.io-client";

describe("VisionCanvas Collaboration Sync E2E", () => {
  let client1: Socket;
  let client2: Socket;
  const roomId = "e10a26b3-6c7c-473d-82d8-21d911b332b8";

  beforeAll((done) => {
    // In actual E2E runs, spawn backend server first
    const serverUrl = "http://localhost:4000";
    client1 = ClientSocket(serverUrl);
    client2 = ClientSocket(serverUrl);
    done();
  });

  afterAll(() => {
    client1.disconnect();
    client2.disconnect();
  });

  it("should sync drawing coordinates between multiple clients in the same room", (done) => {
    // 1. Client 1 Joins Room
    client1.emit("join_room", {
      roomId,
      userId: "user-1",
      userName: "Alice"
    });

    // 2. Client 2 Joins Room
    client2.emit("join_room", {
      roomId,
      userId: "user-2",
      userName: "Bob"
    });

    // 3. Client 2 listens to broadcast_coordinates
    client2.on("broadcast_coordinates", (coords: { x: number; y: number; z: number }) => {
      expect(coords.x).toBe(100);
      expect(coords.y).toBe(200);
      done();
    });

    // 4. Client 1 sends coordinate changes
    client1.emit("sync_coordinates", {
      roomId,
      coordinates: { x: 100, y: 200, z: 0 }
    });
  });
});
