import { NextRequest, NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const TIMEOUT_MS = 10_000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${STRAPI_URL}/api/orders/validate-promo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const data = await res.json().catch(() => null);

    if (res.status >= 500) {
      console.error("[api/validate-promo] upstream 5xx:", res.status, data);
      return NextResponse.json(
        { valid: false, error: "Promo-Validierung vorübergehend nicht verfügbar" },
        { status: 502 }
      );
    }

    return NextResponse.json(data ?? { valid: false }, { status: res.status });
  } catch (err) {
    console.error("[api/validate-promo] strapi unreachable:", err);
    return NextResponse.json(
      { valid: false, error: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
