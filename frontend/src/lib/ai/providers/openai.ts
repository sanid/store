import type { AiAnalysisRequest, AiAnalysisResult, AiProvider } from "../types";
import { AiProviderError } from "../types";
import { withRetry } from "../retry";

const DEFAULT_MODEL = "gpt-4o";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 90_000;

/**
 * ChatGPT / OpenAI provider via raw HTTP (no SDK dependency). Uses
 * `response_format: json_schema` with `strict: true` for guaranteed shape.
 */
export function createOpenAiProvider(): AiProvider {
  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  return {
    id: "openai",
    model,

    async analyze(request: AiAnalysisRequest): Promise<AiAnalysisResult> {
      if (!apiKey) {
        throw new AiProviderError("OPENAI_API_KEY is not set", "openai");
      }

      return withRetry("openai", async () => {
        const userContent = [
          ...request.images.map((img) => ({
            type: "image_url" as const,
            image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
          })),
          { type: "text" as const, text: request.prompt },
        ];

        let res: Response;
        try {
          res = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              max_completion_tokens: request.maxTokens ?? 4000,
              messages: [
                { role: "system", content: request.system },
                { role: "user", content: userContent },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: request.schemaName,
                  description: request.schemaDescription,
                  strict: true,
                  schema: request.schema,
                },
              },
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
        } catch (err) {
          throw new AiProviderError(
            err instanceof Error ? err.message : "OpenAI request failed",
            "openai",
          );
        }

        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const detail =
            (body as { error?: { message?: string } } | null)?.error?.message ??
            res.statusText;
          throw new AiProviderError(
            `OpenAI API error: ${detail}`,
            "openai",
            res.status,
          );
        }

        const parsed = body as {
          choices?: {
            message?: { content?: string };
            finish_reason?: string;
          }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        } | null;

        const text = parsed?.choices?.[0]?.message?.content;
        if (!text) {
          throw new AiProviderError("OpenAI returned no content", "openai");
        }

        return {
          data: safeParse(text, "openai"),
          provider: "openai",
          model,
          usage: {
            inputTokens: parsed?.usage?.prompt_tokens,
            outputTokens: parsed?.usage?.completion_tokens,
          },
        };
      });
    },
  };
}

function safeParse(text: string, provider: "openai"): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new AiProviderError("OpenAI returned invalid JSON", provider);
  }
}
