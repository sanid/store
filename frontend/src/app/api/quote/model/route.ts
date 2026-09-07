import { NextRequest, NextResponse } from "next/server";
import {
  FalError,
  getResult,
  getStatus,
  isFalConfigured,
  submitReconstruction,
} from "@/lib/fal/sam3d";
import { OBJECT_TYPES } from "@/lib/quote/catalog";
import type { ObjectTypeId } from "@/lib/quote/catalog";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Same ceiling as the analysis route — the photo has already been downscaled. */
const MAX_PHOTO_BASE64_BYTES = 5_000_000;
const ALLOWED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const RATE_LIMIT = Number(process.env.QUOTE_MODEL_RATE_LIMIT || 8);
const RATE_WINDOW_MS = Number(process.env.QUOTE_MODEL_RATE_WINDOW_MS || 10 * 60 * 1000);

const OBJECT_IDS = new Set<string>(OBJECT_TYPES.map((t) => t.id));

/**
 * SAM segments by text prompt, and it wants the plain English word for the
 * thing — the German label from the catalog would only confuse it.
 */
const SEGMENTATION_PROMPT: Record<ObjectTypeId, string> = {
  chair: "chair",
  stool: "stool",
  armchair: "armchair",
  bench: "bench",
  "sofa-2": "sofa",
  "sofa-3": "sofa",
  "corner-sofa": "sectional sofa",
  headboard: "bed headboard",
  "cushion-set": "cushion",
  window: "curtain",
  other: "furniture",
};

/**
 * Start a 3D reconstruction of the customer's own piece.
 *
 * Fire-and-poll: this returns a request id immediately and the browser asks
 * `GET` below how far along it is, so the 30–60 s the model needs run alongside
 * the price analysis instead of after it.
 */
export async function POST(request: NextRequest) {
  if (!isFalConfigured()) {
    // Not an error: the calculator works without the 3D preview and falls back
    // to the drawing from the analysis.
    return NextResponse.json({ available: false }, { status: 200 });
  }

  const limit = rateLimit(`quote-model:${clientIp(request.headers)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json({ available: false, error: "rate-limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const photo = typeof b.photo === "string" ? b.photo : "";
  const match = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(photo);
  if (!match || !ALLOWED_MEDIA_TYPES.has(match[1])) {
    return NextResponse.json({ error: "Ungültiges Bildformat." }, { status: 400 });
  }
  if (match[2].length > MAX_PHOTO_BASE64_BYTES) {
    return NextResponse.json({ error: "Bild zu groß." }, { status: 400 });
  }

  const objectType = String(b.objectType ?? "other");
  const prompt = SEGMENTATION_PROMPT[
    (OBJECT_IDS.has(objectType) ? objectType : "other") as ObjectTypeId
  ];

  try {
    const { requestId } = await submitReconstruction({ imageDataUrl: photo, prompt });
    return NextResponse.json({ available: true, requestId });
  } catch (err) {
    console.error("[api/quote/model] submit failed:", err instanceof FalError ? err.message : err);
    return NextResponse.json({ available: false, error: "submit-failed" }, { status: 200 });
  }
}

/**
 * Poll one reconstruction. Deliberately chatty — the browser turns
 * `queuePosition` and the runner's own log line into a progress display.
 */
export async function GET(request: NextRequest) {
  if (!isFalConfigured()) {
    return NextResponse.json({ available: false }, { status: 200 });
  }

  const requestId = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[\w-]{8,80}$/.test(requestId)) {
    return NextResponse.json({ error: "Ungültige Request-ID." }, { status: 400 });
  }

  try {
    const status = await getStatus(requestId);
    if (status.status !== "COMPLETED") {
      return NextResponse.json({
        status: status.status,
        queuePosition: status.queuePosition,
        note: status.note,
      });
    }

    // The mesh itself is served from our own origin so the browser may read its
    // texture pixels — see `model/file`.
    await getResult(requestId);
    return NextResponse.json({
      status: "COMPLETED",
      modelUrl: `/api/quote/model/file?id=${encodeURIComponent(requestId)}`,
    });
  } catch (err) {
    console.error("[api/quote/model] poll failed:", err instanceof FalError ? err.message : err);
    return NextResponse.json({ status: "FAILED" }, { status: 200 });
  }
}
