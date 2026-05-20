import { NextRequest, NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || "";
  const email = request.nextUrl.searchParams.get("email") || "";

  if (!id || !email) {
    return NextResponse.json({ error: "id and email are required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "invalid email format" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${STRAPI_URL}/api/orders/lookup?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Bestellung nicht gefunden" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/order-lookup] strapi unreachable:", err);
    return NextResponse.json({ error: "Lookup-Service nicht erreichbar" }, { status: 500 });
  }
}
