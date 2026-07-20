import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { validateEnv, CONFIG } from "@visioncanvas/config";
import { Point3D } from "@visioncanvas/types";

dotenv.config();

// Enforce strict environment variables configuration validation
const env = validateEnv();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// Configure larger payload limit to support base64 PNG transfers
app.use(cors());
app.use(express.json({ limit: "15mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    version: CONFIG.VERSION,
    environment: env.NODE_ENV
  });
});

/**
 * Helper: fetchWithRetry
 * Automatically retries request on temporary network issues, rate limits, or server errors.
 */
async function fetchWithRetry(url: string, options: any, retries = 3, delay = 500): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      // Do not retry on client errors (except 429 rate limit)
      if (response.status < 500 && response.status !== 429) {
        return response;
      }
      console.warn(`[AI Gateway] Temporary status code ${response.status} from OpenRouter. Retrying ${i + 1}/${retries}...`);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`[AI Gateway] Network error during call: ${err}. Retrying ${i + 1}/${retries}...`);
    }
    await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
  }
  return fetch(url, options); // Final fallback attempt
}

/**
 * Endpoint: POST /api/ai/handwriting
 * Recovers a completed sketch/handwriting tight bitmap snapshot
 * and runs transcription or sketch classification via OpenRouter.
 */
app.post("/api/ai/handwriting", async (req: express.Request, res: express.Response): Promise<any> => {
  // Log request meta keys in development
  console.info(`[AI Endpoint] Received keys: [${Object.keys(req.body).join(", ")}]`);

  try {
    const { image, mode, language } = req.body;

    // Validate request schema
    if (!image) {
      console.warn("[AI Endpoint] Validation failed: Missing 'image' field.");
      return res.status(400).json({
        success: false,
        error: "Validation error: Missing 'image' field.",
        text: "",
        confidence: 0,
        suggestions: []
      });
    }

    if (mode !== "sketch" && mode !== "writing") {
      console.warn(`[AI Endpoint] Validation failed: Invalid mode '${mode}'.`);
      return res.status(400).json({
        success: false,
        error: `Validation error: Invalid mode '${mode}'.`,
        text: "",
        confidence: 0,
        suggestions: []
      });
    }

    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("[AI Endpoint] Server configuration failure: OPENROUTER_API_KEY is not defined.");
      return res.status(500).json({
        success: false,
        error: "Configuration error: OpenRouter API key is missing on the server.",
        text: "",
        confidence: 0,
        suggestions: []
      });
    }

    const promptText = mode === "sketch"
      ? `You are an expert sketch recognizer. The image contains a simple hand-drawn sketch on a black background. Classify the drawing into a single, clean noun. Choose from: 'circle', 'square', 'triangle', 'arrow', 'star', 'heart', 'house', 'cat', 'tree', 'face', 'sun', 'moon', 'car', 'flower', 'cloud'. Response MUST be in JSON format: { "text": "recognized shape name", "confidence": 0.95, "suggestions": ["alt1", "alt2"] }`
      : `You are an expert handwriting recognizer. The image contains a word or letters hand-drawn in the air on a black background. Transcribe the handwriting. If it is misspelled, correct it to the nearest valid word in this language: ${language || "English"}. Response MUST be in JSON format: { "text": "transcribed and corrected word", "confidence": 0.95, "suggestions": ["alt1", "alt2", "alt3"] }`;

    console.info(`[AI Endpoint] Dispatching OpenRouter. Mode: ${mode}, Language: ${language || "English"}`);

    const payload = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText
            },
            {
              type: "image_url",
              image_url: {
                url: image
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 150 // Limit token counts to prevent 402 payment requirements/excess allocation credits errors
    };

    const openRouterRes = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/visioncanvas",
        "X-Title": "VisionCanvas AR"
      },
      body: JSON.stringify(payload)
    });

    console.info(`[AI Endpoint] OpenRouter responded with status code: ${openRouterRes.status}`);

    if (!openRouterRes.ok) {
      const errorText = await openRouterRes.text();
      console.error(`[AI Endpoint] OpenRouter error body: ${errorText}`);
      
      const resCode = openRouterRes.status === 402 ? 402 : 502;
      return res.status(resCode).json({
        success: false,
        error: `OpenRouter error response status ${openRouterRes.status}: ${errorText}`,
        text: "",
        confidence: 0,
        suggestions: []
      });
    }

    const data = await openRouterRes.json();
    const resultText = data.choices?.[0]?.message?.content;
    if (!resultText) {
      console.error("[AI Endpoint] Choices content payload was empty:", JSON.stringify(data));
      return res.status(502).json({
        success: false,
        error: "Invalid AI model completion: Response text field empty.",
        text: "",
        confidence: 0,
        suggestions: []
      });
    }

    console.info(`[AI Endpoint] OpenRouter Raw Content Result: ${resultText}`);
    
    try {
      const parsed = JSON.parse(resultText);
      return res.status(200).json({
        success: true,
        text: parsed.text || "",
        confidence: parsed.confidence ?? 0.85,
        suggestions: parsed.suggestions || []
      });
    } catch (parseErr: any) {
      console.error(`[AI Endpoint] JSON parser exception on model content: ${resultText}`, parseErr);
      return res.status(502).json({
        success: false,
        error: `Failed to parse model JSON: ${parseErr.message}`,
        text: "",
        confidence: 0,
        suggestions: []
      });
    }
  } catch (err: any) {
    console.error("[AI Endpoint] Exception caught inside API handler:", err);
    return res.status(500).json({
      success: false,
      error: `Internal Gateway Exception: ${err.message || String(err)}`,
      text: "",
      confidence: 0,
      suggestions: []
    });
  }
});

io.on("connection", (socket: Socket) => {
  console.info(`[Socket] Connection established: ${socket.id}`);

  socket.on("sync_coordinates", (packet: { roomId: string; coords: Point3D }) => {
    socket.to(packet.roomId).emit("broadcast_coordinates", packet.coords);
  });

  socket.on("disconnect", () => {
    console.info(`[Socket] Client disconnected: ${socket.id}`);
  });
});

server.listen(env.PORT, () => {
  console.info(`[Server] Active. Listening on port ${env.PORT} in ${env.NODE_ENV} mode.`);
});
