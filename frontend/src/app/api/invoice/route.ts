import { NextRequest, NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  const email = request.nextUrl.searchParams.get("email") || "";

  if (!id || !email) {
    return NextResponse.json({ error: "id and email are required" }, { status: 400 });
  }

  const res = await fetch(
    `${STRAPI_URL}/api/orders/${encodeURIComponent(id)}/invoice?email=${encodeURIComponent(email)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return new NextResponse(text || "Rechnung nicht verfügbar", { status: res.status });
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
