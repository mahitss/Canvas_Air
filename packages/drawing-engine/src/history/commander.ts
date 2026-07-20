import { HistoryCommand } from "../types";
import { DrawingEngineConfig } from "../config";
import { IHistoryCommander } from "../interfaces";

export class MacroCommand implements HistoryCommand {
  public id: string;
  constructor(private readonly commands: HistoryCommand[]) {
    this.id = `macro-${Math.random().toString(36).substr(2, 9)}`;
  }

  public execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  public undo(): void {
    // Undo in reverse order!
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i]!.undo();
    }
  }
}

export class HistoryCommander implements IHistoryCommander {
  private config: DrawingEngineConfig;
  private undoStack: HistoryCommand[] = [];
  private redoStack: HistoryCommand[] = [];
  private activeTransaction: HistoryCommand[] | null = null;

  constructor(config: DrawingEngineConfig) {
    this.config = config;
  }

  public executeCommand(command: HistoryCommand): void {
    command.execute();
    
    if (this.activeTransaction) {
      this.activeTransaction.push(command);
    } else {
      this.undoStack.push(command);
      
      // Maintain maximum undo buffer length constraints
      if (this.undoStack.length > this.config.maxHistorySize) {
        this.undoStack.shift(); // Evict oldest history entry
      }
      
      // Clear redo history on new drawing activity actions
      this.redoStack = [];
    }
  }

  public undo(): void {
    const cmd = this.undoStack.pop();
    if (cmd) {
      cmd.undo();
      this.redoStack.push(cmd);
    }
  }

  public redo(): void {
    const cmd = this.redoStack.pop();
    if (cmd) {
      cmd.execute();
      this.undoStack.push(cmd);
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public startTransaction(): void {
    this.activeTransaction = [];
  }

  public endTransaction(): void {
    if (!this.activeTransaction) {
      return;
    }
    const cmds = this.activeTransaction;
    this.activeTransaction = null;

    if (cmds.length > 0) {
      const macro = new MacroCommand(cmds);
      this.undoStack.push(macro);
      if (this.undoStack.length > this.config.maxHistorySize) {
        this.undoStack.shift();
      }
      this.redoStack = [];
    }
  }

  public rollbackTransaction(): void {
    if (!this.activeTransaction) {
      return;
    }
    const cmds = this.activeTransaction;
    this.activeTransaction = null;

    // Rollback changes in reverse order
    for (let i = cmds.length - 1; i >= 0; i--) {
      cmds[i]!.undo();
    }
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.activeTransaction = null;
  }
}
