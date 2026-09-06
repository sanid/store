/**
 * Typisierter Zugriff auf den Werkstatt-Katalog.
 *
 * Die Zahlen stehen NICHT hier: `quote-catalog.json` wird bei predev/prebuild
 * aus dem Backend synchronisiert (scripts/sync-quote-catalog.mjs), damit
 * Kalkulator-Vorschau und ausgestelltes Angebot dieselben Werte benutzen.
 * Aenderungen gehoeren nach
 * `backend/src/api/quote-request/services/quote-catalog.json`.
 *
 * Alle Preise in Cent.
 */
import CATALOG from "./quote-catalog.json";

export type ServiceId =
  | "reupholster"
  | "repair"
  | "cover"
  | "cushion"
  | "curtain-special"
  | "other";

export type ObjectTypeId =
  | "chair"
  | "stool"
  | "armchair"
  | "bench"
  | "sofa-2"
  | "sofa-3"
  | "corner-sofa"
  | "headboard"
  | "cushion-set"
  | "window"
  | "other";

export type MaterialKind = "fabric" | "leather";
export type ConditionId = "good" | "worn" | "damaged" | "severe";
export type ExtraId =
  | "foam-replace"
  | "springs-webbing"
  | "buttons-tufting"
  | "piping"
  | "zipper"
  | "wood-refinish"
  | "pattern-match"
  | "pickup-delivery";

export interface ServiceDef {
  id: ServiceId;
  label: string;
  hint: string;
  laborFactor: number;
  materialFactor: number;
}

export interface ObjectTypeDef {
  id: ObjectTypeId;
  label: string;
  fabric: { base: number; min: number; max: number };
  hours: { base: number; min: number; max: number };
  baseDifficulty: number;
  foamLiters: number;
}

export interface ExtraDef {
  id: ExtraId;
  label: string;
  hint: string;
  fixed?: number;
  hours?: number;
  fabricFactor?: number;
  perOrder?: boolean;
}

export interface LeatherGrade {
  id: string;
  label: string;
  pricePerSqm: number;
  hint: string;
  hex: string;
}

export const SERVICES = CATALOG.services as ServiceDef[];
export const OBJECT_TYPES = CATALOG.objectTypes as ObjectTypeDef[];
export const EXTRAS = CATALOG.extras as ExtraDef[];
export const CONDITIONS = CATALOG.conditions as {
  id: ConditionId;
  label: string;
  laborFactor: number;
}[];
export const LEATHER_GRADES = CATALOG.leatherGrades as LeatherGrade[];

export const DIFFICULTY_FACTOR = CATALOG.difficultyFactor;
export const DIFFICULTY_LABEL = CATALOG.difficultyLabel;

export const LABOR_RATE_PER_HOUR = CATALOG.rates.laborRatePerHour;
export const SETUP_FEE = CATALOG.rates.setupFee;
export const CONSUMABLES_RATE = CATALOG.rates.consumablesRate;
export const LEATHER_SQM_PER_FABRIC_METER = CATALOG.rates.leatherSqmPerFabricMeter;
export const VAT_RATE = CATALOG.rates.vatRate;

export function getObjectType(id: ObjectTypeId): ObjectTypeDef {
  return OBJECT_TYPES.find((t) => t.id === id) ?? OBJECT_TYPES[OBJECT_TYPES.length - 1];
}

export function getService(id: ServiceId): ServiceDef {
  return SERVICES.find((s) => s.id === id) ?? SERVICES[SERVICES.length - 1];
}

export function getExtra(id: ExtraId): ExtraDef | undefined {
  return EXTRAS.find((e) => e.id === id);
}

export function getCondition(id: ConditionId) {
  return CONDITIONS.find((c) => c.id === id) ?? CONDITIONS[1];
}

export function getLeatherGrade(id: string): LeatherGrade | undefined {
  return LEATHER_GRADES.find((g) => g.id === id);
}
