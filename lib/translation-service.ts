import { fallbackTranslateBatch } from "@/lib/i18n/fallback-translations";
import { generateGeminiText, geminiRuntime } from "@/lib/gemini";
import type { ContentLanguage } from "@/lib/types";

type TranslationProvider = "gemini" | "demo";

type GeminiTranslationResponse = {
  translations?: Array<{
    source?: string;
    target?: string;
  }>;
};

const delay = (ms = 180) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function uniqueTexts(texts: string[]) {
  return Array.from(new Set(texts.map((text) => text.trim()).filter(Boolean))).slice(0, 120);
}

function parseJson(raw: string): GeminiTranslationResponse | null {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned) as GeminiTranslationResponse;
  } catch {
    return null;
  }
}

async function translateWithGemini(language: ContentLanguage, texts: string[]) {
  if (!geminiRuntime.configured) return null;

  const result = await generateGeminiText({
    systemInstruction:
      "Translate Sustain-X UI text for an educational accessibility web app. Preserve product names, acronyms, numbers, URLs, and code-like tokens. Return only JSON with this exact shape: {\"translations\":[{\"source\":\"original\",\"target\":\"translation\"}]}. Do not add commentary.",
    contents: JSON.stringify({ targetLanguage: language, texts }),
    responseMimeType: "application/json"
  });
  const parsed = parseJson(result ?? "");
  if (!parsed?.translations?.length) return null;

  return Object.fromEntries(
    parsed.translations
      .filter((item): item is { source: string; target: string } => Boolean(item.source && item.target))
      .map((item) => [item.source, item.target])
  );
}

export async function translateUiStrings(language: ContentLanguage, texts: string[]) {
  const unique = uniqueTexts(texts);
  if (language === "English") {
    return {
      provider: "demo" as TranslationProvider,
      translations: Object.fromEntries(unique.map((text) => [text, text]))
    };
  }

  const fallback = fallbackTranslateBatch(language, unique);
  const aiTranslations = await translateWithGemini(language, unique);
  if (!aiTranslations) {
    await delay();
    return { provider: "demo" as TranslationProvider, translations: fallback };
  }

  const translations = Object.fromEntries(unique.map((text) => [text, aiTranslations[text] ?? fallback[text] ?? text]));
  return { provider: "gemini" as TranslationProvider, translations };
}
