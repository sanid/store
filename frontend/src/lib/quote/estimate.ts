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
import type { QuoteEstimate, QuoteRequestInput } from "./types";

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

  const fabricRange = {
    min: typeDef.fabric.min * serviceDef.materialFactor * quantity,
    max: typeDef.fabric.max * serviceDef.materialFactor * quantity,
  };
  const hoursRange = {
    min: typeDef.hours.min * serviceDef.laborFactor * quantity,
    max: typeDef.hours.max * serviceDef.laborFactor * quantity,
  };

  const fabricRaw = num(r.fabricMeters, typeDef.fabric.base * serviceDef.materialFactor * quantity);
  const fabricMeters = round2(clamp(fabricRaw, fabricRange.min, fabricRange.max));
  if (Math.abs(fabricMeters - fabricRaw) > 0.05) {
    clamped.push(
      `Stoffbedarf auf den Werkstatt-Erfahrungsbereich (${round2(fabricRange.min)}–${round2(
        fabricRange.max,
      )} lfm) begrenzt.`,
    );
  }

  const hoursRaw = num(r.laborHours, typeDef.hours.base * serviceDef.laborFactor * quantity);
  const laborHours = round2(clamp(hoursRaw, hoursRange.min, hoursRange.max));
  if (Math.abs(laborHours - hoursRaw) > 0.05) {
    clamped.push(
      `Arbeitszeit auf den Werkstatt-Erfahrungsbereich (${round2(hoursRange.min)}–${round2(
        hoursRange.max,
      )} Std.) begrenzt.`,
    );
  }

  const foamLiters = round2(clamp(num(r.foamLiters, 0), 0, typeDef.foamLiters * quantity * 2.5));
  const difficulty = clampInt(num(r.difficulty, typeDef.baseDifficulty), 1, 5);
  const confidence = clamp(num(r.confidence, 0.5), 0, 1);

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
    foamLiters,
    laborHours,
    difficulty,
    difficultyReasons: strArray(r.difficultyReasons).slice(0, 5),
    condition,
    suggestedExtras: [...new Set(suggestedExtras)],
    confidence,
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
  const dims = input.dimensions;
  const sizeFactor =
    dims?.width && dims.width > 0 ? clamp(dims.width / referenceWidth(input.objectType), 0.5, 2.2) : 1;

  return {
    objectType: input.objectType,
    objectLabel: typeDef.label,
    service: input.service,
    quantity,
    materialKind: "fabric",
    fabricMeters: round2(typeDef.fabric.base * serviceDef.materialFactor * sizeFactor * quantity),
    foamLiters: 0,
    laborHours: round2(typeDef.hours.base * serviceDef.laborFactor * sizeFactor * quantity),
    difficulty: typeDef.baseDifficulty,
    difficultyReasons: ["Erfahrungswert der Werkstatt für diesen Objekttyp"],
    condition: "worn",
    suggestedExtras: [],
    // Deliberately low: this is a table lookup, not an analysis of the object.
    confidence: 0.35,
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
