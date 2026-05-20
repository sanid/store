import { NextRequest, NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, email, ...addressFields } = body;

  if (!id || !email) {
    return NextResponse.json({ error: "id and email are required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return NextResponse.json({ error: "invalid email format" }, { status: 400 });
  }

  try {
    const res = await fetch(`${STRAPI_URL}/api/orders/${encodeURIComponent(id)}/address`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...addressFields }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || data?.error || "Adressänderung fehlgeschlagen" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/update-address] strapi unreachable:", err);
    return NextResponse.json({ error: "Service nicht erreichbar" }, { status: 500 });
  }
}
