import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const STRAPI_URL =
  process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const TIMEOUT_MS = 60_000;

const RATE_LIMIT = Number(process.env.QUOTE_SUBMIT_RATE_LIMIT || 5);
const RATE_WINDOW_MS = Number(process.env.QUOTE_SUBMIT_RATE_WINDOW_MS || 60 * 60 * 1000);

/**
 * Reicht eine fertige Kalkulation als Anfrage an Strapi weiter.
 *
 * Bewusst ein reiner Proxy: Strapi validiert die Nutzdaten selbst und rechnet
 * den Preis neu, damit ein manipulierter Client kein Angebot mit Fantasiepreis
 * erzeugen kann.
 */
export async function POST(request: NextRequest) {
  const limit = rateLimit(`quote-submit:${clientIp(request.headers)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${STRAPI_URL}/api/quote-requests/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[api/quote/submit] strapi unreachable:", err);
    return NextResponse.json(
      { error: "Anfrage konnte nicht übermittelt werden. Bitte später erneut versuchen." },
      { status: 504 },
    );
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const detail =
      (data as { error?: { message?: string } } | null)?.error?.message ??
      "Anfrage konnte nicht gespeichert werden.";
    if (res.status >= 500) {
      console.error("[api/quote/submit] upstream 5xx:", res.status, detail);
      return NextResponse.json(
        { error: "Anfrage-Service vorübergehend nicht verfügbar." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: detail }, { status: res.status });
  }

  return NextResponse.json(data ?? {});
}
