import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "dev-gate";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(request: NextRequest) {
  const expected = process.env.DEV_GATE_PASSCODE;
  if (!expected) {
    return NextResponse.json({ error: "Dev gate is not configured" }, { status: 503 });
  }

  let code = "";
  try {
    const body = await request.json();
    code = String(body?.code ?? "");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!code || !safeEqual(code, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}
