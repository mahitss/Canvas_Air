export interface EditorCommand {
  undo(): void;
  redo(): void;
}

export class InsertCommand implements EditorCommand {
  constructor(
    private buffer: TextBufferEditor,
    private str: string,
    private pos: number
  ) {}

  public undo(): void {
    this.buffer.deleteAt(this.pos, this.str.length);
  }

  public redo(): void {
    this.buffer.insertAt(this.str, this.pos);
  }
}

export class DeleteCommand implements EditorCommand {
  constructor(
    private buffer: TextBufferEditor,
    private deletedStr: string,
    private pos: number
  ) {}

  public undo(): void {
    this.buffer.insertAt(this.deletedStr, this.pos);
  }

  public redo(): void {
    this.buffer.deleteAt(this.pos, this.deletedStr.length);
  }
}

export class TextBufferEditor {
  private text: string = "";
  private cursorIndex: number = 0;
  
  private undoStack: EditorCommand[] = [];
  private redoStack: EditorCommand[] = [];

  public getText(): string {
    return this.text;
  }

  public getCursorIndex(): number {
    return this.cursorIndex;
  }

  public insert(str: string): void {
    const pos = this.cursorIndex;
    this.insertAt(str, pos);

    // Push insertion command to history stack
    const cmd = new InsertCommand(this, str, pos);
    this.undoStack.push(cmd);
    this.redoStack = []; // Clear redo history
  }

  public deleteBackward(): void {
    if (this.cursorIndex <= 0) return;
    
    const length = 1;
    const pos = this.cursorIndex - length;
    const deletedStr = this.text.substring(pos, this.cursorIndex);
    
    this.deleteAt(pos, length);

    // Push deletion command to history stack
    const cmd = new DeleteCommand(this, deletedStr, pos);
    this.undoStack.push(cmd);
    this.redoStack = []; // Clear redo history
  }

  public insertAt(str: string, pos: number): void {
    const before = this.text.substring(0, pos);
    const after = this.text.substring(pos);
    this.text = before + str + after;
    this.cursorIndex = pos + str.length;
  }

  public deleteAt(pos: number, length: number): void {
    const before = this.text.substring(0, pos);
    const after = this.text.substring(pos + length);
    this.text = before + after;
    this.cursorIndex = pos;
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
      cmd.redo();
      this.undoStack.push(cmd);
    }
  }

  public moveCursor(delta: number): void {
    this.cursorIndex = Math.max(0, Math.min(this.text.length, this.cursorIndex + delta));
  }

  public setCursor(index: number): void {
    this.cursorIndex = Math.max(0, Math.min(this.text.length, index));
  }
}
