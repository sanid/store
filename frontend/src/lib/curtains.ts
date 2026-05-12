export type CurtainSide = "left" | "right" | "both";
export type CurtainHeader = "wave" | "flemish" | "triple-pinch";
export type FabricReserve = "none" | "low" | "normal" | "high";
export type CurtainLining = "none" | "thermo" | "acoustic" | "dimout" | "blackout";
export type CurtainAccessory = "none" | "glider-4mm" | "glider-6mm";

export interface CurtainConfig {
  name: string;
  side: CurtainSide;
  width: number;
  height: number;
  header: CurtainHeader;
  reserve: FabricReserve;
  lining: CurtainLining;
  accessory: CurtainAccessory;
  fabricId: string;
  remark: string;
}

export type FabricMaterial =
  | "cotton"
  | "linen"
  | "velvet"
  | "wool"
  | "silk-blend"
  | "synthetic"
  | "blend";
export type FabricPattern = "plain" | "stripe" | "floral" | "geometric" | "textured";
export type FabricTransparency = "opaque" | "semi-opaque" | "translucent" | "sheer";
export type FabricUse = "curtain" | "blind" | "upholstery" | "multi";

export interface FabricSwatch {
  id: string;
  brand: string;
  collection: string;
  colorName: string;
  hex: string;
  pricePerMeter: number;
  material: FabricMaterial;
  pattern: FabricPattern;
  transparency: FabricTransparency;
  use: FabricUse[];
  webWidthCm: number;
  description?: string;
}

export const FABRICS: FabricSwatch[] = [
  // --- Romo (Linara collection) ---
  { id: "romo-linara-azure", brand: "Romo", collection: "Linara", colorName: "Azure", hex: "#7fb4b0", pricePerMeter: 6290, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },
  { id: "romo-linara-blossom", brand: "Romo", collection: "Linara", colorName: "Blossom", hex: "#e9c3c9", pricePerMeter: 6290, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },
  { id: "romo-linara-clay", brand: "Romo", collection: "Linara", colorName: "Clay", hex: "#a16a52", pricePerMeter: 6290, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "romo-linara-pebble", brand: "Romo", collection: "Linara", colorName: "Pebble", hex: "#bfb39a", pricePerMeter: 6290, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },

  // --- Zimmer Rohde ---
  { id: "zr-colibri-saffron", brand: "Zimmer Rohde", collection: "Colibri", colorName: "Saffron", hex: "#e8c024", pricePerMeter: 12912, material: "silk-blend", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 138 },
  { id: "zr-colibri-emerald", brand: "Zimmer Rohde", collection: "Colibri", colorName: "Emerald", hex: "#1f6b58", pricePerMeter: 12912, material: "silk-blend", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 138 },
  { id: "zr-colibri-night", brand: "Zimmer Rohde", collection: "Colibri", colorName: "Midnight", hex: "#1d2540", pricePerMeter: 12912, material: "silk-blend", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 138 },

  // --- Kirkby Design (Sahara) ---
  { id: "kd-sahara-golden-ochre", brand: "Kirkby Design", collection: "Sahara 3", colorName: "Golden Ochre", hex: "#c98c2a", pricePerMeter: 4633, material: "cotton", pattern: "textured", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 142, description: "Baumwollstoff mit feiner Struktur." },
  { id: "kd-sahara-dove", brand: "Kirkby Design", collection: "Sahara 3", colorName: "Dove", hex: "#9a948a", pricePerMeter: 4633, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 142 },
  { id: "kd-sahara-teal", brand: "Kirkby Design", collection: "Sahara 3", colorName: "Teal", hex: "#2c5f6b", pricePerMeter: 4633, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 142 },

  // --- Villa Nova (Geneva) ---
  { id: "vn-geneva-birch", brand: "Villa Nova", collection: "Geneva", colorName: "Birch", hex: "#bdaf95", pricePerMeter: 5270, material: "linen", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "vn-geneva-slate", brand: "Villa Nova", collection: "Geneva", colorName: "Slate", hex: "#4d5560", pricePerMeter: 5270, material: "linen", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },

  // --- Unique Factory house brand placeholders ---
  { id: "uf-velluto-ruby", brand: "Unique Factory", collection: "Velluto", colorName: "Ruby", hex: "#7a1f2b", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 140, description: "Schwerer Samtstoff, ideal für klassische Vorhänge." },
  { id: "uf-velluto-forest", brand: "Unique Factory", collection: "Velluto", colorName: "Forest", hex: "#2a4a3a", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-velluto-cream", brand: "Unique Factory", collection: "Velluto", colorName: "Cream", hex: "#e8dcc0", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },

  { id: "uf-aria-sheer-white", brand: "Unique Factory", collection: "Aria", colorName: "Snow", hex: "#f4f1ea", pricePerMeter: 3490, material: "synthetic", pattern: "plain", transparency: "sheer", use: ["curtain"], webWidthCm: 300, description: "Transparenter Voile, raumhoch konfektionierbar." },
  { id: "uf-aria-sheer-mist", brand: "Unique Factory", collection: "Aria", colorName: "Mist", hex: "#d8dde0", pricePerMeter: 3490, material: "synthetic", pattern: "plain", transparency: "sheer", use: ["curtain"], webWidthCm: 300 },

  { id: "uf-linum-natural", brand: "Unique Factory", collection: "Linum", colorName: "Natural", hex: "#cfbfa1", pricePerMeter: 5590, material: "linen", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 145 },
  { id: "uf-linum-graphite", brand: "Unique Factory", collection: "Linum", colorName: "Graphite", hex: "#3a3b3d", pricePerMeter: 5590, material: "linen", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 145 },
  { id: "uf-linum-rust", brand: "Unique Factory", collection: "Linum", colorName: "Rust", hex: "#a04a2a", pricePerMeter: 5590, material: "linen", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 145 },

  { id: "uf-orto-stripe-indigo", brand: "Unique Factory", collection: "Orto", colorName: "Indigo Stripe", hex: "#3a4a78", pricePerMeter: 6890, material: "cotton", pattern: "stripe", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-orto-floral-sand", brand: "Unique Factory", collection: "Orto", colorName: "Floral Sand", hex: "#d4b88a", pricePerMeter: 6890, material: "cotton", pattern: "floral", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-orto-geo-onyx", brand: "Unique Factory", collection: "Orto", colorName: "Geo Onyx", hex: "#2a2a2e", pricePerMeter: 6890, material: "cotton", pattern: "geometric", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },

  { id: "uf-wool-heather", brand: "Unique Factory", collection: "Lana", colorName: "Heather", hex: "#6b5d6e", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 150 },
  { id: "uf-wool-charcoal", brand: "Unique Factory", collection: "Lana", colorName: "Charcoal", hex: "#3a3a3c", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 150 },
];

export function getFabric(id: string): FabricSwatch | undefined {
  return FABRICS.find((f) => f.id === id);
}

// Pricing in cents
export const HEADER_PRICE: Record<CurtainHeader, number> = {
  wave: 3750,
  flemish: 0,
  "triple-pinch": 0,
};

export const LINING_PRICE: Record<CurtainLining, number> = {
  none: 0,
  thermo: 9135,
  acoustic: 4500,
  dimout: 9135,
  blackout: 9135,
};

export const ACCESSORY_PRICE: Record<CurtainAccessory, number> = {
  none: 0,
  "glider-4mm": 1200,
  "glider-6mm": 1500,
};

export const RESERVE_FACTOR: Record<FabricReserve, number> = {
  none: 1.0,
  low: 1.4,
  normal: 1.8,
  high: 2.4,
};

export function priceCurtain(c: CurtainConfig): number {
  const fabric = getFabric(c.fabricId);
  if (!fabric) return 0;
  const sides = c.side === "both" ? 2 : 1;
  const reserve = RESERVE_FACTOR[c.reserve];
  const fabricWidthM = (c.width / 100) * reserve * sides;
  const fabricHeightM = c.height / 100 + 0.3; // hem allowance
  const meters = Math.max(0.5, fabricWidthM * fabricHeightM);
  const fabricCost = Math.round(meters * fabric.pricePerMeter);
  const confection = HEADER_PRICE[c.header] + LINING_PRICE[c.lining] + ACCESSORY_PRICE[c.accessory];
  return fabricCost + confection;
}

export function defaultCurtainConfig(): CurtainConfig {
  return {
    name: "",
    side: "both",
    width: 100,
    height: 100,
    header: "triple-pinch",
    reserve: "high",
    lining: "none",
    accessory: "none",
    fabricId: "kd-sahara-golden-ochre",
    remark: "",
  };
}
