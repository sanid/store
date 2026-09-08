import type {
  ConditionId,
  ExtraId,
  MaterialKind,
  ObjectTypeId,
  ServiceId,
} from "./catalog";

/** What the user tells us before any analysis runs. */
export interface QuoteRequestInput {
  service: ServiceId;
  /** User's own guess; the AI may override it and say so. */
  objectType: ObjectTypeId;
  quantity: number;
  description: string;
  /** Optional, in cm. Sharpens the material estimate considerably. */
  dimensions?: { width?: number; depth?: number; height?: number };
  /** Data URLs (`data:image/jpeg;base64,...`) of detail + overview photos. */
  photos: string[];
}

/**
 * The estimate — either from the AI or from the deterministic heuristic.
 * Deliberately contains no prices: money is computed by `priceQuote` alone, so
 * a model can never invent a number the customer sees as a price.
 */
export interface QuoteEstimate {
  objectType: ObjectTypeId;
  /** Free-text description of what was recognised, e.g. "Freischwinger mit Armlehnen". */
  objectLabel: string;
  service: ServiceId;
  quantity: number;
  materialKind: MaterialKind;
  /** Laufmeter bei 140 cm Warenbreite, für die gesamte Menge. */
  fabricMeters: number;
  /** Band the analysis considers plausible for the fabric requirement. */
  fabricMetersRange: EstimateRange;
  foamLiters: number;
  laborHours: number;
  /** Band the analysis considers plausible for the workshop hours. */
  laborHoursRange: EstimateRange;
  /** 1–5. */
  difficulty: number;
  difficultyReasons: string[];
  condition: ConditionId;
  /** Extras the analysis believes the job needs. Pre-selected in the UI. */
  suggestedExtras: ExtraId[];
  /** 0–1. Widens the displayed price range when the inputs were poor. */
  confidence: number;
  /** 0–1. How good the customer's own input was (photos, measurements, text). */
  inputQuality: number;
  /** Vector outline of the recognised piece, when the analysis produced one. */
  outline?: QuoteOutline;
  summary: string;
  /** Design direction of the piece, e.g. "Mid-Century" — read from the photos. */
  designStyle?: string;
  /** Era estimate, e.g. "1960er Jahre". */
  era?: string;
  /** Customer-friendly steps the workshop will take on this concrete piece. */
  processSteps: string[];
  assumptions: string[];
  riskFlags: string[];
  followUpQuestions: string[];
}

/** A plausible band the analysis gives for a quantity it cannot pin down exactly. */
export interface EstimateRange {
  min: number;
  max: number;
}

/**
 * Outline drawing the analysis returns for the recognised piece. Only path data
 * — never raw SVG markup — so nothing from the model is ever injected into the
 * DOM. Roles decide which paths follow the selected material.
 */
export type OutlinePartRole = "upholstery" | "cushion" | "frame" | "leg" | "seam" | "detail";

export interface OutlinePart {
  role: OutlinePartRole;
  /** SVG path data in a 0 0 200 140 viewBox, validated character by character. */
  d: string;
}

export interface QuoteOutline {
  parts: OutlinePart[];
}

/** The choices the user makes in the configurator after the analysis. */
export interface QuoteSelection {
  materialKind: MaterialKind;
  /** Fabric id from `lib/curtains` FABRICS, when materialKind is "fabric". */
  fabricId: string;
  /** Leather grade id from the catalog, when materialKind is "leather". */
  leatherGradeId: string;
  extras: ExtraId[];
  quantity: number;
  condition: ConditionId;
}

export interface QuoteLine {
  id: string;
  label: string;
  detail?: string;
  amount: number;
}

export interface QuoteBreakdown {
  lines: QuoteLine[];
  /** Net of VAT, in cents. */
  net: number;
  vat: number;
  gross: number;
  /** Displayed range around `gross`, widened by low confidence. */
  low: number;
  high: number;
  /** Internal figures — never rendered to the customer, used by the workshop. */
  meta: {
    fabricMeters: number;
    leatherSqm: number;
    laborHours: number;
    difficulty: number;
    materialPricePerUnit: number;
    spread: number;
  };
}

export type EstimateSource = "ai" | "heuristic";

export interface QuoteResponse {
  quoteCode: string;
  estimate: QuoteEstimate;
  selection: QuoteSelection;
  breakdown: QuoteBreakdown;
  meta: {
    source: EstimateSource;
    provider: string | null;
    model: string | null;
    /** Set when the AI was configured but failed, and we fell back. */
    notice?: string;
  };
}
