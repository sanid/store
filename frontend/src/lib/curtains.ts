import CANONICAL_PRICES from "./fabric-prices.json";

export type CurtainSide = "left" | "right" | "both";
export type CurtainHeader = "wave" | "flemish" | "triple-pinch" | "eyelet" | "single-pinch" | "pencil";
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
export type FabricPattern = "plain" | "stripe" | "floral" | "geometric" | "textured" | "photo";
export type FabricTransparency = "opaque" | "semi-opaque" | "translucent" | "sheer";
export type FabricUse = "curtain" | "blind" | "upholstery" | "multi";

export interface FabricSwatch {
  textureUrl?: string;
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
  { id: "romo-linara-azure", brand: "Romo", collection: "Linara", colorName: "Azure", hex: "#7fb4b0", pricePerMeter: 6290, material: "cotton", pattern: "photo", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140, textureUrl: "/2494-144-linara-azure.webp", description: "Romo Linara 2494/144 — naturweicher Baumwoll-Leinen-Stoff." },
  { id: "romo-linara-blossom", brand: "Romo", collection: "Linara", colorName: "Blossom", hex: "#e9c3c9", pricePerMeter: 6290, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },
  { id: "romo-linara-clay", brand: "Romo", collection: "Linara", colorName: "Clay", hex: "#a16a52", pricePerMeter: 6290, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "romo-linara-pebble", brand: "Romo", collection: "Linara", colorName: "Pebble", hex: "#bfb39a", pricePerMeter: 6290, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "romo-linara-sage", brand: "Romo", collection: "Linara", colorName: "Sage", hex: "#8fa886", pricePerMeter: 6290, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },
  { id: "romo-linara-charcoal", brand: "Romo", collection: "Linara", colorName: "Charcoal", hex: "#4a4a48", pricePerMeter: 6290, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },
  { id: "romo-linara-ivory", brand: "Romo", collection: "Linara", colorName: "Ivory", hex: "#e8e0d0", pricePerMeter: 6290, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },

  // --- Zimmer Rohde ---
  { id: "zr-colibri-saffron", brand: "Zimmer Rohde", collection: "Colibri", colorName: "Saffron", hex: "#e8c024", pricePerMeter: 12912, material: "silk-blend", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 138 },
  { id: "zr-colibri-emerald", brand: "Zimmer Rohde", collection: "Colibri", colorName: "Emerald", hex: "#1f6b58", pricePerMeter: 12912, material: "silk-blend", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 138 },
  { id: "zr-colibri-night", brand: "Zimmer Rohde", collection: "Colibri", colorName: "Midnight", hex: "#1d2540", pricePerMeter: 12912, material: "silk-blend", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 138 },
  { id: "zr-colibri-rose", brand: "Zimmer Rohde", collection: "Colibri", colorName: "Rose", hex: "#c27878", pricePerMeter: 12912, material: "silk-blend", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 138 },
  { id: "zr-colibri-silver", brand: "Zimmer Rohde", collection: "Colibri", colorName: "Silver", hex: "#a8a8a8", pricePerMeter: 12912, material: "silk-blend", pattern: "textured", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 138 },

  // --- Zimmer Rohde (Sinfonia) ---
  { id: "zr-sinfonia-honey", brand: "Zimmer Rohde", collection: "Sinfonia", colorName: "Honey", hex: "#c9a54a", pricePerMeter: 11200, material: "wool", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "zr-sinfonia-plum", brand: "Zimmer Rohde", collection: "Sinfonia", colorName: "Plum", hex: "#5a3050", pricePerMeter: 11200, material: "wool", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "zr-sinfonia-oat", brand: "Zimmer Rohde", collection: "Sinfonia", colorName: "Oat", hex: "#c8b898", pricePerMeter: 11200, material: "wool", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },

  // --- Kirkby Design (Sahara) ---
  { id: "kd-sahara-golden-ochre", brand: "Kirkby Design", collection: "Sahara 3", colorName: "Golden Ochre", hex: "#c98c2a", pricePerMeter: 4633, material: "cotton", pattern: "textured", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 142, description: "Baumwollstoff mit feiner Struktur." },
  { id: "kd-sahara-dove", brand: "Kirkby Design", collection: "Sahara 3", colorName: "Dove", hex: "#9a948a", pricePerMeter: 4633, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 142 },
  { id: "kd-sahara-teal", brand: "Kirkby Design", collection: "Sahara 3", colorName: "Teal", hex: "#2c5f6b", pricePerMeter: 4633, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 142 },
  { id: "kd-sahara-blush", brand: "Kirkby Design", collection: "Sahara 3", colorName: "Blush", hex: "#c9a09a", pricePerMeter: 4633, material: "cotton", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 142 },
  { id: "kd-sahara-charcoal", brand: "Kirkby Design", collection: "Sahara 3", colorName: "Charcoal", hex: "#3e3e3c", pricePerMeter: 4633, material: "cotton", pattern: "textured", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 142 },
  { id: "kd-sahara-sage", brand: "Kirkby Design", collection: "Sahara 3", colorName: "Sage", hex: "#7a8a6a", pricePerMeter: 4633, material: "cotton", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 142 },

  // --- Villa Nova (Geneva) ---
  { id: "vn-geneva-birch", brand: "Villa Nova", collection: "Geneva", colorName: "Birch", hex: "#bdaf95", pricePerMeter: 5270, material: "linen", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "vn-geneva-slate", brand: "Villa Nova", collection: "Geneva", colorName: "Slate", hex: "#4d5560", pricePerMeter: 5270, material: "linen", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "vn-geneva-ivory", brand: "Villa Nova", collection: "Geneva", colorName: "Ivory", hex: "#d8cfc0", pricePerMeter: 5270, material: "linen", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "vn-geneva-moss", brand: "Villa Nova", collection: "Geneva", colorName: "Moss", hex: "#5a6848", pricePerMeter: 5270, material: "linen", pattern: "textured", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },

  // --- Villa Nova (Otello) ---
  { id: "vn-otello-navy", brand: "Villa Nova", collection: "Otello", colorName: "Navy", hex: "#1d2a40", pricePerMeter: 9450, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "vn-otello-terracotta", brand: "Villa Nova", collection: "Otello", colorName: "Terracotta", hex: "#b05838", pricePerMeter: 9450, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "vn-otello-sage", brand: "Villa Nova", collection: "Otello", colorName: "Sage", hex: "#6b7a5e", pricePerMeter: 9450, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },

  // --- Unique Factory house brand placeholders ---
  { id: "uf-velluto-ruby", brand: "Unique Factory", collection: "Velluto", colorName: "Ruby", hex: "#7a1f2b", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140, description: "Schwerer Samtstoff, ideal für klassische Vorhänge." },
  { id: "uf-velluto-forest", brand: "Unique Factory", collection: "Velluto", colorName: "Forest", hex: "#2a4a3a", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },
  { id: "uf-velluto-cream", brand: "Unique Factory", collection: "Velluto", colorName: "Cream", hex: "#e8dcc0", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },
  { id: "uf-velluto-navy", brand: "Unique Factory", collection: "Velluto", colorName: "Navy", hex: "#1c2848", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },
  { id: "uf-velluto-plum", brand: "Unique Factory", collection: "Velluto", colorName: "Plum", hex: "#5a2848", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },

  { id: "uf-aria-sheer-white", brand: "Unique Factory", collection: "Aria", colorName: "Snow", hex: "#f4f1ea", pricePerMeter: 3490, material: "synthetic", pattern: "plain", transparency: "sheer", use: ["curtain"], webWidthCm: 300, description: "Transparenter Voile, raumhoch konfektionierbar." },
  { id: "uf-aria-sheer-mist", brand: "Unique Factory", collection: "Aria", colorName: "Mist", hex: "#d8dde0", pricePerMeter: 3490, material: "synthetic", pattern: "plain", transparency: "sheer", use: ["curtain"], webWidthCm: 300 },
  { id: "uf-aria-sheer-linen", brand: "Unique Factory", collection: "Aria", colorName: "Linen", hex: "#c8c0b0", pricePerMeter: 3490, material: "synthetic", pattern: "plain", transparency: "sheer", use: ["curtain"], webWidthCm: 300 },
  { id: "uf-aria-sheer-pearl", brand: "Unique Factory", collection: "Aria", colorName: "Pearl", hex: "#e0dcd5", pricePerMeter: 3490, material: "synthetic", pattern: "plain", transparency: "translucent", use: ["curtain"], webWidthCm: 300 },

  { id: "uf-linum-natural", brand: "Unique Factory", collection: "Linum", colorName: "Natural", hex: "#cfbfa1", pricePerMeter: 5590, material: "linen", pattern: "textured", transparency: "semi-opaque", use: ["curtain", "upholstery"], webWidthCm: 145 },
  { id: "uf-linum-graphite", brand: "Unique Factory", collection: "Linum", colorName: "Graphite", hex: "#3a3b3d", pricePerMeter: 5590, material: "linen", pattern: "textured", transparency: "semi-opaque", use: ["curtain", "upholstery"], webWidthCm: 145 },
  { id: "uf-linum-rust", brand: "Unique Factory", collection: "Linum", colorName: "Rust", hex: "#a04a2a", pricePerMeter: 5590, material: "linen", pattern: "textured", transparency: "semi-opaque", use: ["curtain", "upholstery"], webWidthCm: 145 },

  { id: "uf-orto-stripe-indigo", brand: "Unique Factory", collection: "Orto", colorName: "Indigo Stripe", hex: "#3a4a78", pricePerMeter: 6890, material: "cotton", pattern: "stripe", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-orto-floral-sand", brand: "Unique Factory", collection: "Orto", colorName: "Floral Sand", hex: "#d4b88a", pricePerMeter: 6890, material: "cotton", pattern: "floral", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-orto-geo-onyx", brand: "Unique Factory", collection: "Orto", colorName: "Geo Onyx", hex: "#2a2a2e", pricePerMeter: 6890, material: "cotton", pattern: "geometric", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },

  { id: "uf-wool-heather", brand: "Unique Factory", collection: "Lana", colorName: "Heather", hex: "#6b5d6e", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 150 },
  { id: "uf-wool-charcoal", brand: "Unique Factory", collection: "Lana", colorName: "Charcoal", hex: "#3a3a3c", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 150 },

  // --- Unique Factory (Seta — silk-blend) ---
  { id: "uf-seta-champagne", brand: "Unique Factory", collection: "Seta", colorName: "Champagne", hex: "#d8c9a5", pricePerMeter: 10500, material: "silk-blend", pattern: "plain", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-seta-bronze", brand: "Unique Factory", collection: "Seta", colorName: "Bronze", hex: "#8a6530", pricePerMeter: 10500, material: "silk-blend", pattern: "plain", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-seta-dusk", brand: "Unique Factory", collection: "Seta", colorName: "Dusk", hex: "#5a4a6a", pricePerMeter: 10500, material: "silk-blend", pattern: "plain", transparency: "semi-opaque", use: ["curtain"], webWidthCm: 140 },

  // --- Unique Factory (Bouclé — blend) ---
  { id: "uf-boucle-ivory", brand: "Unique Factory", collection: "Bouclé", colorName: "Ivory", hex: "#e8e0d0", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },
  { id: "uf-boucle-caramel", brand: "Unique Factory", collection: "Bouclé", colorName: "Caramel", hex: "#a07840", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },
  { id: "uf-boucle-anthracite", brand: "Unique Factory", collection: "Bouclé", colorName: "Anthracite", hex: "#484848", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 140 },

  // --- Unique Factory (Terra — synthetic blackout) ---
  { id: "uf-terra-obsidian", brand: "Unique Factory", collection: "Terra", colorName: "Obsidian", hex: "#1a1a1c", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 280, description: "Blackout-Stoff, Raumverdunkelung." },
  { id: "uf-terra-graphite", brand: "Unique Factory", collection: "Terra", colorName: "Graphite", hex: "#4a4a4c", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 280 },
  { id: "uf-terra-silver", brand: "Unique Factory", collection: "Terra", colorName: "Silver", hex: "#9a9a9a", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["curtain", "upholstery"], webWidthCm: 280 },

  // --- Unique Factory (Decor — photo pattern) ---
  { id: "uf-decor-terracotta", brand: "Unique Factory", collection: "Decor", colorName: "Terracotta", hex: "#a85838", pricePerMeter: 8990, material: "cotton", pattern: "photo", transparency: "opaque", use: ["curtain"], webWidthCm: 140, description: "Dekorativ bedruckter Baumwollstoff mit Motiv." },
  { id: "uf-decor-navy", brand: "Unique Factory", collection: "Decor", colorName: "Navy", hex: "#2a3a5a", pricePerMeter: 8990, material: "cotton", pattern: "photo", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-decor-sage", brand: "Unique Factory", collection: "Decor", colorName: "Sage", hex: "#6a8a5e", pricePerMeter: 8990, material: "cotton", pattern: "photo", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-decor-cream", brand: "Unique Factory", collection: "Decor", colorName: "Cream", hex: "#d8c9a0", pricePerMeter: 8990, material: "cotton", pattern: "photo", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-decor-blush", brand: "Unique Factory", collection: "Decor", colorName: "Blush", hex: "#c28888", pricePerMeter: 8990, material: "cotton", pattern: "photo", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  { id: "uf-decor-charcoal", brand: "Unique Factory", collection: "Decor", colorName: "Charcoal", hex: "#3e3e40", pricePerMeter: 8990, material: "cotton", pattern: "photo", transparency: "opaque", use: ["curtain"], webWidthCm: 140 },
  // --- Polsterstoffe (Hauskollektion) ---
  // Eigene Kollektionen, ausschliesslich fuer Polsterarbeiten. Ein Preis je
  // Kollektion, damit eine Korrektur eine Zahl ist und nicht zwoelf.
  { id: "uf-velluto-ivory", brand: "Unique Factory", collection: "Velluto", colorName: "Ivory", hex: "#e0d4bd", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Schwerer Baumwollsamt, dicht und strapazierfähig." },
  { id: "uf-velluto-sand", brand: "Unique Factory", collection: "Velluto", colorName: "Sand", hex: "#cdba97", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Schwerer Baumwollsamt, dicht und strapazierfähig." },
  { id: "uf-velluto-camel", brand: "Unique Factory", collection: "Velluto", colorName: "Camel", hex: "#c38c4d", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Schwerer Baumwollsamt, dicht und strapazierfähig." },
  { id: "uf-velluto-rust", brand: "Unique Factory", collection: "Velluto", colorName: "Rust", hex: "#aa4c24", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Schwerer Baumwollsamt, dicht und strapazierfähig." },
  { id: "uf-velluto-blush", brand: "Unique Factory", collection: "Velluto", colorName: "Blush", hex: "#d79f97", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Schwerer Baumwollsamt, dicht und strapazierfähig." },
  { id: "uf-velluto-sage", brand: "Unique Factory", collection: "Velluto", colorName: "Sage", hex: "#89a574", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Schwerer Baumwollsamt, dicht und strapazierfähig." },
  { id: "uf-velluto-petrol", brand: "Unique Factory", collection: "Velluto", colorName: "Petrol", hex: "#2f6671", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Schwerer Baumwollsamt, dicht und strapazierfähig." },
  { id: "uf-velluto-slate", brand: "Unique Factory", collection: "Velluto", colorName: "Slate", hex: "#636e7e", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Schwerer Baumwollsamt, dicht und strapazierfähig." },
  { id: "uf-velluto-anthracite", brand: "Unique Factory", collection: "Velluto", colorName: "Anthracite", hex: "#34373c", pricePerMeter: 7900, material: "velvet", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Schwerer Baumwollsamt, dicht und strapazierfähig." },
  { id: "uf-boucle-sand", brand: "Unique Factory", collection: "Bouclé", colorName: "Sand", hex: "#d8d0c3", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Grob geschlungenes Bouclé, warm und griffig." },
  { id: "uf-boucle-camel", brand: "Unique Factory", collection: "Bouclé", colorName: "Camel", hex: "#ba9f7f", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Grob geschlungenes Bouclé, warm und griffig." },
  { id: "uf-boucle-rust", brand: "Unique Factory", collection: "Bouclé", colorName: "Rust", hex: "#a66448", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Grob geschlungenes Bouclé, warm und griffig." },
  { id: "uf-boucle-ruby", brand: "Unique Factory", collection: "Bouclé", colorName: "Ruby", hex: "#834049", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Grob geschlungenes Bouclé, warm und griffig." },
  { id: "uf-boucle-blush", brand: "Unique Factory", collection: "Bouclé", colorName: "Blush", hex: "#dfcac7", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Grob geschlungenes Bouclé, warm und griffig." },
  { id: "uf-boucle-sage", brand: "Unique Factory", collection: "Bouclé", colorName: "Sage", hex: "#a0ae96", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Grob geschlungenes Bouclé, warm und griffig." },
  { id: "uf-boucle-forest", brand: "Unique Factory", collection: "Bouclé", colorName: "Forest", hex: "#375546", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Grob geschlungenes Bouclé, warm und griffig." },
  { id: "uf-boucle-petrol", brand: "Unique Factory", collection: "Bouclé", colorName: "Petrol", hex: "#456b73", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Grob geschlungenes Bouclé, warm und griffig." },
  { id: "uf-boucle-navy", brand: "Unique Factory", collection: "Bouclé", colorName: "Navy", hex: "#313f5c", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Grob geschlungenes Bouclé, warm und griffig." },
  { id: "uf-boucle-slate", brand: "Unique Factory", collection: "Bouclé", colorName: "Slate", hex: "#79808b", pricePerMeter: 7200, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Grob geschlungenes Bouclé, warm und griffig." },
  { id: "uf-lana-ivory", brand: "Unique Factory", collection: "Lana", colorName: "Ivory", hex: "#e5dfd3", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-sand", brand: "Unique Factory", collection: "Lana", colorName: "Sand", hex: "#cec2ae", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-camel", brand: "Unique Factory", collection: "Lana", colorName: "Camel", hex: "#b7936b", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-rust", brand: "Unique Factory", collection: "Lana", colorName: "Rust", hex: "#a05a3c", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-ruby", brand: "Unique Factory", collection: "Lana", colorName: "Ruby", hex: "#7d3740", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-blush", brand: "Unique Factory", collection: "Lana", colorName: "Blush", hex: "#d6b5b0", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-sage", brand: "Unique Factory", collection: "Lana", colorName: "Sage", hex: "#93a586", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-forest", brand: "Unique Factory", collection: "Lana", colorName: "Forest", hex: "#315141", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-petrol", brand: "Unique Factory", collection: "Lana", colorName: "Petrol", hex: "#3d656d", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-navy", brand: "Unique Factory", collection: "Lana", colorName: "Navy", hex: "#2b3a57", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-slate", brand: "Unique Factory", collection: "Lana", colorName: "Slate", hex: "#6e7682", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-lana-anthracite", brand: "Unique Factory", collection: "Lana", colorName: "Anthracite", hex: "#393b3f", pricePerMeter: 8490, material: "wool", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Reine Schurwolle, flachgewebt und formstabil." },
  { id: "uf-linum-ivory", brand: "Unique Factory", collection: "Linum", colorName: "Ivory", hex: "#efece7", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-linum-sand", brand: "Unique Factory", collection: "Linum", colorName: "Sand", hex: "#ddd7cd", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-linum-camel", brand: "Unique Factory", collection: "Linum", colorName: "Camel", hex: "#bca489", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-linum-ruby", brand: "Unique Factory", collection: "Linum", colorName: "Ruby", hex: "#85454e", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-linum-blush", brand: "Unique Factory", collection: "Linum", colorName: "Blush", hex: "#e4d4d2", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-linum-sage", brand: "Unique Factory", collection: "Linum", colorName: "Sage", hex: "#a7b39e", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-linum-forest", brand: "Unique Factory", collection: "Linum", colorName: "Forest", hex: "#3a5749", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-linum-petrol", brand: "Unique Factory", collection: "Linum", colorName: "Petrol", hex: "#496e75", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-linum-navy", brand: "Unique Factory", collection: "Linum", colorName: "Navy", hex: "#35425d", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-linum-slate", brand: "Unique Factory", collection: "Linum", colorName: "Slate", hex: "#7f858f", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-linum-anthracite", brand: "Unique Factory", collection: "Linum", colorName: "Anthracite", hex: "#414246", pricePerMeter: 5590, material: "linen", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Waschleinen mit lebendiger Struktur." },
  { id: "uf-terra-ivory", brand: "Unique Factory", collection: "Terra", colorName: "Ivory", hex: "#e9e3d8", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-sand", brand: "Unique Factory", collection: "Terra", colorName: "Sand", hex: "#d2c6b1", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-camel", brand: "Unique Factory", collection: "Terra", colorName: "Camel", hex: "#bc976b", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-rust", brand: "Unique Factory", collection: "Terra", colorName: "Rust", hex: "#a85a39", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-ruby", brand: "Unique Factory", collection: "Terra", colorName: "Ruby", hex: "#83343f", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-blush", brand: "Unique Factory", collection: "Terra", colorName: "Blush", hex: "#dab9b4", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-sage", brand: "Unique Factory", collection: "Terra", colorName: "Sage", hex: "#96aa88", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-forest", brand: "Unique Factory", collection: "Terra", colorName: "Forest", hex: "#305442", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-petrol", brand: "Unique Factory", collection: "Terra", colorName: "Petrol", hex: "#3b6972", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-navy", brand: "Unique Factory", collection: "Terra", colorName: "Navy", hex: "#293a5b", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-slate", brand: "Unique Factory", collection: "Terra", colorName: "Slate", hex: "#6f7985", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-terra-anthracite", brand: "Unique Factory", collection: "Terra", colorName: "Anthracite", hex: "#3a3c41", pricePerMeter: 5990, material: "synthetic", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Pflegeleichtes Flachgewebe, fleckabweisend." },
  { id: "uf-cordo-ivory", brand: "Unique Factory", collection: "Cordo", colorName: "Ivory", hex: "#e2dac8", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-sand", brand: "Unique Factory", collection: "Cordo", colorName: "Sand", hex: "#cebea2", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-camel", brand: "Unique Factory", collection: "Cordo", colorName: "Camel", hex: "#bf905a", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-rust", brand: "Unique Factory", collection: "Cordo", colorName: "Rust", hex: "#a8522d", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-ruby", brand: "Unique Factory", collection: "Cordo", colorName: "Ruby", hex: "#832b37", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-blush", brand: "Unique Factory", collection: "Cordo", colorName: "Blush", hex: "#d7aaa3", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-sage", brand: "Unique Factory", collection: "Cordo", colorName: "Sage", hex: "#8ea67d", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-forest", brand: "Unique Factory", collection: "Cordo", colorName: "Forest", hex: "#2b533f", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-petrol", brand: "Unique Factory", collection: "Cordo", colorName: "Petrol", hex: "#346771", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-navy", brand: "Unique Factory", collection: "Cordo", colorName: "Navy", hex: "#23365b", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-slate", brand: "Unique Factory", collection: "Cordo", colorName: "Slate", hex: "#687280", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-cordo-anthracite", brand: "Unique Factory", collection: "Cordo", colorName: "Anthracite", hex: "#36393e", pricePerMeter: 6890, material: "velvet", pattern: "stripe", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Breiter Cordsamt, weich mit sichtbarer Rippe." },
  { id: "uf-chenille-ivory", brand: "Unique Factory", collection: "Chenille", colorName: "Ivory", hex: "#ece7dd", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-sand", brand: "Unique Factory", collection: "Chenille", colorName: "Sand", hex: "#d6cab5", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-camel", brand: "Unique Factory", collection: "Chenille", colorName: "Camel", hex: "#c09a6d", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-rust", brand: "Unique Factory", collection: "Chenille", colorName: "Rust", hex: "#ae5b37", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-ruby", brand: "Unique Factory", collection: "Chenille", colorName: "Ruby", hex: "#88333e", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-blush", brand: "Unique Factory", collection: "Chenille", colorName: "Blush", hex: "#debdb8", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-sage", brand: "Unique Factory", collection: "Chenille", colorName: "Sage", hex: "#99ad8b", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-forest", brand: "Unique Factory", collection: "Chenille", colorName: "Forest", hex: "#305744", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-petrol", brand: "Unique Factory", collection: "Chenille", colorName: "Petrol", hex: "#3b6c76", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-navy", brand: "Unique Factory", collection: "Chenille", colorName: "Navy", hex: "#293b5f", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-slate", brand: "Unique Factory", collection: "Chenille", colorName: "Slate", hex: "#717b89", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-chenille-anthracite", brand: "Unique Factory", collection: "Chenille", colorName: "Anthracite", hex: "#3b3d42", pricePerMeter: 6490, material: "blend", pattern: "textured", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Chenille mit sanftem Glanz, sehr scheuerfest." },
  { id: "uf-filzo-ivory", brand: "Unique Factory", collection: "Filzo", colorName: "Ivory", hex: "#dbd6cb", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-sand", brand: "Unique Factory", collection: "Filzo", colorName: "Sand", hex: "#c3baa9", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-camel", brand: "Unique Factory", collection: "Filzo", colorName: "Camel", hex: "#a88d6e", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-rust", brand: "Unique Factory", collection: "Filzo", colorName: "Rust", hex: "#8c5c47", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-ruby", brand: "Unique Factory", collection: "Filzo", colorName: "Ruby", hex: "#6f3d44", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-blush", brand: "Unique Factory", collection: "Filzo", colorName: "Blush", hex: "#cab0ab", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-sage", brand: "Unique Factory", collection: "Filzo", colorName: "Sage", hex: "#8e9c84", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-forest", brand: "Unique Factory", collection: "Filzo", colorName: "Forest", hex: "#334a3e", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-petrol", brand: "Unique Factory", collection: "Filzo", colorName: "Petrol", hex: "#405d63", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-navy", brand: "Unique Factory", collection: "Filzo", colorName: "Navy", hex: "#2f394e", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-slate", brand: "Unique Factory", collection: "Filzo", colorName: "Slate", hex: "#6c727a", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
  { id: "uf-filzo-anthracite", brand: "Unique Factory", collection: "Filzo", colorName: "Anthracite", hex: "#37393c", pricePerMeter: 9200, material: "wool", pattern: "plain", transparency: "opaque", use: ["upholstery"], webWidthCm: 140, description: "Dichter Wollfilz, matt und kantenstabil." },
];

// Override pricePerMeter with the canonical synced values so display and
// server-side pricing cannot drift. Sync script: scripts/sync-fabric-prices.mjs.
{
  const map = CANONICAL_PRICES as Record<string, number | string>;
  for (const f of FABRICS) {
    const canon = map[f.id];
    if (typeof canon === "number" && canon !== f.pricePerMeter) {
      if (typeof window === "undefined") {
        console.warn(
          `[curtains] pricePerMeter drift for ${f.id}: literal=${f.pricePerMeter} canonical=${canon}; using canonical`,
        );
      }
      f.pricePerMeter = canon;
    }
  }
}

export function getFabric(id: string): FabricSwatch | undefined {
  return FABRICS.find((f) => f.id === id);
}

// Pricing in cents
export const HEADER_PRICE: Record<CurtainHeader, number> = {
  wave: 3750,
  flemish: 0,
  "triple-pinch": 0,
  eyelet: 3583,
  "single-pinch": -1900,
  pencil: 0,
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
    // A 150 x 200 cm window — the standard living-room opening these curtains
    // are made for. The scene derives sill, rail and room from these two
    // numbers, so a 100 x 100 default rendered a porthole in a full-height room.
    width: 150,
    height: 200,
    header: "triple-pinch",
    reserve: "high",
    lining: "none",
    accessory: "none",
    fabricId: "kd-sahara-golden-ochre",
    remark: "",
  };
}
