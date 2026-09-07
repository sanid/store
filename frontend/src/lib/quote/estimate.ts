import {
  CONDITIONS,
  EXTRAS,
  OBJECT_TYPES,
  SERVICES,
  getObjectType,
  getService,
} from "./catalog";
import type {
  ConditionId,
  ExtraId,
  MaterialKind,
  ObjectTypeId,
  ServiceId,
} from "./catalog";
import type {
  EstimateRange,
  OutlinePart,
  OutlinePartRole,
  QuoteEstimate,
  QuoteOutline,
  QuoteRequestInput,
} from "./types";

const OBJECT_IDS = new Set<string>(OBJECT_TYPES.map((t) => t.id));
const SERVICE_IDS = new Set<string>(SERVICES.map((s) => s.id));
const CONDITION_IDS = new Set<string>(CONDITIONS.map((c) => c.id));
const EXTRA_IDS = new Set<string>(EXTRAS.filter((e) => !e.perOrder).map((e) => e.id));

/**
 * Turn raw model output into a `QuoteEstimate` we are willing to price.
 *
 * The providers already guarantee the JSON *shape*, so this pass is about
 * plausibility: a model that says a dining chair needs 40 metres of fabric gets
 * clamped to the workshop's own range rather than producing a four-figure
 * quote. Every clamp is recorded so the UI can be honest about it.
 */
export function normalizeEstimate(
  raw: unknown,
  input: QuoteRequestInput,
): { estimate: QuoteEstimate; clamped: string[] } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const clamped: string[] = [];

  const objectType = enumOr<ObjectTypeId>(r.objectType, OBJECT_IDS, input.objectType);
  const service = enumOr<ServiceId>(r.service, SERVICE_IDS, input.service);
  const condition = enumOr<ConditionId>(r.condition, CONDITION_IDS, "worn");

  // Quantity stays under the user's control — the model may miscount pieces in
  // a photo, but the customer knows how many they own.
  const quantity = clampInt(input.quantity, 1, 40);

  const typeDef = getObjectType(objectType);
  const serviceDef = getService(service);

  // Measurements are the single strongest signal we have besides the photos:
  // a 240 cm bench is not a 140 cm bench, and the catalog baseline is written
  // for the reference size.
  const sizeFactor = dimensionFactor(input);

  const expectedFabric = typeDef.fabric.base * serviceDef.materialFactor * sizeFactor * quantity;
  const expectedHours = typeDef.hours.base * serviceDef.laborFactor * sizeFactor * quantity;

  // Two windows, intersected. The catalog range stops physically impossible
  // numbers; the band around the expectation stops a model that has anchored on
  // the wrong object from producing a plausible-looking but wrong quote. The
  // narrower the window, the narrower the price the customer finally sees.
  const fabricWindow = intersect(
    {
      min: typeDef.fabric.min * serviceDef.materialFactor * sizeFactor * quantity,
      max: typeDef.fabric.max * serviceDef.materialFactor * sizeFactor * quantity,
    },
    { min: expectedFabric * 0.55, max: expectedFabric * 1.9 },
  );
  const hoursWindow = intersect(
    {
      min: typeDef.hours.min * serviceDef.laborFactor * sizeFactor * quantity,
      max: typeDef.hours.max * serviceDef.laborFactor * sizeFactor * quantity,
    },
    { min: expectedHours * 0.55, max: expectedHours * 1.9 },
  );

  const fabricRaw = num(r.fabricMeters, expectedFabric);
  const fabricMeters = round2(clamp(fabricRaw, fabricWindow.min, fabricWindow.max));
  if (relDiff(fabricMeters, fabricRaw) > 0.02) {
    clamped.push("Stoffbedarf auf den Erfahrungsbereich der Werkstatt angepasst.");
  }

  const hoursRaw = num(r.laborHours, expectedHours);
  const laborHours = round2(clamp(hoursRaw, hoursWindow.min, hoursWindow.max));
  if (relDiff(laborHours, hoursRaw) > 0.02) {
    clamped.push("Arbeitszeit auf den Erfahrungsbereich der Werkstatt angepasst.");
  }

  // The model's own low/high guesses drive the displayed price band, so they
  // are kept tight: a band wider than this says less than a single number.
  const fabricMetersRange = normalizeRange(r.fabricMetersMin, r.fabricMetersMax, fabricMeters, 0.16);
  const laborHoursRange = normalizeRange(r.laborHoursMin, r.laborHoursMax, laborHours, 0.18);

  const foamLiters = round2(clamp(num(r.foamLiters, 0), 0, typeDef.foamLiters * quantity * 2.5));
  const difficulty = clampInt(num(r.difficulty, typeDef.baseDifficulty), 1, 5);

  // Confidence is never taken from the model alone. A crisp analysis of three
  // sharp photos with measurements deserves a tight price; the same model
  // sounding equally sure about one blurry photo does not.
  const inputQuality = scoreInput(input);
  const confidence = round2(clamp(num(r.confidence, 0.5) * (0.55 + 0.45 * inputQuality), 0, 1));

  const suggestedExtras = strArray(r.suggestedExtras)
    .filter((id): id is ExtraId => EXTRA_IDS.has(id))
    .slice(0, EXTRA_IDS.size);

  const estimate: QuoteEstimate = {
    objectType,
    objectLabel: str(r.objectLabel, typeDef.label).slice(0, 160),
    service,
    quantity,
    materialKind: (r.materialKind === "leather" ? "leather" : "fabric") as MaterialKind,
    fabricMeters,
    fabricMetersRange,
    foamLiters,
    laborHours,
    laborHoursRange,
    difficulty,
    difficultyReasons: strArray(r.difficultyReasons).slice(0, 5),
    condition,
    suggestedExtras: [...new Set(suggestedExtras)],
    confidence,
    inputQuality,
    outline: sanitizeOutline(r.outline),
    summary: str(r.summary, "Einschätzung auf Basis der übermittelten Angaben.").slice(0, 600),
    assumptions: [...strArray(r.assumptions).slice(0, 6), ...clamped],
    riskFlags: strArray(r.riskFlags).slice(0, 6),
    followUpQuestions: strArray(r.followUpQuestions).slice(0, 3),
  };

  if (objectType !== input.objectType) {
    estimate.assumptions.unshift(
      `Auf den Bildern wurde "${typeDef.label}" erkannt — abweichend von Ihrer Angabe "${
        getObjectType(input.objectType).label
      }".`,
    );
  }

  return { estimate, clamped };
}

/**
 * Deterministic estimate straight from the catalog baselines. Used when no AI
 * provider is configured and as the fallback when a configured provider fails,
 * so the calculator never leaves the customer with nothing.
 */
export function heuristicEstimate(input: QuoteRequestInput): QuoteEstimate {
  const typeDef = getObjectType(input.objectType);
  const serviceDef = getService(input.service);
  const quantity = clampInt(input.quantity, 1, 40);

  // Photos can't be read here, so dimensions are the only sharpening signal.
  const sizeFactor = dimensionFactor(input);
  const fabricMeters = round2(typeDef.fabric.base * serviceDef.materialFactor * sizeFactor * quantity);
  const laborHours = round2(typeDef.hours.base * serviceDef.laborFactor * sizeFactor * quantity);

  return {
    objectType: input.objectType,
    objectLabel: typeDef.label,
    service: input.service,
    quantity,
    materialKind: "fabric",
    fabricMeters,
    // Nothing was looked at, so the band around a table lookup is honestly wide.
    fabricMetersRange: spreadRange(fabricMeters, 0.22),
    foamLiters: 0,
    laborHours,
    laborHoursRange: spreadRange(laborHours, 0.25),
    difficulty: typeDef.baseDifficulty,
    difficultyReasons: ["Erfahrungswert der Werkstatt für diesen Objekttyp"],
    condition: "worn",
    suggestedExtras: [],
    // Deliberately low: this is a table lookup, not an analysis of the object.
    confidence: 0.35,
    inputQuality: scoreInput(input),
    summary: `Richtwert für ${serviceDef.label.toLowerCase()} an ${quantity}× ${typeDef.label}, basierend auf Erfahrungswerten der Werkstatt.`,
    assumptions: [
      "Diese Schätzung basiert nur auf Ihren Angaben, nicht auf einer Bildanalyse.",
      "Standardaufbau ohne Sonderformen angenommen.",
    ],
    riskFlags: [],
    followUpQuestions: [
      "Wie sind die genauen Maße des Objekts?",
      "Soll die vorhandene Polsterung erneuert werden?",
    ],
  };
}

/**
 * How much bigger or smaller the customer's piece is than the reference piece
 * the catalog baseline was written for. Clamped hard — a typo of 2000 cm must
 * not multiply the quote.
 */
function dimensionFactor(input: QuoteRequestInput): number {
  const dims = input.dimensions;
  const main = dims?.width && dims.width > 0 ? dims.width : undefined;
  if (!main) return 1;
  const ratio = main / referenceWidth(input.objectType);
  // Fabric and hours grow slower than width: a bench twice as long is not twice
  // the work, because setup and shaping are per piece, not per centimetre.
  return clamp(Math.pow(ratio, 0.8), 0.55, 2.2);
}

/**
 * Score how much the customer actually gave us to work with. Drives confidence,
 * and the UI turns it into "add measurements and the range gets tighter".
 */
export function scoreInput(input: QuoteRequestInput): number {
  let score = 0;
  const photos = input.photos.length;
  if (photos >= 5) score += 0.55;
  else if (photos >= 3) score += 0.48;
  else if (photos === 2) score += 0.36;
  else if (photos === 1) score += 0.2;

  const dims = input.dimensions;
  if (dims?.width) score += 0.16;
  if (dims?.depth) score += 0.07;
  if (dims?.height) score += 0.07;

  const text = input.description.trim().length;
  if (text >= 120) score += 0.15;
  else if (text >= 40) score += 0.09;

  return round2(clamp(score, 0, 1));
}

/** Intersect two windows, never returning an empty or inverted one. */
function intersect(a: EstimateRange, b: EstimateRange): EstimateRange {
  const min = Math.max(a.min, b.min);
  const max = Math.min(a.max, b.max);
  return max > min ? { min, max } : { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) };
}

/** A symmetric band around a value, for when nobody gave us a better one. */
function spreadRange(value: number, spread: number): EstimateRange {
  return { min: round2(value * (1 - spread)), max: round2(value * (1 + spread)) };
}

/**
 * The model's low/high guess, kept honest: it must bracket the point estimate
 * and may not open wider than `maxSpread` in either direction.
 */
function normalizeRange(
  rawMin: unknown,
  rawMax: unknown,
  value: number,
  maxSpread: number,
): EstimateRange {
  const fallback = spreadRange(value, maxSpread * 0.6);
  const min = typeof rawMin === "number" && Number.isFinite(rawMin) ? rawMin : fallback.min;
  const max = typeof rawMax === "number" && Number.isFinite(rawMax) ? rawMax : fallback.max;
  return {
    min: round2(clamp(Math.min(min, value), value * (1 - maxSpread), value)),
    max: round2(clamp(Math.max(max, value), value, value * (1 + maxSpread))),
  };
}

const OUTLINE_ROLES = new Set<string>([
  "upholstery",
  "cushion",
  "frame",
  "leg",
  "seam",
  "detail",
]);
/** Path data only: digits, separators and the SVG path commands. Nothing else. */
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9,.\-+eE\s]+$/;
const MAX_OUTLINE_PARTS = 30;
const MAX_PATH_LENGTH = 900;

/**
 * The drawing the model returns is never markup — it is a list of roles and
 * path strings, and this is where they are proven to be exactly that before any
 * of it reaches an <svg>. Anything suspicious drops the whole outline and the
 * UI falls back to the built-in silhouette.
 */
export function sanitizeOutline(raw: unknown): QuoteOutline | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const parts = (raw as { parts?: unknown }).parts;
  if (!Array.isArray(parts) || parts.length === 0) return undefined;

  const clean: OutlinePart[] = [];
  for (const part of parts.slice(0, MAX_OUTLINE_PARTS)) {
    if (!part || typeof part !== "object") continue;
    const { role, d } = part as { role?: unknown; d?: unknown };
    if (typeof role !== "string" || !OUTLINE_ROLES.has(role)) continue;
    if (typeof d !== "string") continue;
    const path = d.trim();
    if (!path || path.length > MAX_PATH_LENGTH) continue;
    if (!/^[Mm]/.test(path) || !PATH_DATA.test(path)) continue;
    clean.push({ role: role as OutlinePartRole, d: path });
  }

  // A couple of stray strokes is not a drawing — better the honest schematic.
  if (clean.length < 3) return undefined;
  if (!clean.some((p) => p.role === "upholstery" || p.role === "cushion")) return undefined;
  return { parts: clean };
}

function relDiff(a: number, b: number): number {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-6);
  return Math.abs(a - b) / scale;
}

function referenceWidth(id: ObjectTypeId): number {
  switch (id) {
    case "chair":
    case "stool":
      return 45;
    case "armchair":
      return 80;
    case "bench":
    case "headboard":
      return 140;
    case "sofa-2":
      return 160;
    case "sofa-3":
      return 210;
    case "corner-sofa":
      return 280;
    case "cushion-set":
      return 50;
    case "window":
      return 120;
    default:
      return 100;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function clampInt(v: number, min: number, max: number): number {
  return Math.round(clamp(Number.isFinite(v) ? v : min, min, max));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

function enumOr<T extends string>(v: unknown, allowed: Set<string>, fallback: T): T {
  return typeof v === "string" && allowed.has(v) ? (v as T) : fallback;
}
