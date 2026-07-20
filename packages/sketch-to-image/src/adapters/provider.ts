import { ModelProviderAdapter, ImageGenerationOptions } from "../types";

export class MockImageProviderAdapter implements ModelProviderAdapter {
  public id: string = "mock-diffusion-provider";
  public name: string = "Mock Diffusion Engine";

  /**
   * Simulates generative image creation based on prompt configurations.
   */
  public async generate(prompt: string, options: ImageGenerationOptions): Promise<string> {
    // Artificial latency delay simulator
    await new Promise(resolve => setTimeout(resolve, 50));

    if (prompt.includes("crash")) {
      throw new Error("Generative Model Adapter inference crash.");
    }

    const seedVal = options.seed ?? Math.floor(Math.random() * 100000);
    return `https://visioncanvas.ai/generated/mock-${seedVal}.png`;
  }
}
