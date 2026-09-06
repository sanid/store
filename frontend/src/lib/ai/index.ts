import type { AiProvider, AiProviderId } from "./types";
import { createAnthropicProvider } from "./providers/anthropic";
import { createOpenAiProvider } from "./providers/openai";
import { createGoogleProvider } from "./providers/google";

export * from "./types";

const FACTORIES: Record<AiProviderId, () => AiProvider> = {
  anthropic: createAnthropicProvider,
  openai: createOpenAiProvider,
  google: createGoogleProvider,
};

const KEY_ENV: Record<AiProviderId, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  google: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
};

function hasKey(id: AiProviderId): boolean {
  return KEY_ENV[id].some((name) => Boolean(process.env[name]));
}

/**
 * Resolve the configured provider, or `null` when none is usable.
 *
 * `AI_PROVIDER` pins a provider explicitly (and is respected even without a
 * key, so a misconfiguration surfaces as a clear error rather than silently
 * routing to a different vendor). With no `AI_PROVIDER` set we pick the first
 * provider that actually has credentials, Claude first.
 *
 * A `null` return is not an error: callers fall back to the deterministic
 * heuristic estimate so the calculator still works without any AI configured.
 */
export function getAiProvider(): AiProvider | null {
  const pinned = process.env.AI_PROVIDER as AiProviderId | undefined;
  if (pinned) {
    const factory = FACTORIES[pinned];
    if (!factory) {
      console.error(`[ai] unknown AI_PROVIDER "${pinned}" — falling back to heuristic`);
      return null;
    }
    return factory();
  }

  const auto: AiProviderId[] = ["anthropic", "openai", "google"];
  const available = auto.find(hasKey);
  return available ? FACTORIES[available]() : null;
}

export function describeAiConfig(): { provider: AiProviderId | null; configured: boolean } {
  const provider = getAiProvider();
  return { provider: provider?.id ?? null, configured: provider !== null };
}
