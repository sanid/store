/**
 * Computes production data (cutting list, hardware, materials) for furniture
 * configurations submitted from the frontend customizer.
 */

const PANEL_THICKNESS_MM = 18;

export interface FurnitureCustomization {
  style?: string;
  width?: number;
  height?: number;
  depth?: number;
  columns?: number;
  rows?: number;
  base?: 'legs' | 'plinth' | string;
  backs?: boolean;
  finish?: 'color' | 'plywood' | 'veneer' | string;
  color?: string;
  doors?: boolean[];
}

export interface CuttingListPart {
  label: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  material: string;
  edgeBanding?: boolean;
  notes?: string;
}

export interface ProductionItem {
  kind: 'furniture' | 'curtain';
  productName: string;
  quantity: number;
  customization: FurnitureCustomization;
  cuttingList: CuttingListPart[];
  hardware: { label: string; quantity: number }[];
  totalSheetAreaM2: number;
  estimatedWeightKg: number;
}

function isFurniture(c: Record<string, unknown> | null | undefined): boolean {
  if (!c) return false;
  return (
    typeof c.width === 'number' &&
    typeof c.height === 'number' &&
    typeof c.depth === 'number' &&
    typeof c.columns === 'number' &&
    typeof c.rows === 'number'
  );
}

export function buildProductionItem(
  productName: string,
  quantity: number,
  raw: Record<string, unknown> | null | undefined
): ProductionItem | null {
  if (!isFurniture(raw)) return null;
  const c = raw as unknown as FurnitureCustomization;

  const W = (c.width ?? 200) * 10; // cm → mm
  const H = (c.height ?? 84) * 10;
  const D = (c.depth ?? 40) * 10;
  const t = PANEL_THICKNESS_MM;
  const columns = c.columns ?? 4;
  const rows = c.rows ?? 2;

  const cellW = (W - (columns + 1) * t) / columns;
  const cellH = (H - (rows + 1) * t) / rows;

  const finishLabel =
    c.finish === 'plywood'
      ? 'Multiplex 18mm'
      : c.finish === 'veneer'
        ? 'MDF 18mm + Furnier'
        : 'MDF 18mm + Lack';
  const colorNote = c.color ? `Farbe: ${c.color}` : '';

  const parts: CuttingListPart[] = [];

  parts.push({
    label: 'Deckplatte / Bodenplatte',
    quantity: 2,
    widthMm: W,
    heightMm: t,
    depthMm: D,
    material: finishLabel,
    edgeBanding: true,
    notes: 'horizontal',
  });

  parts.push({
    label: 'Seitenwand (links/rechts)',
    quantity: 2,
    widthMm: t,
    heightMm: H - 2 * t,
    depthMm: D,
    material: finishLabel,
    edgeBanding: true,
    notes: 'vertikal außen',
  });

  if (columns > 1) {
    parts.push({
      label: 'Vertikale Trennwand',
      quantity: columns - 1,
      widthMm: t,
      heightMm: H - 2 * t,
      depthMm: D,
      material: finishLabel,
      edgeBanding: true,
      notes: 'innen',
    });
  }

  if (rows > 1) {
    parts.push({
      label: 'Einlegeboden (pro Spalte)',
      quantity: (rows - 1) * columns,
      widthMm: cellW,
      heightMm: t,
      depthMm: D,
      material: finishLabel,
      edgeBanding: true,
      notes: 'horizontal innen',
    });
  }

  const doorCount = (c.doors ?? []).filter(Boolean).length;
  if (doorCount > 0) {
    parts.push({
      label: 'Tür',
      quantity: doorCount,
      widthMm: cellW - 4,
      heightMm: cellH - 4,
      depthMm: t,
      material: finishLabel,
      edgeBanding: true,
      notes: 'mit Push-to-Open',
    });
  }

  if (c.backs) {
    parts.push({
      label: 'Rückwand (HDF 6mm)',
      quantity: rows * columns,
      widthMm: Math.round(cellW),
      heightMm: Math.round(cellH),
      depthMm: 6,
      material: 'HDF 6mm',
      edgeBanding: false,
      notes: 'eingenutet',
    });
  }

  if (c.base === 'plinth') {
    parts.push({
      label: 'Sockel',
      quantity: 1,
      widthMm: W - 40,
      heightMm: 60,
      depthMm: D - 40,
      material: 'Schwarz lackiert',
      edgeBanding: false,
      notes: 'matt schwarz',
    });
  }

  const hardware: { label: string; quantity: number }[] = [
    { label: 'Holzdübel 8mm', quantity: 16 + columns * 4 + rows * 4 },
    { label: 'Konfirmatschrauben', quantity: 12 + columns * 4 },
    { label: 'Regalbodenträger', quantity: Math.max(0, (rows - 1) * columns * 4) },
  ];

  if (doorCount > 0) {
    hardware.push({ label: 'Topfscharniere 35mm', quantity: doorCount * 2 });
    hardware.push({ label: 'Push-to-Open Magnete', quantity: doorCount });
  }
  if (c.base === 'legs') {
    hardware.push({ label: 'Metallfüße H=120mm', quantity: 4 });
  }

  let totalSheetAreaM2 = 0;
  for (const p of parts) {
    const longest = Math.max(p.widthMm, p.heightMm, p.depthMm);
    const second =
      p.widthMm + p.heightMm + p.depthMm - longest - Math.min(p.widthMm, p.heightMm, p.depthMm);
    totalSheetAreaM2 += (longest * second) / 1_000_000 * p.quantity;
  }
  totalSheetAreaM2 = Math.round(totalSheetAreaM2 * 100) / 100;

  // ~7.5 kg/m² for 18mm MDF / plywood
  const estimatedWeightKg = Math.round(totalSheetAreaM2 * 7.5 * 10) / 10;

  return {
    kind: 'furniture',
    productName,
    quantity,
    customization: c,
    cuttingList: parts,
    hardware,
    totalSheetAreaM2,
    estimatedWeightKg,
  };
}

function isCurtain(c: Record<string, unknown> | null | undefined): boolean {
  if (!c) return false;
  return (
    typeof c.fabricId === 'string' &&
    typeof c.width === 'number' &&
    typeof c.height === 'number' &&
    typeof c.header === 'string'
  );
}

const RESERVE_FACTOR: Record<string, number> = {
  none: 1.0,
  low: 1.4,
  normal: 1.8,
  high: 2.4,
};

const HEADER_LABEL: Record<string, string> = {
  wave: 'Wellenband',
  flemish: 'Flämische Falte',
  'triple-pinch': 'Dreifachfalte',
  eyelet: 'Ösen',
  'single-pinch': 'Einfachfalte',
  pencil: 'Kräuselband',
};

const LINING_LABEL: Record<string, string> = {
  none: 'ohne Futter',
  thermo: 'Thermofutter',
  acoustic: 'Akustikfutter',
  dimout: 'Dimout-Futter',
  blackout: 'Blackout-Futter',
};

const ACCESSORY_LABEL: Record<string, string> = {
  none: 'keine',
  'glider-4mm': 'Clic-Gleiter 4 mm',
  'glider-6mm': 'Clic-Gleiter 6 mm',
};

export function buildCurtainProductionItem(
  productName: string,
  quantity: number,
  raw: Record<string, unknown> | null | undefined
): ProductionItem | null {
  if (!isCurtain(raw)) return null;
  const c = raw as Record<string, unknown>;

  const widthCm = Number(c.width) || 100;
  const heightCm = Number(c.height) || 100;
  const side = String(c.side || 'both');
  const reserve = String(c.reserve || 'high');
  const lining = String(c.lining || 'none');
  const accessory = String(c.accessory || 'none');
  const header = String(c.header || 'triple-pinch');

  const sides = side === 'both' ? 2 : 1;
  const reserveFactor = RESERVE_FACTOR[reserve] ?? 1.8;
  const fabricWidthM = (widthCm / 100) * reserveFactor * sides;
  const fabricHeightM = heightCm / 100 + 0.3;
  const meters = Math.max(0.5, fabricWidthM * fabricHeightM);

  const panelWidthMm = Math.round((widthCm / sides) * reserveFactor * 10);
  const panelHeightMm = Math.round((heightCm + 30) * 10);
  const fabricLabel = String(c.fabricLabel || c.fabricId || 'Stoff');

  const cuttingList: CuttingListPart[] = [
    {
      label: `Stoffbahn (${HEADER_LABEL[header] ?? header})`,
      quantity: sides,
      widthMm: panelWidthMm,
      heightMm: panelHeightMm,
      depthMm: 0,
      material: fabricLabel,
      edgeBanding: false,
      notes: `Stoffbedarf gesamt: ${meters.toFixed(2)} m`,
    },
  ];

  if (lining !== 'none') {
    cuttingList.push({
      label: `Futter (${LINING_LABEL[lining] ?? lining})`,
      quantity: sides,
      widthMm: panelWidthMm,
      heightMm: panelHeightMm - 50,
      depthMm: 0,
      material: LINING_LABEL[lining] ?? lining,
      edgeBanding: false,
      notes: 'separat gesäumt',
    });
  }

  const hardware: { label: string; quantity: number }[] = [
    { label: HEADER_LABEL[header] ?? header, quantity: sides },
    { label: 'Gardinenhaken', quantity: Math.ceil((widthCm * reserveFactor) / 8) * sides },
    { label: 'Bleiband (m)', quantity: Math.ceil((widthCm / 100) * sides) },
  ];

  if (accessory !== 'none') {
    hardware.push({
      label: ACCESSORY_LABEL[accessory] ?? accessory,
      quantity: Math.ceil((widthCm * reserveFactor) / 8) * sides,
    });
  }

  return {
    kind: 'curtain',
    productName,
    quantity,
    customization: c as unknown as FurnitureCustomization,
    cuttingList,
    hardware,
    totalSheetAreaM2: Math.round(meters * 100) / 100,
    estimatedWeightKg: Math.round(meters * 0.45 * 10) / 10,
  };
}

export function buildProductionDataForOrder(
  orderLines: Array<{
    name: string;
    quantity: number;
    customization?: Record<string, unknown> | null;
    [key: string]: unknown;
  }>
): { items: ProductionItem[]; hasFurniture: boolean } {
  const items: ProductionItem[] = [];
  for (const line of orderLines) {
    const p =
      buildProductionItem(line.name, line.quantity, line.customization) ??
      buildCurtainProductionItem(line.name, line.quantity, line.customization);
    if (p) items.push(p);
  }
  return { items, hasFurniture: items.length > 0 };
}
