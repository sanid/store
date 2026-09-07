/**
 * SAM 3D Objects on fal.ai — turns one customer photo into a textured GLB.
 *
 * Only the queue API is used: the model takes 30–60 s, which is far too long to
 * hold a request open, so we submit, hand the id to the browser and let it poll
 * `/api/quote/model`. Nothing here ever reaches the client directly — the route
 * in front of it decides what is safe to pass on.
 */

const MODEL_ID = "fal-ai/sam-3/3d-objects";
const QUEUE_BASE = "https://queue.fal.run";
/** fal serves generated files from these hosts; anything else we refuse to hand on. */
const ALLOWED_FILE_HOSTS = [".fal.media", ".fal.run", ".fal.ai"];
const SUBMIT_TIMEOUT_MS = 30_000;
const POLL_TIMEOUT_MS = 15_000;

export type FalStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";

export interface FalSubmitResult {
  requestId: string;
}

export interface FalStatusResult {
  status: FalStatus;
  queuePosition?: number;
  /** Last runner log line, already trimmed — used for the progress panel. */
  note?: string;
}

export interface FalModelResult {
  /** Combined textured mesh of everything that was detected. */
  glbUrl: string;
  /** Per-object meshes, when the photo held more than one piece. */
  individualGlbUrls: string[];
}

export class FalError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FalError";
  }
}

export function falKey(): string | null {
  return process.env.FAL_KEY || process.env.FAL_API_KEY || null;
}

export function isFalConfigured(): boolean {
  return falKey() !== null;
}

function authHeaders(): Record<string, string> {
  const key = falKey();
  if (!key) throw new FalError("FAL_KEY ist nicht konfiguriert.");
  return { Authorization: `Key ${key}`, "Content-Type": "application/json" };
}

/**
 * Queue a reconstruction. `prompt` is SAM's text segmentation cue — passing the
 * object the customer picked keeps it from latching onto the rug or the wall.
 */
export async function submitReconstruction(args: {
  imageDataUrl: string;
  prompt: string;
}): Promise<FalSubmitResult> {
  const res = await fetch(`${QUEUE_BASE}/${MODEL_ID}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      image_url: args.imageDataUrl,
      prompt: args.prompt,
      // The texture is the whole point here: it is what we sample to find the
      // upholstered surfaces and swap the material on.
      export_textured_glb: true,
      detection_threshold: 0.35,
    }),
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new FalError(errorMessage(data) ?? `fal antwortete mit ${res.status}`, res.status);
  }

  const requestId = (data as { request_id?: unknown } | null)?.request_id;
  if (typeof requestId !== "string" || !/^[\w-]{8,80}$/.test(requestId)) {
    throw new FalError("fal lieferte keine verwertbare Request-ID.");
  }
  return { requestId };
}

export async function getStatus(requestId: string): Promise<FalStatusResult> {
  const res = await fetch(`${requestsBase()}/${encodeURIComponent(requestId)}/status?logs=1`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
  });

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    throw new FalError(errorMessage(data) ?? `fal antwortete mit ${res.status}`, res.status);
  }

  const status = String(data?.status ?? "");
  if (status !== "IN_QUEUE" && status !== "IN_PROGRESS" && status !== "COMPLETED") {
    throw new FalError(`Unbekannter fal-Status "${status}".`);
  }

  const queuePosition = Number(data?.queue_position);
  return {
    status,
    queuePosition: Number.isFinite(queuePosition) ? queuePosition : undefined,
    note: lastLogLine(data?.logs),
  };
}

export async function getResult(requestId: string): Promise<FalModelResult> {
  const res = await fetch(`${requestsBase()}/${encodeURIComponent(requestId)}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
  });

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    throw new FalError(errorMessage(data) ?? `fal antwortete mit ${res.status}`, res.status);
  }

  const individual = Array.isArray(data?.individual_glbs)
    ? data.individual_glbs.map(fileUrl).filter((u): u is string => u !== null)
    : [];
  const combined = fileUrl(data?.model_glb) ?? individual[0] ?? null;

  if (!combined) {
    throw new FalError("fal lieferte kein 3D-Modell zurück.");
  }
  return { glbUrl: combined, individualGlbUrls: individual };
}

/**
 * Sub-path models queue under their base app, i.e. `fal-ai/sam-3`, not
 * `fal-ai/sam-3/3d-objects`.
 */
function requestsBase(): string {
  const base = MODEL_ID.split("/").slice(0, 2).join("/");
  return `${QUEUE_BASE}/${base}/requests`;
}

/** A URL from an upstream response is only forwarded if it really is a fal file. */
function fileUrl(file: unknown): string | null {
  const url = (file as { url?: unknown } | null)?.url;
  if (typeof url !== "string") return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_FILE_HOSTS.some((suffix) => host.endsWith(suffix))) return null;
  return parsed.toString();
}

function errorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string") return d.detail;
  if (typeof d.error === "string") return d.error;
  if (typeof d.message === "string") return d.message;
  return null;
}

function lastLogLine(logs: unknown): string | undefined {
  if (!Array.isArray(logs) || logs.length === 0) return undefined;
  const message = (logs[logs.length - 1] as { message?: unknown })?.message;
  return typeof message === "string" ? message.trim().slice(0, 160) : undefined;
}
