import { FABRICS, getFabric } from "../curtains";
import {
  CONSUMABLES_RATE,
  DIFFICULTY_FACTOR,
  EXTRAS,
  LABOR_RATE_PER_HOUR,
  LEATHER_GRADES,
  LEATHER_SQM_PER_FABRIC_METER,
  SETUP_FEE,
  VAT_RATE,
  getCondition,
  getExtra,
  getLeatherGrade,
} from "./catalog";
import type { ExtraId } from "./catalog";
import type { QuoteBreakdown, QuoteEstimate, QuoteLine, QuoteSelection } from "./types";

/** Fabrics from the main catalog that are actually suitable for upholstery. */
export const UPHOLSTERY_FABRICS = FABRICS.filter((f) => f.use.includes("upholstery"));

export const DEFAULT_FABRIC_ID = UPHOLSTERY_FABRICS[0]?.id ?? FABRICS[0].id;
export const DEFAULT_LEATHER_ID = LEATHER_GRADES[0].id;

/**
 * The one place a price is ever produced. Pure and dependency-free apart from
 * the catalogs, so the client can recompute it live as the user changes
 * materials and the server can recompute it authoritatively for an offer.
 *
 * All amounts are in cents.
 */
export function priceQuote(estimate: QuoteEstimate, selection: QuoteSelection): QuoteBreakdown {
  const quantity = Math.max(1, Math.round(selection.quantity));
  const scale = quantity / Math.max(1, estimate.quantity);

  const activeExtras = selection.extras
    .map(getExtra)
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  // --- Material -----------------------------------------------------------
  const fabricFactor = activeExtras.reduce((acc, e) => acc * (e.fabricFactor ?? 1), 1);
  const fabricMeters = round2(estimate.fabricMeters * scale * fabricFactor);

  let materialCost: number;
  let materialLabel: string;
  let materialDetail: string;
  let materialPricePerUnit: number;
  let leatherSqm = 0;

  if (selection.materialKind === "leather") {
    const grade = getLeatherGrade(selection.leatherGradeId) ?? LEATHER_GRADES[0];
    leatherSqm = round2(fabricMeters * LEATHER_SQM_PER_FABRIC_METER);
    materialPricePerUnit = grade.pricePerSqm;
    materialCost = Math.round(leatherSqm * grade.pricePerSqm);
    materialLabel = `Leder — ${grade.label}`;
    materialDetail = `${formatNumber(leatherSqm)} m² × ${formatEuro(grade.pricePerSqm)}/m²`;
  } else {
    const fabric = getFabric(selection.fabricId) ?? getFabric(DEFAULT_FABRIC_ID) ?? FABRICS[0];
    // Narrow bolts need proportionally more running metres than the 140 cm
    // reference width the estimate is expressed in.
    const widthFactor = 140 / Math.max(80, fabric.webWidthCm);
    const meters = round2(fabricMeters * widthFactor);
    materialPricePerUnit = fabric.pricePerMeter;
    materialCost = Math.round(meters * fabric.pricePerMeter);
    materialLabel = `Stoff — ${fabric.brand} ${fabric.collection}, ${fabric.colorName}`;
    materialDetail = `${formatNumber(meters)} lfm × ${formatEuro(fabric.pricePerMeter)}/lfm (Warenbreite ${fabric.webWidthCm} cm)`;
  }

  const consumables = Math.round(materialCost * CONSUMABLES_RATE);

  // --- Labour -------------------------------------------------------------
  // Kein doppelter Aufwand: Zusatzarbeiten, die die Analyse selbst erkannt hat,
  // stecken bereits in `estimate.laborHours` — ihre Stunden werden deshalb NICHT
  // noch einmal aufgeschlagen. Nur was der Kunde zusaetzlich anhakt, ist echte
  // Mehrarbeit. Fixkosten und Stoffzuschlaege gelten weiterhin fuer beide, denn
  // Material und Beschlaege fallen unabhaengig davon an.
  const alreadyInEstimate = new Set<ExtraId>(estimate.suggestedExtras);
  const extraHours = activeExtras.reduce(
    (acc, e) =>
      alreadyInEstimate.has(e.id) ? acc : acc + (e.hours ?? 0) * (e.perOrder ? 1 : quantity),
    0,
  );
  const difficultyFactor = DIFFICULTY_FACTOR[clampInt(estimate.difficulty, 1, 5)];
  const conditionFactor = getCondition(selection.condition).laborFactor;

  const baseHours = estimate.laborHours * scale;
  const laborHours = round2(baseHours * difficultyFactor * conditionFactor + extraHours);
  const laborCost = Math.round(laborHours * LABOR_RATE_PER_HOUR);

  // --- Extras with a fixed component -------------------------------------
  const extraLines: QuoteLine[] = activeExtras
    .filter((e) => e.fixed)
    .map((e) => ({
      id: `extra-${e.id}`,
      label: e.label,
      detail: e.perOrder ? "einmalig pro Auftrag" : `${quantity}× ${formatEuro(e.fixed!)}`,
      amount: e.fixed! * (e.perOrder ? 1 : quantity),
    }));

  const lines: QuoteLine[] = [
    { id: "material", label: materialLabel, detail: materialDetail, amount: materialCost },
    {
      id: "consumables",
      label: "Kleinmaterial",
      detail: "Garn, Vlies, Klammern, Kleber",
      amount: consumables,
    },
    {
      id: "labor",
      label: "Werkstattarbeit",
      detail: `${formatNumber(laborHours)} Std. × ${formatEuro(LABOR_RATE_PER_HOUR)}/Std.`,
      amount: laborCost,
    },
    ...extraLines,
    { id: "setup", label: "Auftragspauschale", detail: "Aufmaß, Rüstzeit, Dokumentation", amount: SETUP_FEE },
  ];

  const net = lines.reduce((sum, l) => sum + l.amount, 0);
  const vat = Math.round(net * VAT_RATE);
  const gross = net + vat;

  // Low confidence widens the band; a fully confident analysis still keeps a
  // 10 % band because this is an estimate, not a binding offer.
  const spread = clamp(0.1 + (1 - estimate.confidence) * 0.45, 0.1, 0.55);

  return {
    lines,
    net,
    vat,
    gross,
    low: roundTo(gross * (1 - spread * 0.6), 500),
    high: roundTo(gross * (1 + spread), 500),
    meta: {
      fabricMeters,
      leatherSqm,
      laborHours,
      difficulty: estimate.difficulty,
      materialPricePerUnit,
      spread,
    },
  };
}

/** Sensible starting selection derived from what the analysis found. */
export function defaultSelection(estimate: QuoteEstimate): QuoteSelection {
  return {
    materialKind: estimate.materialKind,
    fabricId: DEFAULT_FABRIC_ID,
    leatherGradeId: DEFAULT_LEATHER_ID,
    extras: [...estimate.suggestedExtras],
    quantity: estimate.quantity,
    condition: estimate.condition,
  };
}

/** Validate a client-supplied selection before it is priced server-side. */
export function sanitizeSelection(raw: unknown, estimate: QuoteEstimate): QuoteSelection {
  const fallback = defaultSelection(estimate);
  if (!raw || typeof raw !== "object") return fallback;
  const s = raw as Record<string, unknown>;

  const extraIds = new Set<string>(EXTRAS.map((e) => e.id));
  const extras = Array.isArray(s.extras)
    ? [
        ...new Set(
          s.extras.filter((x): x is ExtraId => typeof x === "string" && extraIds.has(x)),
        ),
      ]
    : fallback.extras;

  return {
    materialKind: s.materialKind === "leather" ? "leather" : "fabric",
    fabricId: getFabric(String(s.fabricId)) ? String(s.fabricId) : fallback.fabricId,
    leatherGradeId: getLeatherGrade(String(s.leatherGradeId))
      ? String(s.leatherGradeId)
      : fallback.leatherGradeId,
    extras,
    quantity: clampInt(Number(s.quantity) || fallback.quantity, 1, 40),
    condition: getCondition(s.condition as never).id,
  };
}

/** Short human-readable reference, e.g. "UF-7K3M9Q". */
export function generateQuoteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `UF-${code}`;
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

function roundTo(v: number, step: number): number {
  return Math.round(v / step) * step;
}

function formatNumber(v: number): string {
  return v.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function formatEuro(cents: number): string {
  return `${(cents / 100).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}
