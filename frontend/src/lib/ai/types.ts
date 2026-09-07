/**
 * Provider-agnostic contract for the structured-analysis calls the quote
 * calculator makes. Every provider takes the same request shape (system prompt,
 * user prompt, images, JSON Schema) and returns parsed JSON, so swapping
 * providers is a config change and never a change to calling code.
 */

export type AiProviderId = "anthropic" | "openai" | "google";

export interface AiImage {
  /** e.g. "image/jpeg" */
  mediaType: string;
  /** Raw base64, without the `data:...;base64,` prefix. */
  base64: string;
}

export interface AiAnalysisRequest {
  system: string;
  prompt: string;
  images: AiImage[];
  /**
   * JSON Schema (draft 2020-12 subset) the response must conform to. Must be an
   * object schema with `additionalProperties: false` and a `required` array —
   * all three providers need that to enforce the shape strictly.
   */
  schema: Record<string, unknown>;
  /** Name given to the schema/tool. Some providers surface it to the model. */
  schemaName: string;
  schemaDescription: string;
  maxTokens?: number;
}

export interface AiAnalysisResult {
  /** JSON parsed from the model response. Not yet validated against our domain. */
  data: unknown;
  provider: AiProviderId;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    /** Tokens written to the prompt cache on this call (billed at 1.25x). */
    cacheWriteTokens?: number;
    /** Tokens served from the prompt cache (billed at 0.1x). */
    cacheReadTokens?: number;
  };
}

export interface AiProvider {
  readonly id: AiProviderId;
  readonly model: string;
  analyze(request: AiAnalysisRequest): Promise<AiAnalysisResult>;
}

/** Thrown for provider/transport failures so the route can map them to a 502. */
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly provider: AiProviderId,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}
