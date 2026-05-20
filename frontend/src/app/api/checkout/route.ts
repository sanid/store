import { NextRequest, NextResponse } from "next/server";

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${STRAPI_URL}/api/orders/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: "Payment initiation failed" } }));
      return NextResponse.json(
        { error: error.error?.message || "Payment initiation failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/checkout] payment service unreachable:", err);
    return NextResponse.json(
      { error: "Failed to connect to payment service" },
      { status: 500 }
    );
  }
}
