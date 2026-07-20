import { GenerationHistoryItem, GenerationResult } from "../types";

export class ResultManager {
  private history: Map<string, GenerationHistoryItem> = new Map();

  /**
   * Archives a successful image generation run parameter profile.
   */
  public addHistoryItem(prompt: string, result: GenerationResult): GenerationHistoryItem {
    const id = `gen-${Math.random().toString(36).substr(2, 9)}`;
    const item: GenerationHistoryItem = {
      id,
      prompt,
      result,
      createdAt: Date.now()
    };
    this.history.set(id, item);
    return item;
  }

  public getHistoryList(): GenerationHistoryItem[] {
    return Array.from(this.history.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public clearHistory(): void {
    this.history.clear();
  }
}
export * from "../types";
export * from "../config";
export * from "../prompt/builder";
export * from "../adapters/provider";
