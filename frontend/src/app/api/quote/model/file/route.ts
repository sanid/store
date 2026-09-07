import { NextRequest, NextResponse } from "next/server";
import { FalError, getResult, isFalConfigured } from "@/lib/fal/sam3d";

/** A generated mesh is a few MB; anything far beyond that is not ours. */
const MAX_BYTES = 80 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 60_000;

/**
 * Stream a finished mesh through our own origin.
 *
 * Two reasons this is not a redirect to fal: the browser has to read the GLB's
 * texture pixels to segment the piece, which only works without cross-origin
 * taint, and the customer's fal request id never turns into a public asset URL
 * we have to keep secret.
 */
export async function GET(request: NextRequest) {
  if (!isFalConfigured()) {
    return NextResponse.json({ error: "Nicht verfügbar." }, { status: 404 });
  }

  const requestId = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[\w-]{8,80}$/.test(requestId)) {
    return NextResponse.json({ error: "Ungültige Request-ID." }, { status: 400 });
  }

  let glbUrl: string;
  try {
    ({ glbUrl } = await getResult(requestId));
  } catch (err) {
    console.error("[api/quote/model/file] result failed:", err instanceof FalError ? err.message : err);
    return NextResponse.json({ error: "Modell nicht verfügbar." }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(glbUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (err) {
    console.error("[api/quote/model/file] fetch failed:", err);
    return NextResponse.json({ error: "Modell nicht erreichbar." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Modell nicht erreichbar." }, { status: 502 });
  }

  const length = Number(upstream.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BYTES) {
    return NextResponse.json({ error: "Modell zu groß." }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "model/gltf-binary",
      "Content-Length": upstream.headers.get("content-length") ?? "",
      // The mesh for a given request never changes, and the id is unguessable.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
