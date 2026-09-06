// Kanonische Preisberechnung fuer Anfragen aus dem KI-Schnellkalkulator.
// Der Katalog liegt in quote-catalog.json und wird ins Frontend synchronisiert,
// damit Kunden-Vorschau und Angebot nie auseinanderlaufen.
//
// Wichtig: die KI liefert nur Aufwands- und Materialschaetzungen. Jeder Euro
// entsteht hier. Mitarbeitende koennen die Schaetzwerte ueberschreiben; die
// Formel bleibt dieselbe.

import catalog from './quote-catalog.json';
import fabricPrices from '../../order/services/fabric-prices.json';

export type MaterialKind = 'fabric' | 'leather';

export interface QuoteWorkingValues {
  objectType: string;
  service: string;
  quantity: number;
  materialKind: MaterialKind;
  fabricId: string;
  /** Anzeigename des Stoffs (Marke/Kollektion/Farbe) fuers Angebot. */
  fabricLabel?: string;
  leatherGradeId: string;
  /** Laufmeter bei 140 cm Warenbreite, fuer die gesamte Menge. */
  fabricMeters: number;
  laborHours: number;
  difficulty: number;
  condition: string;
  extras: string[];
  /**
   * Zusatzarbeiten, die die KI selbst erkannt hat. Deren Stunden stecken schon
   * in `laborHours` und werden nicht erneut aufgeschlagen.
   */
  aiSuggestedExtras?: string[];
  /** Optionaler manueller Auf-/Abschlag in Cent (netto). */
  manualAdjustment?: number;
  manualAdjustmentLabel?: string;
}

export interface QuoteLine {
  id: string;
  label: string;
  detail?: string;
  amount: number;
}

export interface QuoteBreakdown {
  lines: QuoteLine[];
  net: number;
  vat: number;
  gross: number;
  low: number;
  high: number;
  meta: {
    fabricMeters: number;
    leatherSqm: number;
    laborHours: number;
    difficulty: number;
    materialPricePerUnit: number;
    spread: number;
  };
}

const RATES = catalog.rates;

interface FabricRow {
  id: string;
  brand?: string;
  collection?: string;
  colorName?: string;
  pricePerMeter: number;
  webWidthCm?: number;
}

/**
 * fabric-prices.json ist eine flache id -> Preis Map. Marke/Kollektion liegen im
 * Frontend-Katalog; fuer das PDF reicht die id plus der kanonische Preis, und
 * das Frontend schickt den Anzeigenamen mit.
 */
function fabricPrice(id: string): number | null {
  const map = fabricPrices as unknown as Record<string, number | string>;
  const v = map[id];
  return typeof v === 'number' ? v : null;
}

export function getService(id: string) {
  return catalog.services.find((s) => s.id === id) ?? catalog.services[catalog.services.length - 1];
}

export function getObjectType(id: string) {
  return (
    catalog.objectTypes.find((t) => t.id === id) ??
    catalog.objectTypes[catalog.objectTypes.length - 1]
  );
}

export function getCondition(id: string) {
  return catalog.conditions.find((c) => c.id === id) ?? catalog.conditions[1];
}

export function getExtra(id: string) {
  return catalog.extras.find((e) => e.id === id);
}

export function getLeatherGrade(id: string) {
  return catalog.leatherGrades.find((g) => g.id === id);
}

export function difficultyLabel(d: number): string {
  return catalog.difficultyLabel[clampInt(d, 1, 5)] ?? '';
}

export { catalog as quoteCatalog };

/**
 * Preisformel. `confidence` weitet nur die angezeigte Spanne — nie den Preis
 * selbst. Ein vom Mitarbeitenden freigegebenes Angebot setzt confidence auf 1
 * und bekommt dadurch die engste Spanne.
 */
export function priceQuote(values: QuoteWorkingValues, confidence: number): QuoteBreakdown {
  const quantity = Math.max(1, Math.round(values.quantity || 1));

  const activeExtras = (values.extras || [])
    .map(getExtra)
    .filter((e): e is NonNullable<ReturnType<typeof getExtra>> => Boolean(e));

  // --- Material ---
  const fabricFactor = activeExtras.reduce(
    (acc, e) => acc * ((e as { fabricFactor?: number }).fabricFactor ?? 1),
    1
  );
  const fabricMeters = round2(Math.max(0, values.fabricMeters) * fabricFactor);

  let materialCost: number;
  let materialLabel: string;
  let materialDetail: string;
  let materialPricePerUnit: number;
  let leatherSqm = 0;

  if (values.materialKind === 'leather') {
    const grade = getLeatherGrade(values.leatherGradeId) ?? catalog.leatherGrades[0];
    leatherSqm = round2(fabricMeters * RATES.leatherSqmPerFabricMeter);
    materialPricePerUnit = grade.pricePerSqm;
    materialCost = Math.round(leatherSqm * grade.pricePerSqm);
    materialLabel = `Leder — ${grade.label}`;
    materialDetail = `${fmtNum(leatherSqm)} m² × ${fmtEuro(grade.pricePerSqm)}/m²`;
  } else {
    const perMeter = fabricPrice(values.fabricId);
    materialPricePerUnit = perMeter ?? 0;
    materialCost = Math.round(fabricMeters * materialPricePerUnit);
    materialLabel = `Stoff — ${values.fabricLabel || values.fabricId}`;
    materialDetail = `${fmtNum(fabricMeters)} lfm × ${fmtEuro(materialPricePerUnit)}/lfm`;
  }

  const consumables = Math.round(materialCost * RATES.consumablesRate);

  // --- Arbeit ---
  // Kein doppelter Aufwand: was die Analyse selbst erkannt hat, steckt bereits
  // in laborHours. Nur zusaetzlich angehakte Arbeiten kosten extra Stunden.
  // Fixkosten und Stoffzuschlaege gelten unabhaengig davon.
  const alreadyInEstimate = new Set(values.aiSuggestedExtras ?? []);
  const extraHours = activeExtras.reduce(
    (acc, e) =>
      alreadyInEstimate.has(e.id)
        ? acc
        : acc +
          ((e as { hours?: number }).hours ?? 0) *
            ((e as { perOrder?: boolean }).perOrder ? 1 : quantity),
    0
  );
  const difficultyFactor = catalog.difficultyFactor[clampInt(values.difficulty, 1, 5)];
  const conditionFactor = getCondition(values.condition).laborFactor;

  const laborHours = round2(
    Math.max(0, values.laborHours) * difficultyFactor * conditionFactor + extraHours
  );
  const laborCost = Math.round(laborHours * RATES.laborRatePerHour);

  const extraLines: QuoteLine[] = activeExtras
    .filter((e) => (e as { fixed?: number }).fixed)
    .map((e) => {
      const fixed = (e as { fixed: number }).fixed;
      const perOrder = Boolean((e as { perOrder?: boolean }).perOrder);
      return {
        id: `extra-${e.id}`,
        label: e.label,
        detail: perOrder ? 'einmalig pro Auftrag' : `${quantity}× ${fmtEuro(fixed)}`,
        amount: fixed * (perOrder ? 1 : quantity),
      };
    });

  const lines: QuoteLine[] = [
    { id: 'material', label: materialLabel, detail: materialDetail, amount: materialCost },
    {
      id: 'consumables',
      label: 'Kleinmaterial',
      detail: 'Garn, Vlies, Klammern, Kleber',
      amount: consumables,
    },
    {
      id: 'labor',
      label: 'Werkstattarbeit',
      detail: `${fmtNum(laborHours)} Std. × ${fmtEuro(RATES.laborRatePerHour)}/Std.`,
      amount: laborCost,
    },
    ...extraLines,
    {
      id: 'setup',
      label: 'Auftragspauschale',
      detail: 'Aufmaß, Rüstzeit, Dokumentation',
      amount: RATES.setupFee,
    },
  ];

  if (values.manualAdjustment) {
    lines.push({
      id: 'manual',
      label: values.manualAdjustmentLabel || 'Manuelle Anpassung',
      amount: Math.round(values.manualAdjustment),
    });
  }

  const net = lines.reduce((sum, l) => sum + l.amount, 0);
  const vat = Math.round(net * RATES.vatRate);
  const gross = net + vat;

  const conf = clamp(confidence, 0, 1);
  const spread = clamp(0.1 + (1 - conf) * 0.45, 0.1, 0.55);

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
      difficulty: clampInt(values.difficulty, 1, 5),
      materialPricePerUnit,
      spread,
    },
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
}
function clampInt(v: number, min: number, max: number): number {
  return Math.round(clamp(v, min, max));
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function roundTo(v: number, step: number): number {
  return Math.round(v / step) * step;
}
function fmtNum(v: number): string {
  return v.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}
function fmtEuro(cents: number): string {
  return `${(cents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}
