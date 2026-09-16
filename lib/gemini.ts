import { GoogleGenAI } from "@google/genai";

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

type GeminiPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

type GeminiContents = string | Array<{ role: "user" | "model"; parts: GeminiPart[] }>;

type GenerateGeminiTextOptions = {
  contents: GeminiContents;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  responseMimeType?: "text/plain" | "application/json";
};

let client: GoogleGenAI | null = null;

export function getGeminiApiKey() {
  const raw = process.env.GEMINI_API_KEY?.trim().replace(/^["']|["']$/g, "") ?? "";
  // Strip trailing dot if accidentally copied with punctuation
  return raw.endsWith(".") ? raw.slice(0, -1) : raw;
}

function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export const geminiRuntime = {
  get configured() {
    return Boolean(getGeminiApiKey());
  },
  get model() {
    return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  }
};

export async function generateGeminiText({
  contents,
  systemInstruction,
  model = geminiRuntime.model,
  temperature = 0.3,
  responseMimeType = "text/plain"
}: GenerateGeminiTextOptions) {
  const ai = getGeminiClient();
  if (!ai) return null;

  const candidateModels = Array.from(
    new Set([model, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"])
  );

  for (const currentModel of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents,
        config: {
          systemInstruction,
          temperature,
          responseMimeType
        }
      });

      const text = response.text?.trim() || null;
      if (text) return text;
    } catch (error) {
      console.error(`[Gemini] Error with model ${currentModel}:`, error);
    }
  }

  return null;
}

export async function generateGeminiImageText(
  image: string,
  prompt: string,
  systemInstruction: string,
  model = geminiRuntime.model
) {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!match) return null;

  return generateGeminiText({
    model,
    systemInstruction,
    temperature: 0.2,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: match[1], data: match[2] } }
        ]
      }
    ]
  });
}

export type GeminiTranscript = {
  text: string;
  segments: Array<{ id: number; start: number; end: number; text: string }>;
};

export async function transcribeVideoWithGemini(video: File): Promise<GeminiTranscript | null> {
  const buffer = Buffer.from(await video.arrayBuffer());
  const result = await generateGeminiText({
    systemInstruction:
      "You are a precise educational transcription assistant. Transcribe the supplied video audio faithfully. Return only JSON with a text field and a segments array. Each segment must have id, start, end, and text fields; use seconds for start and end. Do not invent words that are not audible.",
    contents: [
      {
        role: "user",
        parts: [
          { text: "Transcribe this video and include useful timestamped segments." },
          {
            inlineData: {
              mimeType: video.type || "video/mp4",
              data: buffer.toString("base64")
            }
          }
        ]
      }
    ],
    temperature: 0,
    responseMimeType: "application/json"
  });

  if (!result) return null;

  try {
    const parsed = JSON.parse(result) as Partial<GeminiTranscript>;
    if (typeof parsed.text !== "string" || !Array.isArray(parsed.segments)) return null;

    return {
      text: parsed.text,
      segments: parsed.segments.filter(
        (segment): segment is GeminiTranscript["segments"][number] =>
          Boolean(
            segment &&
              typeof segment === "object" &&
              typeof segment.id === "number" &&
              typeof segment.start === "number" &&
              typeof segment.end === "number" &&
              typeof segment.text === "string"
          )
      )
    };
  } catch {
    return null;
  }
}
