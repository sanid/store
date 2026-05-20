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

// Dimensions follow workshop convention: panel = Länge × Breite × Stärke (L × B × S).
// L is always the longer face dimension, B the shorter, S the material thickness.
// For textiles (curtains) S is 0 and L/B are the panel orientation as cut.
export interface CuttingListPart {
  label: string;
  quantity: number;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  material: string;
  edgeBanding?: boolean;
  notes?: string;
}

function panel(faceA: number, faceB: number, thicknessMm: number): { lengthMm: number; widthMm: number; thicknessMm: number } {
  const lengthMm = Math.round(Math.max(faceA, faceB));
  const widthMm = Math.round(Math.min(faceA, faceB));
  return { lengthMm, widthMm, thicknessMm };
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
  const parts: CuttingListPart[] = [];

  parts.push({
    label: 'Deckplatte / Bodenplatte',
    quantity: 2,
    ...panel(W, D, t),
    material: finishLabel,
    edgeBanding: true,
    notes: 'horizontal',
  });

  parts.push({
    label: 'Seitenwand (links/rechts)',
    quantity: 2,
    ...panel(H - 2 * t, D, t),
    material: finishLabel,
    edgeBanding: true,
    notes: 'vertikal außen',
  });

  if (columns > 1) {
    parts.push({
      label: 'Vertikale Trennwand',
      quantity: columns - 1,
      ...panel(H - 2 * t, D, t),
      material: finishLabel,
      edgeBanding: true,
      notes: 'innen',
    });
  }

  if (rows > 1) {
    parts.push({
      label: 'Einlegeboden (pro Spalte)',
      quantity: (rows - 1) * columns,
      ...panel(cellW, D, t),
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
      ...panel(cellW - 4, cellH - 4, t),
      material: finishLabel,
      edgeBanding: true,
      notes: 'mit Push-to-Open',
    });
  }

  if (c.backs) {
    parts.push({
      label: 'Rückwand (HDF 6mm)',
      quantity: rows * columns,
      ...panel(cellW, cellH, 6),
      material: 'HDF 6mm',
      edgeBanding: false,
      notes: 'eingenutet',
    });
  }

  if (c.base === 'plinth') {
    parts.push({
      label: 'Sockel',
      quantity: 1,
      ...panel(W - 40, D - 40, 60),
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

  // Panel area = L × B (face dimensions). Stärke is thickness, not area.
  let totalSheetAreaM2 = 0;
  for (const p of parts) {
    totalSheetAreaM2 += (p.lengthMm * p.widthMm) / 1_000_000 * p.quantity;
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
  // Cut height = finished height + 30 cm hem allowance (10 top + 20 bottom)
  const panelHeightMm = Math.round((heightCm + 30) * 10);
  const fabricLabel = String(c.fabricLabel || c.fabricId || 'Stoff');

  // For curtains we keep B (horizontal) and H (vertical) by orientation since the
  // panel always hangs with one specific side up. L holds height, B holds width.
  const cuttingList: CuttingListPart[] = [
    {
      label: `Stoffbahn (${HEADER_LABEL[header] ?? header})`,
      quantity: sides,
      lengthMm: panelHeightMm,
      widthMm: panelWidthMm,
      thicknessMm: 0,
      material: fabricLabel,
      edgeBanding: false,
      notes: `inkl. 30 cm Saumzugabe · Stoffbedarf gesamt: ${meters.toFixed(2)} m`,
    },
  ];

  if (lining !== 'none') {
    cuttingList.push({
      label: `Futter (${LINING_LABEL[lining] ?? lining})`,
      quantity: sides,
      lengthMm: panelHeightMm - 50,
      widthMm: panelWidthMm,
      thicknessMm: 0,
      material: LINING_LABEL[lining] ?? lining,
      edgeBanding: false,
      notes: 'separat gesäumt, 5 cm kürzer',
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
