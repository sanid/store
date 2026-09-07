import Anthropic from "@anthropic-ai/sdk";
import type { AiAnalysisRequest, AiAnalysisResult, AiProvider } from "../types";
import { AiProviderError } from "../types";
import { withRetry } from "../retry";

/**
 * Sonnet 5 ist hier bewusst der Standard, nicht Opus.
 *
 * Gemessen an denselben drei Fotos eines Teak-Sessels lieferten beide Modelle
 * dieselben preisbestimmenden Werte (3,2 lfm / 6 Std.), erkannten beide die
 * losen Kissen und korrigierten beide die Kundenangabe "Stuhl" zu "Sessel".
 * Sonnet kostete dabei rund ein Drittel und antwortete in der Haelfte der Zeit.
 *
 * Haiku 4.5 faellt fuer diese Aufgabe aus: es schaetzte denselben Sessel auf
 * 5,5 lfm / 10 Std. — ueber dem Referenzwert fuer einen vollgepolsterten
 * Sessel — und haette den Auftrag damit fast doppelt so teuer angeboten.
 *
 * Ueber AI_MODEL jederzeit umstellbar.
 */
const DEFAULT_MODEL = "claude-sonnet-5";

/**
 * Claude provider. Uses strict tool use with a forced `tool_choice` so the
 * model can only answer by filling in our schema — no prose to parse, and the
 * SDK guarantees `input` validates against `input_schema`.
 */
export function createAnthropicProvider(): AiProvider {
  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  // Constructed lazily so a missing key surfaces as our own error, not a throw
  // at module load that would take down unrelated routes.
  const apiKey = process.env.ANTHROPIC_API_KEY;

  return {
    id: "anthropic",
    model,

    async analyze(request: AiAnalysisRequest): Promise<AiAnalysisResult> {
      if (!apiKey) {
        throw new AiProviderError("ANTHROPIC_API_KEY is not set", "anthropic");
      }
      // maxRetries: 0 — Wiederholungen laufen zentral ueber withRetry, sonst
      // multiplizieren sich SDK- und eigene Versuche.
      const client = new Anthropic({ apiKey, maxRetries: 0 });

      const content: Anthropic.ContentBlockParam[] = [
        ...request.images.map((img): Anthropic.ContentBlockParam => ({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType as
              "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: img.base64,
          },
        })),
        { type: "text", text: request.prompt },
      ];

      return withRetry("anthropic", async () => {
        try {
          const response = await client.messages.create({
            model,
            max_tokens: request.maxTokens ?? 4000,
            // Everything up to and including the system prompt is byte-identical
            // on every request — the workshop catalog, the rules, the schema.
            // The breakpoint sits on the last system block, and because the
            // render order is tools -> system -> messages it covers the tool
            // schema as well. Only the photos and the customer's own text, which
            // follow it, are ever charged at full price.
            system: [
              {
                type: "text",
                text: request.system,
                cache_control: { type: "ephemeral" },
              },
            ],
            ...thinkingConfigFor(model),
            tools: [
              {
                name: request.schemaName,
                description: request.schemaDescription,
                strict: true,
                input_schema: request.schema as Anthropic.Tool.InputSchema,
              },
            ],
            tool_choice: { type: "tool", name: request.schemaName },
            messages: [{ role: "user", content }],
          });

          if (response.stop_reason === "refusal") {
            throw new AiProviderError(
              `Claude declined the request (${response.stop_details?.category ?? "unknown"})`,
              "anthropic",
            );
          }

          const toolUse = response.content.find(
            (block): block is Anthropic.ToolUseBlock =>
              block.type === "tool_use",
          );
          if (!toolUse) {
            throw new AiProviderError(
              "Claude returned no structured result",
              "anthropic",
            );
          }

          return {
            data: toolUse.input,
            provider: "anthropic",
            model,
            usage: {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              cacheWriteTokens: response.usage.cache_creation_input_tokens ?? undefined,
              cacheReadTokens: response.usage.cache_read_input_tokens ?? undefined,
            },
          };
        } catch (err) {
          if (err instanceof AiProviderError) throw err;
          if (err instanceof Anthropic.APIError) {
            throw new AiProviderError(
              `Anthropic API error: ${err.message}`,
              "anthropic",
              err.status,
            );
          }
          throw new AiProviderError(
            err instanceof Error ? err.message : "Unknown Anthropic failure",
            "anthropic",
          );
        }
      });
    },
  };
}

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

function effortFromEnv(): Effort {
  const raw = process.env.AI_EFFORT as Effort | undefined;
  return raw && EFFORTS.includes(raw) ? raw : "high";
}

/**
 * Thinking- und Effort-Parameter unterscheiden sich je Modellgeneration:
 * Opus 5 / Sonnet 5 / Fable und die 4.6+-Familie nehmen adaptives Thinking und
 * `output_config.effort`, Haiku 4.5 und aeltere Modelle lehnen beides mit 400 ab
 * und brauchen stattdessen ein festes `budget_tokens`. Ohne diese Weiche liesse
 * sich AI_MODEL nicht frei setzen — genau das ist aber der Sinn der Konfiguration.
 */
function thinkingConfigFor(model: string): Record<string, unknown> {
  const id = model.toLowerCase();

  const supportsAdaptive =
    /claude-(opus-(5|4-[6-9])|sonnet-(5|4-6)|fable|mythos)/.test(id);
  if (supportsAdaptive) {
    return {
      thinking: { type: "adaptive" },
      output_config: { effort: effortFromEnv() },
    };
  }

  // Haiku 4.5 und aeltere Modelle: kein Thinking. Sie kennen weder adaptives
  // Thinking noch `effort`, und ihr festes `budget_tokens` vertraegt sich nicht
  // mit erzwungener Tool-Nutzung ("Thinking may not be enabled when tool_choice
  // forces tool use") — die erzwungene Tool-Nutzung ist hier aber das, was das
  // Schema garantiert. Also lieber ohne Thinking als ohne Struktur.
  return {};
}
