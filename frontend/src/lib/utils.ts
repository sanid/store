const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "EUR";
const LOCALE = process.env.NEXT_PUBLIC_LOCALE || "de-DE";

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
  }).format(cents / 100);
}

export function generateCartItemId(
  documentId: string,
  customization: Record<string, unknown>
): string {
  const sorted = Object.entries(customization)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${documentId}__${sorted}`;
}

const FURNITURE_LABELS: Record<string, string> = {
  style: "Stil",
  width: "Breite",
  height: "Höhe",
  depth: "Tiefe",
  columns: "Spalten",
  rows: "Reihen",
  base: "Basis",
  backs: "Rückwände",
  finish: "Finish",
  color: "Farbe",
  doors: "Türen",
  cells: "Fächer",
  density: "Dichte",
  side: "Seite",
  header: "Faltenband",
  reserve: "Stoffzugabe",
  lining: "Futterstoff",
  accessory: "Zubehör",
};

const FURNITURE_VALUES: Record<string, string> = {
  frame: "Frame",
  grid: "Grid",
  gradient: "Gradient",
  mosaic: "Mosaic",
  pattern: "Pattern",
  pixel: "Pixel",
  legs: "Füße",
  plinth: "Sockel",
  plywood: "Multiplex",
  veneer: "Furnier",
  color: "Farbe",
  door: "Tür",
  drawer: "Schublade",
  open: "Offen",
  left: "Links",
  right: "Rechts",
  both: "Beidseitig",
  wave: "Wellenband",
  flemish: "Flämische Falte",
  "triple-pinch": "3er Falte",
  eyelet: "Ösen",
  "single-pinch": "1er Falte",
  pencil: "Bleistift",
  none: "Ohne",
  low: "Gering",
  normal: "Normal",
  high: "Viel",
  thermo: "Thermo",
  acoustic: "Akustikstoff",
  dimout: "Dimout",
  blackout: "Blackout",
  "glider-4mm": "Clic-Gleiter 4 mm",
  "glider-6mm": "Clic-Gleiter 6 mm",
};

export interface CustomizationDisplayItem {
  key: string;
  label: string;
  value: string;
  swatch?: string;
}

export function formatCustomizationForDisplay(
  customization: Record<string, unknown>
): CustomizationDisplayItem[] {
  const out: CustomizationDisplayItem[] = [];
  for (const [key, raw] of Object.entries(customization)) {
    if (raw === undefined || raw === null || raw === "") continue;
    if (key === "fabricLabel" || key === "fabricId" || key === "name" || key === "remark" || key === "side") continue;
    if (key === "accessory" && raw === "none") continue;
    if (key === "lining" && raw === "none") continue;
    const label = FURNITURE_LABELS[key] ?? key;

    if (key === "fabric" && typeof raw === "string" && raw.startsWith("#")) {
      const fabricLabel = customization["fabricLabel"];
      out.push({ key, label: "Stoff", value: typeof fabricLabel === "string" ? fabricLabel : raw, swatch: raw });
      continue;
    }

    if (key === "doors" && Array.isArray(raw)) {
      const count = raw.filter(Boolean).length;
      if (count === 0) continue;
      out.push({ key, label, value: `${count}× geschlossen` });
      continue;
    }

    if (key === "cells" && Array.isArray(raw)) {
      const doors = raw.filter((c) => c === "door").length;
      const drawers = raw.filter((c) => c === "drawer").length;
      const open = raw.filter((c) => c === "open").length;
      const parts: string[] = [];
      if (doors) parts.push(`${doors} Tür${doors === 1 ? "" : "en"}`);
      if (drawers) parts.push(`${drawers} Schublade${drawers === 1 ? "" : "n"}`);
      if (open) parts.push(`${open} offen`);
      out.push({ key, label, value: parts.join(" · ") || `${raw.length} Fächer` });
      continue;
    }

    if (key === "density" && typeof raw === "number") {
      out.push({ key, label, value: `${raw}%` });
      continue;
    }

    if (key === "color" && typeof raw === "string" && raw.startsWith("#")) {
      out.push({ key, label, value: raw, swatch: raw });
      continue;
    }

    if (typeof raw === "boolean") {
      out.push({ key, label, value: raw ? "Mit" : "Ohne" });
      continue;
    }

    if (typeof raw === "number") {
      const suffix = ["width", "height", "depth"].includes(key) ? " cm" : "";
      out.push({ key, label, value: `${raw}${suffix}` });
      continue;
    }

    if (Array.isArray(raw)) {
      out.push({ key, label, value: `${raw.length} Optionen` });
      continue;
    }

    const str = String(raw);
    out.push({ key, label, value: FURNITURE_VALUES[str] ?? str });
  }
  return out;
}

export function calculatePriceAdjustment(
  schema: {
    pricingBase?: number;
    pricingRules?: Array<{ field: string; type: string; rate: number }>;
    fields: Array<{
      id: string;
      type?: string;
      priceModifier?: Record<string, number>;
      pricePerUnit?: number;
      options?: Array<{ value: string; priceModifier?: number }> | string[];
    }>;
  } | null,
  customization: Record<string, unknown>
): number {
  if (!schema) return 0;

  if (typeof schema.pricingBase === 'number' && schema.pricingBase > 0) {
    let price = schema.pricingBase;

    for (const rule of schema.pricingRules || []) {
      const val = Number(customization[rule.field]) || 0;
      if (rule.type === 'linear' && rule.rate) {
        price += val * rule.rate;
      }
    }

    for (const field of schema.fields) {
      const val = customization[field.id];
      if (val == null || val === '') continue;

      if (field.type === 'select' && Array.isArray(field.options)) {
        const opt = field.options.find((o) =>
          typeof o === 'string' ? o === String(val) : o.value === String(val)
        );
        if (opt && typeof opt !== 'string' && typeof opt.priceModifier === 'number' && opt.priceModifier > 0) {
          price += opt.priceModifier;
        }
      } else if (field.type === 'number' && field.pricePerUnit && typeof val === 'number') {
        price += val * field.pricePerUnit;
      } else if (field.priceModifier && field.priceModifier[String(val)]) {
        price += field.priceModifier[String(val)];
      }
    }

    return price;
  }

  let adjustment = 0;
  for (const field of schema.fields) {
    if (field.priceModifier && customization[field.id]) {
      const key = String(customization[field.id]);
      adjustment += field.priceModifier[key] || 0;
    }
  }
  return adjustment;
}

export interface ShippingZone {
  id: string;
  label: string;
  countries: string[];
  rate: number;
}

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "de",
    label: "Deutschland",
    countries: ["DE"],
    rate: 499,
  },
  {
    id: "eu",
    label: "EU",
    countries: ["AT", "BE", "FR", "NL", "GB"],
    rate: 999,
  },
  {
    id: "international",
    label: "International",
    countries: ["US", "CA"],
    rate: 1499,
  },
];

export const FREE_SHIPPING_THRESHOLD = 7500;

export function getShippingRate(countryCode: string): number {
  const zone = SHIPPING_ZONES.find((z) => z.countries.includes(countryCode));
  return zone ? zone.rate : 1499;
}

export function getShippingZoneLabel(countryCode: string): string {
  const zone = SHIPPING_ZONES.find((z) => z.countries.includes(countryCode));
  return zone ? zone.label : "International";
}
