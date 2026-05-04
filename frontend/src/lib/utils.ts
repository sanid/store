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

export function calculatePriceAdjustment(
  schema: { fields: { id: string; priceModifier?: Record<string, number> }[] } | null,
  customization: Record<string, unknown>
): number {
  if (!schema) return 0;
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
