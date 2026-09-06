import type { AiAnalysisRequest, AiAnalysisResult, AiProvider } from "../types";
import { AiProviderError } from "../types";
import { withRetry } from "../retry";

const DEFAULT_MODEL = "gemini-2.5-flash";
const TIMEOUT_MS = 90_000;

/**
 * Google Gemini provider via raw HTTP (no SDK dependency). Uses
 * `responseMimeType: application/json` plus `responseSchema` for a fixed shape.
 */
export function createGoogleProvider(): AiProvider {
  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  return {
    id: "google",
    model,

    async analyze(request: AiAnalysisRequest): Promise<AiAnalysisResult> {
      if (!apiKey) {
        throw new AiProviderError(
          "GOOGLE_API_KEY (or GEMINI_API_KEY) is not set",
          "google",
        );
      }

      return withRetry("google", async () => {
        const parts = [
          ...request.images.map((img) => ({
            inline_data: { mime_type: img.mediaType, data: img.base64 },
          })),
          { text: request.prompt },
        ];

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model,
        )}:generateContent`;

        let res: Response;
        try {
          res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: request.system }] },
              contents: [{ role: "user", parts }],
              generationConfig: {
                maxOutputTokens: request.maxTokens ?? 4000,
                responseMimeType: "application/json",
                // Gemini rejects `additionalProperties`, so strip it recursively.
                responseSchema: stripUnsupported(request.schema),
              },
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
        } catch (err) {
          throw new AiProviderError(
            err instanceof Error ? err.message : "Gemini request failed",
            "google",
          );
        }

        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const detail =
            (body as { error?: { message?: string } } | null)?.error?.message ??
            res.statusText;
          throw new AiProviderError(
            `Gemini API error: ${detail}`,
            "google",
            res.status,
          );
        }

        const parsed = body as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
          };
        } | null;

        const text = parsed?.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("")
          .trim();
        if (!text) {
          throw new AiProviderError("Gemini returned no content", "google");
        }

        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          throw new AiProviderError("Gemini returned invalid JSON", "google");
        }

        return {
          data,
          provider: "google",
          model,
          usage: {
            inputTokens: parsed?.usageMetadata?.promptTokenCount,
            outputTokens: parsed?.usageMetadata?.candidatesTokenCount,
          },
        };
      });
    },
  };
}

/** Gemini's schema dialect is narrower than JSON Schema — drop what it rejects. */
function stripUnsupported(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(stripUnsupported);
  if (schema && typeof schema === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema)) {
      if (key === "additionalProperties" || key === "$schema") continue;
      out[key] = stripUnsupported(value);
    }
    return out;
  }
  return schema;
}
