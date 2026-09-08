import { NextRequest, NextResponse } from "next/server";
import { AiProviderError, getAiProvider } from "@/lib/ai";
import type { AiImage } from "@/lib/ai";
import { OBJECT_TYPES, SERVICES } from "@/lib/quote/catalog";
import type { ObjectTypeId, ServiceId } from "@/lib/quote/catalog";
import { heuristicEstimate, normalizeEstimate } from "@/lib/quote/estimate";
import {
  ANALYSIS_SCHEMA,
  ANALYSIS_SCHEMA_DESCRIPTION,
  ANALYSIS_SCHEMA_NAME,
} from "@/lib/quote/schema";
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from "@/lib/quote/prompt";
import { defaultSelection, generateQuoteCode, priceQuote } from "@/lib/quote/pricing";
import type { EstimateSource, QuoteRequestInput, QuoteResponse } from "@/lib/quote/types";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const MAX_PHOTOS = 8;
/** Per image, after the client has already downscaled. Base64 is ~4/3 of bytes. */
const MAX_PHOTO_BASE64_BYTES = 5_000_000;
const MAX_DESCRIPTION = 2000;
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const RATE_LIMIT = Number(process.env.QUOTE_RATE_LIMIT || 8);
const RATE_WINDOW_MS = Number(process.env.QUOTE_RATE_WINDOW_MS || 10 * 60 * 1000);

const SERVICE_IDS = new Set<string>(SERVICES.map((s) => s.id));
const OBJECT_IDS = new Set<string>(OBJECT_TYPES.map((t) => t.id));

export async function POST(request: NextRequest) {
  const limit = rateLimit(`quote:${clientIp(request.headers)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: "Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.",
        retryAfter: limit.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const parsed = parseInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const input = parsed.input;

  const provider = getAiProvider();
  let source: EstimateSource = "heuristic";
  let notice: string | undefined;
  let estimate = heuristicEstimate(input);

  if (provider) {
    try {
      const result = await provider.analyze({
        system: ANALYSIS_SYSTEM_PROMPT,
        prompt: buildAnalysisPrompt(input),
        images: toAiImages(input.photos),
        schema: ANALYSIS_SCHEMA,
        schemaName: ANALYSIS_SCHEMA_NAME,
        schemaDescription: ANALYSIS_SCHEMA_DESCRIPTION,
        // The structured assessment — incl. the style/era/process texts the
        // customer reads — needs more than the default budget, but it is all
        // short text: far less than the outline drawing used to cost.
        maxTokens: 4000,
      });
      estimate = normalizeEstimate(result.data, input).estimate;
      source = "ai";
      // The static prefix (rules + catalog + schema) is cached; only the photos
      // are ever billed in full. A cacheRead of 0 on back-to-back requests means
      // something started varying in that prefix.
      const u = result.usage;
      if (u) {
        console.info(
          `[api/quote] ${provider.id}/${provider.model} in=${u.inputTokens ?? 0} out=${u.outputTokens ?? 0} cacheWrite=${u.cacheWriteTokens ?? 0} cacheRead=${u.cacheReadTokens ?? 0}`,
        );
      }
    } catch (err) {
      // A failed analysis must not fail the whole calculator — fall back to the
      // catalog baseline and tell the customer the estimate is rougher.
      const message = err instanceof AiProviderError ? err.message : String(err);
      console.error(`[api/quote] ${provider.id} analysis failed:`, message);
      notice =
        "Die Bildanalyse war gerade nicht verfügbar. Der angezeigte Richtwert beruht auf Erfahrungswerten und ist entsprechend ungenauer.";
    }
  } else {
    notice =
      "Es ist derzeit kein KI-Dienst konfiguriert. Der angezeigte Richtwert beruht auf Erfahrungswerten der Werkstatt.";
  }

  const selection = defaultSelection(estimate);
  const response: QuoteResponse = {
    quoteCode: generateQuoteCode(),
    estimate,
    selection,
    breakdown: priceQuote(estimate, selection),
    meta: {
      source,
      provider: source === "ai" ? (provider?.id ?? null) : null,
      model: source === "ai" ? (provider?.model ?? null) : null,
      notice,
    },
  };

  return NextResponse.json(response);
}

function parseInput(body: unknown): { input: QuoteRequestInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Ungültige Anfrage." };
  const b = body as Record<string, unknown>;

  const service = String(b.service ?? "");
  if (!SERVICE_IDS.has(service)) return { error: "Unbekannte Leistungsart." };

  const objectType = String(b.objectType ?? "");
  if (!OBJECT_IDS.has(objectType)) return { error: "Unbekannter Objekttyp." };

  const quantity = Number(b.quantity);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 40) {
    return { error: "Die Anzahl muss zwischen 1 und 40 liegen." };
  }

  const photos = Array.isArray(b.photos) ? b.photos : [];
  if (photos.length > MAX_PHOTOS) {
    return { error: `Maximal ${MAX_PHOTOS} Fotos.` };
  }
  const cleanPhotos: string[] = [];
  for (const photo of photos) {
    if (typeof photo !== "string") return { error: "Ungültiges Bildformat." };
    const match = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(photo);
    if (!match || !ALLOWED_MEDIA_TYPES.has(match[1])) {
      return { error: "Nur JPEG, PNG, WebP oder GIF werden unterstützt." };
    }
    if (match[2].length > MAX_PHOTO_BASE64_BYTES) {
      return { error: "Ein Bild ist zu groß. Bitte kleinere Dateien verwenden." };
    }
    cleanPhotos.push(photo);
  }

  const description = String(b.description ?? "").slice(0, MAX_DESCRIPTION);

  const rawDims = (b.dimensions ?? {}) as Record<string, unknown>;
  const dimensions = {
    width: dimension(rawDims.width),
    depth: dimension(rawDims.depth),
    height: dimension(rawDims.height),
  };

  return {
    input: {
      service: service as ServiceId,
      objectType: objectType as ObjectTypeId,
      quantity: Math.round(quantity),
      description,
      dimensions,
      photos: cleanPhotos,
    },
  };
}

function dimension(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= 1000 ? Math.round(n) : undefined;
}

function toAiImages(photos: string[]): AiImage[] {
  return photos.map((photo) => {
    const [header, data] = photo.split(",", 2);
    const mediaType = /^data:([^;]+);/.exec(header)?.[1] ?? "image/jpeg";
    return { mediaType, base64: data };
  });
}
