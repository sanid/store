import { NextRequest, NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const TIMEOUT_MS = 15_000;

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  const email = request.nextUrl.searchParams.get("email") || "";

  if (!id || !email) {
    return NextResponse.json({ error: "id and email are required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "invalid email format" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(
      `${STRAPI_URL}/api/orders/${encodeURIComponent(id)}/invoice?email=${encodeURIComponent(email)}`,
      { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
  } catch (err) {
    console.error("[api/invoice] strapi fetch failed:", err);
    return NextResponse.json({ error: "Rechnungs-Service nicht erreichbar" }, { status: 504 });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return new NextResponse(text || "Rechnung nicht verfügbar", { status: res.status });
  }

  if (!res.body) {
    return NextResponse.json({ error: "Leere Antwort vom Rechnungs-Service" }, { status: 502 });
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("content-disposition") || "attachment; filename=rechnung.pdf",
      "Cache-Control": "no-store",
    },
  });
}
