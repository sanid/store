// Canonical fabric prices live in fabric-prices.json; synced into frontend at build.

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

import rawPrices from './fabric-prices.json';

export const FABRIC_PRICES: Record<string, number> = Object.fromEntries(
  Object.entries(rawPrices as Record<string, number | string>).filter(
    ([k, v]) => !k.startsWith('_') && typeof v === 'number'
  ) as [string, number][]
);

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
