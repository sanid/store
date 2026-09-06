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
  foamLiters: number;
  laborHours: number;
  /** 1–5. */
  difficulty: number;
  difficultyReasons: string[];
  condition: ConditionId;
  /** Extras the analysis believes the job needs. Pre-selected in the UI. */
  suggestedExtras: ExtraId[];
  /** 0–1. Drives how wide the displayed price range is. */
  confidence: number;
  summary: string;
  assumptions: string[];
  riskFlags: string[];
  followUpQuestions: string[];
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
  /** Derived figures the UI shows as "so kommt der Preis zustande". */
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
