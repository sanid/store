import PDFDocument from 'pdfkit';
import type { ProductionItem } from './production';

interface OrderForPdf {
  documentId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  totalAmount?: number | null;
  currency?: string | null;
  shippingAddress?: Record<string, unknown> | null;
  items?: Array<{
    name: string;
    quantity: number;
    totalPrice: number;
    customization?: Record<string, unknown>;
    previewImage?: string | null;
  }>;
  createdAt?: string;
}

const FURNITURE_LABELS: Record<string, string> = {
  style: 'Stil',
  width: 'Breite (cm)',
  height: 'Höhe (cm)',
  depth: 'Tiefe (cm)',
  columns: 'Spalten',
  rows: 'Reihen',
  base: 'Basis',
  backs: 'Rückwände',
  finish: 'Finish',
  color: 'Farbe',
  cells: 'Fächer',
  density: 'Dichte',
  fabricId: 'Stoff-ID',
  fabricLabel: 'Stoff',
  fabric: 'Stofffarbe',
  side: 'Seite',
  header: 'Faltenband',
  reserve: 'Stoffzugabe',
  lining: 'Futter',
  accessory: 'Zubehör',
  name: 'Bezeichnung',
  remark: 'Anmerkung',
};

const FURNITURE_VALUES: Record<string, string> = {
  frame: 'Frame',
  grid: 'Grid',
  gradient: 'Gradient',
  mosaic: 'Mosaic',
  pattern: 'Pattern',
  pixel: 'Pixel',
  legs: 'Füße',
  plinth: 'Sockel',
  plywood: 'Multiplex',
  veneer: 'Furnier',
  color: 'Farbe',
  left: 'links',
  right: 'rechts',
  both: 'beidseitig',
  wave: 'Wellenband',
  flemish: 'Flämische Falte',
  'triple-pinch': 'Dreifachfalte',
  eyelet: 'Ösen',
  'single-pinch': 'Einfachfalte',
  pencil: 'Kräuselband',
  none: 'keine',
  low: 'gering',
  normal: 'normal',
  high: 'hoch',
  thermo: 'Thermofutter',
  acoustic: 'Akustik',
  dimout: 'Dimout',
  blackout: 'Blackout',
  'glider-4mm': 'Clic-Gleiter 4 mm',
  'glider-6mm': 'Clic-Gleiter 6 mm',
};

function formatCustomization(c: Record<string, unknown>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [key, val] of Object.entries(c)) {
    if (val === undefined || val === null || val === '') continue;
    if (key === 'doors' && Array.isArray(val)) {
      out.push(['Türen', `${val.filter(Boolean).length} von ${val.length}`]);
      continue;
    }
    if (key === 'cells' && Array.isArray(val)) {
      const doors = val.filter((c) => c === 'door').length;
      const drawers = val.filter((c) => c === 'drawer').length;
      const open = val.filter((c) => c === 'open').length;
      const parts: string[] = [];
      if (doors) parts.push(`${doors} Tür${doors === 1 ? '' : 'en'}`);
      if (drawers) parts.push(`${drawers} Schublade${drawers === 1 ? '' : 'n'}`);
      if (open) parts.push(`${open} offen`);
      out.push(['Fächer', parts.join(' · ') || `${val.length} Fächer`]);
      continue;
    }
    if (key === 'density' && typeof val === 'number') {
      out.push(['Dichte', `${val}%`]);
      continue;
    }
    if (typeof val === 'boolean') {
      out.push([FURNITURE_LABELS[key] ?? key, val ? 'Ja' : 'Nein']);
      continue;
    }
    const str = String(val);
    out.push([FURNITURE_LABELS[key] ?? key, FURNITURE_VALUES[str] ?? str]);
  }
  return out;
}

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  try {
    return Buffer.from(m[2], 'base64');
  } catch {
    return null;
  }
}

export function generateProductionPdf(
  order: OrderForPdf,
  productionItems: ProductionItem[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 30, left: 48, right: 48 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fillColor('#111827')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('Produktionsauftrag', { align: 'left' });
    doc
      .moveDown(0.2)
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text(`Bestell-ID: ${order.documentId}`)
      .text(`Datum: ${order.createdAt ? new Date(order.createdAt).toLocaleString('de-DE') : ''}`)
      .text(`Kunde: ${order.customerName || order.customerEmail || '—'}`);

    if (order.shippingAddress && typeof order.shippingAddress === 'object') {
      const a = order.shippingAddress as Record<string, string>;
      const line = [a.street, a.postalCode, a.city, a.country].filter(Boolean).join(', ');
      if (line) doc.text(`Lieferadresse: ${line}`);
    }

    doc.moveDown(0.6);
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(48, doc.y)
      .lineTo(547, doc.y)
      .stroke();
    doc.moveDown(0.6);

    productionItems.forEach((item, idx) => {
      if (idx > 0) {
        doc.addPage();
      }

      doc
        .fillColor('#111827')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(`Artikel ${idx + 1}: ${item.productName}`);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(`Stückzahl: ${item.quantity}`);
      doc.moveDown(0.4);

      const matchingCart = order.items?.find((it) => it.name === item.productName);
      const previewBuffer = matchingCart?.previewImage
        ? dataUrlToBuffer(matchingCart.previewImage)
        : null;

      const previewX = 48;
      const previewY = doc.y;
      const previewW = 220;
      const previewH = 150;

      if (previewBuffer) {
        try {
          doc.image(previewBuffer, previewX, previewY, {
            fit: [previewW, previewH],
            align: 'center',
            valign: 'center',
          });
        } catch {
          doc
            .rect(previewX, previewY, previewW, previewH)
            .fillAndStroke('#f9fafb', '#e5e7eb');
        }
      } else {
        doc.rect(previewX, previewY, previewW, previewH).fillAndStroke('#f9fafb', '#e5e7eb');
        doc
          .fillColor('#9ca3af')
          .fontSize(9)
          .text('Keine Vorschau', previewX, previewY + previewH / 2 - 5, {
            width: previewW,
            align: 'center',
          });
      }

      // Customization table on the right
      const tableX = previewX + previewW + 20;
      let tableY = previewY;
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Konfiguration', tableX, tableY);
      tableY += 16;
      doc.font('Helvetica').fontSize(10);
      for (const [k, v] of formatCustomization(item.customization as Record<string, unknown>)) {
        doc.fillColor('#6b7280').text(k, tableX, tableY, { width: 120, continued: false });
        doc.fillColor('#111827').text(v, tableX + 120, tableY, { width: 140 });
        tableY += 14;
      }

      doc.y = Math.max(previewY + previewH, tableY) + 18;

      const isCurtain = item.kind === 'curtain';

      // Cutting list / fabric list
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(isCurtain ? 'Stoffliste' : 'Zuschnittliste', 48, doc.y);
      doc.moveDown(0.3);

      const cols = isCurtain
        ? [
            { label: 'Teil', w: 210 },
            { label: 'Stk', w: 40 },
            { label: 'B (cm)', w: 60 },
            { label: 'H (cm)', w: 60 },
            { label: 'Material', w: 129 },
          ]
        : [
            { label: 'Teil', w: 165 },
            { label: 'Stk', w: 30 },
            { label: 'B (mm)', w: 55 },
            { label: 'H (mm)', w: 55 },
            { label: 'T (mm)', w: 55 },
            { label: 'Material', w: 95 },
            { label: 'Kante', w: 40 },
          ];

      let x = 48;
      const headerY = doc.y;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
      cols.forEach((col) => {
        doc.text(col.label, x, headerY, { width: col.w });
        x += col.w;
      });
      doc.moveDown(0.2);
      doc
        .strokeColor('#d1d5db')
        .lineWidth(0.5)
        .moveTo(48, doc.y)
        .lineTo(547, doc.y)
        .stroke();
      doc.moveDown(0.2);

      doc.font('Helvetica').fontSize(9);
      const fmtCm = (mm: number) => (mm / 10).toFixed(0);
      for (const part of item.cuttingList) {
        const rowY = doc.y;
        let cx = 48;
        const row = isCurtain
          ? [
              part.label,
              String(part.quantity),
              fmtCm(part.widthMm),
              fmtCm(part.heightMm),
              part.material,
            ]
          : [
              part.label,
              String(part.quantity),
              String(part.widthMm),
              String(part.heightMm),
              String(part.depthMm),
              part.material,
              part.edgeBanding ? 'ja' : '—',
            ];
        cols.forEach((col, i) => {
          doc.fillColor('#111827').text(row[i], cx, rowY, { width: col.w });
          cx += col.w;
        });
        doc.moveDown(0.4);
        if (part.notes) {
          doc.fillColor('#6b7280').fontSize(8).text(`  ${part.notes}`, 48, doc.y, { width: 499 });
          doc.fontSize(9);
          doc.moveDown(0.2);
        }
      }

      doc.moveDown(0.5);

      // Hardware / accessories
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(isCurtain ? 'Verbrauch & Zubehör' : 'Beschläge & Verbinder', 48, doc.y);
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10);
      for (const hw of item.hardware) {
        const rowY = doc.y;
        doc.fillColor('#111827').text(`• ${hw.label}`, 60, rowY, { width: 380, lineBreak: false });
        doc.fillColor('#6b7280').text(`${hw.quantity}×`, 440, rowY, { width: 107, align: 'right' });
        doc.y = rowY + 14;
      }

      doc.moveDown(0.6);

      // Summary box
      const sumY = doc.y;
      doc.rect(48, sumY, 499, 40).fillAndStroke('#f3f4f6', '#e5e7eb');
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10);
      if (isCurtain) {
        doc.text(`Stoffbedarf gesamt: ${item.totalSheetAreaM2} m`, 60, sumY + 8, { lineBreak: false });
        doc.text(`Stoffgewicht ca.: ${item.estimatedWeightKg} kg`, 60, sumY + 24, { lineBreak: false });
      } else {
        doc.text(`Plattenfläche gesamt: ${item.totalSheetAreaM2} m²`, 60, sumY + 8, { lineBreak: false });
        doc.text(`Geschätztes Gewicht: ${item.estimatedWeightKg} kg`, 60, sumY + 24, { lineBreak: false });
      }
      doc.y = sumY + 50;
    });

    // Footer on each page (above bottom margin to avoid auto-pagination)
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .fillColor('#9ca3af')
        .fontSize(8)
        .text(
          `Produktionsauftrag · ${order.documentId} · Seite ${i - range.start + 1} / ${range.count}`,
          48,
          doc.page.height - 22,
          { width: 499, align: 'center', lineBreak: false }
        );
    }

    doc.end();
  });
}
