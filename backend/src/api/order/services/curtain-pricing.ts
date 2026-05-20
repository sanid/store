// Mirrors frontend/src/lib/curtains.ts pricing. Keep in sync.

type CurtainSide = 'left' | 'right' | 'both';
type CurtainHeader = 'wave' | 'flemish' | 'triple-pinch' | 'eyelet' | 'single-pinch' | 'pencil';
type FabricReserve = 'none' | 'low' | 'normal' | 'high';
type CurtainLining = 'none' | 'thermo' | 'acoustic' | 'dimout' | 'blackout';
type CurtainAccessory = 'none' | 'glider-4mm' | 'glider-6mm';

const HEADER_PRICE: Record<CurtainHeader, number> = {
  wave: 3750,
  flemish: 0,
  'triple-pinch': 0,
  eyelet: 3583,
  'single-pinch': -1900,
  pencil: 0,
};

const LINING_PRICE: Record<CurtainLining, number> = {
  none: 0,
  thermo: 9135,
  acoustic: 4500,
  dimout: 9135,
  blackout: 9135,
};

const ACCESSORY_PRICE: Record<CurtainAccessory, number> = {
  none: 0,
  'glider-4mm': 1200,
  'glider-6mm': 1500,
};

const RESERVE_FACTOR: Record<FabricReserve, number> = {
  none: 1.0,
  low: 1.4,
  normal: 1.8,
  high: 2.4,
};

export const FABRIC_PRICES: Record<string, number> = {
  // Romo Linara
  'romo-linara-azure': 6290, 'romo-linara-blossom': 6290, 'romo-linara-clay': 6290,
  'romo-linara-pebble': 6290, 'romo-linara-sage': 6290, 'romo-linara-charcoal': 6290,
  'romo-linara-ivory': 6290,
  // Zimmer Rohde Colibri
  'zr-colibri-saffron': 12912, 'zr-colibri-emerald': 12912, 'zr-colibri-night': 12912,
  'zr-colibri-rose': 12912, 'zr-colibri-silver': 12912,
  // Zimmer Rohde Sinfonia
  'zr-sinfonia-honey': 11200, 'zr-sinfonia-plum': 11200, 'zr-sinfonia-oat': 11200,
  // Kirkby Sahara
  'kd-sahara-golden-ochre': 4633, 'kd-sahara-dove': 4633, 'kd-sahara-teal': 4633,
  'kd-sahara-blush': 4633, 'kd-sahara-charcoal': 4633, 'kd-sahara-sage': 4633,
  // Villa Nova Geneva
  'vn-geneva-birch': 5270, 'vn-geneva-slate': 5270, 'vn-geneva-ivory': 5270, 'vn-geneva-moss': 5270,
  // Villa Nova Otello
  'vn-otello-navy': 9450, 'vn-otello-terracotta': 9450, 'vn-otello-sage': 9450,
  // Unique Factory Velluto
  'uf-velluto-ruby': 7900, 'uf-velluto-forest': 7900, 'uf-velluto-cream': 7900,
  'uf-velluto-navy': 7900, 'uf-velluto-plum': 7900,
  // Unique Factory Aria
  'uf-aria-sheer-white': 3490, 'uf-aria-sheer-mist': 3490, 'uf-aria-sheer-linen': 3490,
  'uf-aria-sheer-pearl': 3490,
  // Unique Factory Linum
  'uf-linum-natural': 5590, 'uf-linum-graphite': 5590, 'uf-linum-rust': 5590,
  // Unique Factory Orto
  'uf-orto-stripe-indigo': 6890, 'uf-orto-floral-sand': 6890, 'uf-orto-geo-onyx': 6890,
  // Unique Factory Lana
  'uf-wool-heather': 8490, 'uf-wool-charcoal': 8490,
  // Unique Factory Seta
  'uf-seta-champagne': 10500, 'uf-seta-bronze': 10500, 'uf-seta-dusk': 10500,
  // Unique Factory Bouclé
  'uf-boucle-ivory': 7200, 'uf-boucle-caramel': 7200, 'uf-boucle-anthracite': 7200,
};

export function priceCurtain(c: Record<string, unknown>): number {
  const fabricId = String(c.fabricId || '');
  const pricePerMeter = FABRIC_PRICES[fabricId];
  if (!pricePerMeter) return 0;

  const side = (c.side as CurtainSide) || 'both';
  const width = Number(c.width) || 100;
  const height = Number(c.height) || 100;
  const header = (c.header as CurtainHeader) || 'triple-pinch';
  const reserve = (c.reserve as FabricReserve) || 'high';
  const lining = (c.lining as CurtainLining) || 'none';
  const accessory = (c.accessory as CurtainAccessory) || 'none';

  const sides = side === 'both' ? 2 : 1;
  const reserveFactor = RESERVE_FACTOR[reserve] ?? 1.8;
  const fabricWidthM = (width / 100) * reserveFactor * sides;
  const fabricHeightM = height / 100 + 0.3;
  const meters = Math.max(0.5, fabricWidthM * fabricHeightM);
  const fabricCost = Math.round(meters * pricePerMeter);
  const confection =
    (HEADER_PRICE[header] ?? 0) + (LINING_PRICE[lining] ?? 0) + (ACCESSORY_PRICE[accessory] ?? 0);

  return Math.max(0, fabricCost + confection);
}
