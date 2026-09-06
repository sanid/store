import { AiProviderError } from "./types";
import type { AiProviderId } from "./types";

/** Transiente HTTP-Status: Rate-Limit, Ueberlast, Gateway-Fehler. */
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 700;

/**
 * Wiederholt einen Provider-Aufruf bei voruebergehenden Fehlern.
 *
 * Ohne das faellt eine einzelne Stoerung den Kunden direkt auf die
 * Erfahrungswert-Schaetzung zurueck — obwohl der naechste Versuch meist
 * durchlaeuft.
 *
 * Sonderfall 400: normalerweise ein Programmierfehler und nicht
 * wiederholenswert. Beobachtet wurde aber ein "Invalid request data" ohne
 * weitere Angaben, das bei identischem Payload sofort danach erfolgreich war —
 * also serverseitig transient. Deshalb genau EIN zusaetzlicher Versuch bei 400;
 * ein echter Schema-Fehler scheitert danach weiterhin und wird sichtbar.
 */
export async function withRetry<T>(
  provider: AiProviderId,
  fn: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  let spentBadRequestRetry = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const status = err instanceof AiProviderError ? err.status : undefined;
      // Kein Status = Netzwerk-/Timeout-Fehler, immer einen Versuch wert.
      let retryable = status === undefined || RETRYABLE_STATUS.has(status);

      if (status === 400 && !spentBadRequestRetry) {
        spentBadRequestRetry = true;
        retryable = true;
      }

      if (!retryable || attempt === MAX_ATTEMPTS) break;

      // Exponentiell mit Jitter, damit parallele Anfragen nicht im Gleichtakt
      // erneut auf einen ueberlasteten Endpunkt laufen.
      const delay = BASE_DELAY_MS * 2 ** (attempt - 1) * (0.5 + Math.random());
      console.warn(
        `[ai] ${provider} Versuch ${attempt}/${MAX_ATTEMPTS} fehlgeschlagen` +
          `${status ? ` (${status})` : ""}, neuer Versuch in ${Math.round(delay)} ms`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
