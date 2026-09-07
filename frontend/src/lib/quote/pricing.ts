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

/**
 * How far the displayed band may ever open, as a fraction of the mid price.
 * The band should say "this is roughly what it costs" — a customer who reads
 * 800–2.400 € has learned nothing. A band that wants to be wider than this is
 * a signal that we need better photos, not a vaguer number.
 */
const MAX_BAND = { confident: 0.09, unsure: 0.16 } as const;
/** ... but never fake precision either. */
const MIN_BAND = 0.035;

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
    materialDetail = "Zuschnitt inkl. Verschnitt";
  } else {
    const fabric = getFabric(selection.fabricId) ?? getFabric(DEFAULT_FABRIC_ID) ?? FABRICS[0];
    // Narrow bolts need proportionally more running metres than the 140 cm
    // reference width the estimate is expressed in.
    const widthFactor = 140 / Math.max(80, fabric.webWidthCm);
    const meters = round2(fabricMeters * widthFactor);
    materialPricePerUnit = fabric.pricePerMeter;
    materialCost = Math.round(meters * fabric.pricePerMeter);
    materialLabel = `Stoff — ${fabric.brand} ${fabric.collection}, ${fabric.colorName}`;
    materialDetail = "Zuschnitt inkl. Verschnitt";
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
      detail: e.perOrder ? "einmalig pro Auftrag" : `für ${quantity} Stück`,
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
      detail: "Abpolstern, Zuschnitt, Nähen, Beziehen",
      amount: laborCost,
    },
    ...extraLines,
    { id: "setup", label: "Auftragspauschale", detail: "Aufmaß, Rüstzeit, Dokumentation", amount: SETUP_FEE },
  ];

  const net = lines.reduce((sum, l) => sum + l.amount, 0);
  const vat = Math.round(net * VAT_RATE);
  const gross = net + vat;

  // The band is derived, not guessed: the job is re-priced at the low and the
  // high end of the effort the analysis itself considers plausible.
  const band = priceBand({
    estimate,
    gross,
    fixedNet: net - materialCost - consumables - laborCost,
    materialPerMeter: fabricMeters > 0 ? materialCost / fabricMeters : 0,
    fabricMeters,
    fabricMetersFactor: scale * fabricFactor,
    workHours: laborHours - extraHours,
    hoursFactor: scale * difficultyFactor * conditionFactor,
    extraHours,
  });

  return {
    lines,
    net,
    vat,
    gross,
    low: band.low,
    high: band.high,
    meta: {
      fabricMeters,
      leatherSqm,
      laborHours,
      difficulty: estimate.difficulty,
      materialPricePerUnit,
      spread: band.spread,
    },
  };
}

/**
 * Turn the analysis' own uncertainty about work volume into a price band.
 *
 * Everything that does not move with hours or metres — fixed extras, the setup
 * fee — stays put, so an 89 € pickup fee never widens the range. The result is
 * capped hard: an analysis that cannot decide between 4 and 20 hours does not
 * get to hand the customer a meaningless span.
 */
function priceBand(args: {
  estimate: QuoteEstimate;
  gross: number;
  /** Everything that does not move with metres or hours. */
  fixedNet: number;
  materialPerMeter: number;
  fabricMeters: number;
  /** Turns an estimate metre value into a priced metre value. */
  fabricMetersFactor: number;
  /** Hours actually worked on the piece, without checkbox extras. */
  workHours: number;
  /** Turns an estimate hour value into a worked hour value. */
  hoursFactor: number;
  extraHours: number;
}): { low: number; high: number; spread: number } {
  const { estimate, gross } = args;

  const variant = (meters: number, hours: number): number => {
    const material = Math.round(meters * args.materialPerMeter);
    const consum = Math.round(material * CONSUMABLES_RATE);
    const labor = Math.round((hours + args.extraHours) * LABOR_RATE_PER_HOUR);
    const net = material + consum + labor + args.fixedNet;
    return net + Math.round(net * VAT_RATE);
  };

  const fr = estimate.fabricMetersRange;
  const hr = estimate.laborHoursRange;
  const metersLow = Math.min(args.fabricMeters, fr.min * args.fabricMetersFactor);
  const metersHigh = Math.max(args.fabricMeters, fr.max * args.fabricMetersFactor);
  const hoursLow = Math.min(args.workHours, hr.min * args.hoursFactor);
  const hoursHigh = Math.max(args.workHours, hr.max * args.hoursFactor);

  const cap = estimate.confidence >= 0.55 ? MAX_BAND.confident : MAX_BAND.unsure;
  const low = clamp(variant(metersLow, hoursLow), gross * (1 - cap), gross * (1 - MIN_BAND));
  const high = clamp(variant(metersHigh, hoursHigh), gross * (1 + MIN_BAND), gross * (1 + cap));

  const step = gross >= 100_000 ? 1000 : 500;
  return {
    low: roundTo(low, step),
    high: roundTo(high, step),
    spread: round2((high - low) / 2 / Math.max(1, gross)),
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
