import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const COOKIE_NAME = "dev-gate";

export default function middleware(request: NextRequest) {
  // Server-side dev gate. Enabled only when DEV_GATE_PASSCODE is set; never ships
  // the passcode to the client. Cookie is httpOnly so it can't be forged from JS.
  const gateEnabled = !!process.env.DEV_GATE_PASSCODE;
  if (gateEnabled) {
    const { pathname } = request.nextUrl;
    const exempt =
      pathname === "/dev-gate" ||
      pathname.startsWith("/api/dev-gate") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/_vercel") ||
      /\.[a-zA-Z0-9]+$/.test(pathname);

    if (exempt) {
      return NextResponse.next();
    }

    if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
      const url = request.nextUrl.clone();
      url.pathname = "/dev-gate";
      url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/",
    "/(de|en)/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/dev-gate",
  ],
};
