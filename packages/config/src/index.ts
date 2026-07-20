import { z } from "zod";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  CLIENT_ORIGIN: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  MAIN_MODEL: z.string().default("google/gemma-3-27b-it:free"),
  REASONING_MODEL: z.string().default("deepseek/deepseek-r1:free"),
  FALLBACK_MODEL: z.string().default("meta-llama/llama-3.3-70b-instruct:free"),
  FAST_MODEL: z.string().default("mistralai/mistral-7b-instruct:free"),
  STRUCTURED_MODEL: z.string().default("qwen/qwen-2.5-72b-instruct:free"),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Missing or invalid environment configuration.");
  }
  return result.data;
}

export const CONFIG = {
  VERSION: "1.0.0",
  MAX_CLIENTS_PER_ROOM: 50,
  FRAME_RATE_TARGET: 60,
};
