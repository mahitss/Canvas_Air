import { VoiceIntent, VoiceEntities } from "../types";

export type CommandCallback = (entities: VoiceEntities) => void;

export class CommandDispatcher {
  private handlers: Map<VoiceIntent, CommandCallback[]> = new Map();

  /**
   * Registers a command execution listener callback for a specific voice intent category.
   */
  public registerHandler(intent: VoiceIntent, callback: CommandCallback): void {
    if (!this.handlers.has(intent)) {
      this.handlers.set(intent, []);
    }
    this.handlers.get(intent)!.push(callback);
  }

  /**
   * Routes parsed voice command parameters to their registered actions.
   */
  public dispatch(intent: VoiceIntent, entities: VoiceEntities): boolean {
    const list = this.handlers.get(intent);
    if (!list || list.length === 0) {
      return false;
    }

    for (const callback of list) {
      try {
        callback(entities);
      } catch (err) {
        // Suppress errors during callback routing execution loop
      }
    }

    return true;
  }
}
