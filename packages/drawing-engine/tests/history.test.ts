import { describe, it, expect } from "vitest";
import { HistoryCommander } from "../src/history/commander";
import { DrawingEngineConfig } from "../src/config";
import { HistoryCommand } from "../src/types";

class DummyCommand implements HistoryCommand {
  public id = Math.random().toString();
  public executedCount = 0;
  public undoneCount = 0;

  public execute(): void {
    this.executedCount++;
  }

  public undo(): void {
    this.undoneCount++;
  }
}

describe("Drawing History Commander", () => {
  const createMockConfig = (maxSize: number): DrawingEngineConfig => ({
    defaultBrushName: "Pen",
    defaultBrushWidth: 5,
    defaultBrushOpacity: 1.0,
    defaultBrushColor: "#000000",
    maxHistorySize: maxSize,
    layerLimit: 10,
    minDistanceThreshold: 2.0,
    minTimeThresholdMs: 16
  });

  it("should respect configurable history size limits and evict old entries", () => {
    const commander = new HistoryCommander(createMockConfig(3));
    const commands = [
      new DummyCommand(),
      new DummyCommand(),
      new DummyCommand(),
      new DummyCommand(),
      new DummyCommand()
    ];

    for (const cmd of commands) {
      commander.executeCommand(cmd);
    }

    // Since cap is 3, first 2 commands are evicted. We can undo exactly 3 times.
    expect(commander.canUndo()).toBe(true);
    
    commander.undo(); // 5th undone
    commander.undo(); // 4th undone
    commander.undo(); // 3rd undone
    
    expect(commander.canUndo()).toBe(false);

    expect(commands[4]!.undoneCount).toBe(1);
    expect(commands[3]!.undoneCount).toBe(1);
    expect(commands[2]!.undoneCount).toBe(1);
    expect(commands[1]!.undoneCount).toBe(0); // evicted
    expect(commands[0]!.undoneCount).toBe(0); // evicted
  });

  it("should group multiple commands inside a transaction as a single macro action", () => {
    const commander = new HistoryCommander(createMockConfig(10));
    const c1 = new DummyCommand();
    const c2 = new DummyCommand();
    const c3 = new DummyCommand();

    commander.startTransaction();
    commander.executeCommand(c1);
    commander.executeCommand(c2);
    commander.executeCommand(c3);
    commander.endTransaction();

    expect(c1.executedCount).toBe(1);
    expect(c2.executedCount).toBe(1);
    expect(c3.executedCount).toBe(1);

    // Should perform single group undo
    commander.undo();
    expect(c1.undoneCount).toBe(1);
    expect(c2.undoneCount).toBe(1);
    expect(c3.undoneCount).toBe(1);

    // Should perform single group redo
    commander.redo();
    expect(c1.executedCount).toBe(2);
    expect(c2.executedCount).toBe(2);
    expect(c3.executedCount).toBe(2);
  });

  it("should rollback transactions and undo uncommitted actions in reverse order", () => {
    const commander = new HistoryCommander(createMockConfig(10));
    const events: string[] = [];

    const c1 = {
      id: "1",
      execute: () => events.push("execute 1"),
      undo: () => events.push("undo 1")
    };
    const c2 = {
      id: "2",
      execute: () => events.push("execute 2"),
      undo: () => events.push("undo 2")
    };

    commander.startTransaction();
    commander.executeCommand(c1);
    commander.executeCommand(c2);
    commander.rollbackTransaction();

    // Verify executions happened, then rollbacks happened in reverse order [undo 2, undo 1]
    expect(events).toEqual(["execute 1", "execute 2", "undo 2", "undo 1"]);
    expect(commander.canUndo()).toBe(false);
  });
});
