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

// Stone palette mirrors frontend/src/app/globals.css.
const COLOR = {
  text: '#1c1917',
  muted: '#78716c',
  border: '#e7e5e4',
  surface: '#fafaf9',
  rule: '#d6d3d1',
} as const;

const PAGE_W = 595.28; // A4 width in points
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2; // 483.28
const FOOTER_RESERVE = 48; // space kept clear at page bottom for the footer

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
      const doors = val.filter((x) => x === 'door').length;
      const drawers = val.filter((x) => x === 'drawer').length;
      const open = val.filter((x) => x === 'open').length;
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
  const m = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  try {
    return Buffer.from(m[2], 'base64');
  } catch {
    return null;
  }
}

// Reserve vertical space; insert a page break if the next block would clash with the footer.
function ensureRoom(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - FOOTER_RESERVE) {
    doc.addPage();
  }
}

function eyebrow(doc: PDFKit.PDFDocument, text: string, x: number, y: number): void {
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(COLOR.muted)
    .text(text.toUpperCase(), x, y, {
      characterSpacing: 1.4,
      lineBreak: false,
    });
}

function rule(doc: PDFKit.PDFDocument, y: number, color: string = COLOR.border, weight = 0.75): void {
  doc.strokeColor(color).lineWidth(weight).moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).stroke();
}

function fmtMm(mm: number): string {
  return Math.round(mm).toLocaleString('de-DE');
}

function fmtCm(mm: number): string {
  return (mm / 10).toFixed(0);
}

export function generateProductionPdf(
  order: OrderForPdf,
  productionItems: ProductionItem[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: 40, left: MARGIN, right: MARGIN },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ---------- HEADER ----------
    eyebrow(doc, 'Produktionsauftrag · Unique Factory Berlin', MARGIN, MARGIN);

    doc
      .font('Times-Roman')
      .fontSize(28)
      .fillColor(COLOR.text)
      .text(`Auftrag #${order.documentId.slice(-8).toUpperCase()}`, MARGIN, MARGIN + 18, {
        lineBreak: false,
      });

    const metaY = MARGIN + 60;
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted);
    const left = MARGIN;
    const right = MARGIN + CONTENT_W / 2 + 8;
    const colW = CONTENT_W / 2 - 8;

    const leftLines: Array<[string, string]> = [
      ['Bestell-ID', order.documentId],
      ['Datum', order.createdAt ? new Date(order.createdAt).toLocaleString('de-DE') : '—'],
    ];
    const rightLines: Array<[string, string]> = [
      ['Kunde', order.customerName || order.customerEmail || '—'],
    ];
    if (order.shippingAddress && typeof order.shippingAddress === 'object') {
      const a = order.shippingAddress as Record<string, string>;
      const addrLine = [a.street, a.postalCode, a.city, a.country].filter(Boolean).join(', ');
      if (addrLine) rightLines.push(['Lieferadresse', addrLine]);
    }

    const drawMetaLines = (lines: Array<[string, string]>, x: number) => {
      let yy = metaY;
      for (const [label, value] of lines) {
        doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR.muted)
          .text(label.toUpperCase(), x, yy, { width: colW, characterSpacing: 1.2, lineBreak: false });
        doc.font('Helvetica').fontSize(10).fillColor(COLOR.text)
          .text(value, x, yy + 10, { width: colW });
        yy = doc.y + 6;
      }
      return yy;
    };
    const yLeft = drawMetaLines(leftLines, left);
    const yRight = drawMetaLines(rightLines, right);
    const headerEndY = Math.max(yLeft, yRight) + 4;

    rule(doc, headerEndY);
    doc.y = headerEndY + 18;

    // ---------- ITEMS ----------
    productionItems.forEach((item, idx) => {
      if (idx > 0) doc.addPage();

      const isCurtain = item.kind === 'curtain';

      // Eyebrow + title
      eyebrow(doc, `Artikel ${idx + 1} von ${productionItems.length}`, MARGIN, doc.y);
      doc.y += 12;

      doc
        .font('Times-Roman')
        .fontSize(20)
        .fillColor(COLOR.text)
        .text(item.productName, MARGIN, doc.y, { width: CONTENT_W });

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COLOR.muted)
        .text(`Stückzahl: ${item.quantity}`, MARGIN, doc.y + 4);

      doc.y += 18;

      // ---------- PREVIEW + CONFIG ROW ----------
      const matchingCart = order.items?.find((it) => it.name === item.productName);
      const previewBuffer = matchingCart?.previewImage
        ? dataUrlToBuffer(matchingCart.previewImage)
        : null;

      const previewW = 220;
      const previewH = 140;
      const previewX = MARGIN;
      const previewY = doc.y;

      // Preview frame
      doc.rect(previewX, previewY, previewW, previewH).fillAndStroke(COLOR.surface, COLOR.border);
      if (previewBuffer) {
        try {
          doc.image(previewBuffer, previewX + 4, previewY + 4, {
            fit: [previewW - 8, previewH - 8],
            align: 'center',
            valign: 'center',
          });
        } catch {
          // fallthrough — placeholder is already drawn
          doc.fillColor(COLOR.muted).font('Helvetica').fontSize(9)
            .text('Vorschau konnte nicht geladen werden', previewX, previewY + previewH / 2 - 5, {
              width: previewW, align: 'center',
            });
        }
      } else {
        doc.fillColor(COLOR.muted).font('Helvetica').fontSize(9)
          .text('Keine Vorschau', previewX, previewY + previewH / 2 - 5, {
            width: previewW, align: 'center',
          });
      }

      // Customization table
      const tableX = previewX + previewW + 24;
      const tableW = CONTENT_W - previewW - 24;
      const labelW = Math.min(120, tableW * 0.45);
      const valueW = tableW - labelW;

      eyebrow(doc, 'Konfiguration', tableX, previewY);
      let tableY = previewY + 14;
      doc.font('Helvetica').fontSize(9.5);
      for (const [k, v] of formatCustomization(item.customization as Record<string, unknown>)) {
        doc.fillColor(COLOR.muted).text(k, tableX, tableY, { width: labelW, lineBreak: false, ellipsis: true });
        const startY = tableY;
        doc.fillColor(COLOR.text).text(v, tableX + labelW, startY, { width: valueW, lineBreak: false, ellipsis: true });
        tableY = startY + 13;
      }

      doc.y = Math.max(previewY + previewH, tableY) + 16;

      // ---------- CUTTING LIST ----------
      ensureRoom(doc, 80);
      eyebrow(doc, isCurtain ? 'Stoffliste' : 'Zuschnittliste', MARGIN, doc.y);
      doc.y += 12;

      // Column layout: Teil | Stk | L | B | S | Material | Kante (furniture)
      //               Teil | Stk | B (cm) | H (cm) | Material (curtain)
      type Col = { label: string; w: number; align?: 'left' | 'right' };
      const cols: Col[] = isCurtain
        ? [
            { label: 'Teil', w: 200 },
            { label: 'Stk', w: 32, align: 'right' },
            { label: 'B (cm)', w: 56, align: 'right' },
            { label: 'H (cm)', w: 56, align: 'right' },
            { label: 'Material', w: CONTENT_W - 200 - 32 - 56 - 56 },
          ]
        : [
            { label: 'Teil', w: 158 },
            { label: 'Stk', w: 28, align: 'right' },
            { label: 'L (mm)', w: 52, align: 'right' },
            { label: 'B (mm)', w: 52, align: 'right' },
            { label: 'S (mm)', w: 44, align: 'right' },
            { label: 'Material', w: 110 },
            { label: 'Kante', w: CONTENT_W - 158 - 28 - 52 - 52 - 44 - 110 },
          ];

      // Right-aligned cells get an inner gutter so the right edge of one column doesn't
      // butt against the left edge of the next.
      const cellWidth = (col: Col) => (col.align === 'right' ? col.w - 8 : col.w);

      // Header row
      const headerY = doc.y;
      let cx = MARGIN;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLOR.muted);
      cols.forEach((col) => {
        doc.text(col.label.toUpperCase(), cx, headerY, {
          width: cellWidth(col),
          align: col.align ?? 'left',
          characterSpacing: 1.2,
          lineBreak: false,
        });
        cx += col.w;
      });
      doc.y = headerY + 12;
      rule(doc, doc.y, COLOR.rule, 0.5);
      doc.y += 6;

      doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.text);
      for (const part of item.cuttingList) {
        const rowH = 16 + (part.notes ? 12 : 0);
        ensureRoom(doc, rowH + 4);

        const rowY = doc.y;
        let rx = MARGIN;
        const cells = isCurtain
          ? [
              part.label,
              String(part.quantity),
              fmtCm(part.widthMm),
              fmtCm(part.lengthMm),
              part.material,
            ]
          : [
              part.label,
              String(part.quantity),
              fmtMm(part.lengthMm),
              fmtMm(part.widthMm),
              part.thicknessMm > 0 ? fmtMm(part.thicknessMm) : '—',
              part.material,
              part.edgeBanding ? 'ja' : '—',
            ];
        cols.forEach((col, i) => {
          doc.fillColor(COLOR.text).text(cells[i], rx, rowY, {
            width: cellWidth(col),
            align: col.align ?? 'left',
            lineBreak: false,
            ellipsis: true,
          });
          rx += col.w;
        });
        doc.y = rowY + 14;

        if (part.notes) {
          doc.fillColor(COLOR.muted).fontSize(8).text(part.notes, MARGIN + 12, doc.y, {
            width: CONTENT_W - 12,
          });
          doc.fontSize(9.5);
          doc.y += 2;
        }
      }

      doc.y += 10;

      // ---------- HARDWARE ----------
      ensureRoom(doc, 50);
      eyebrow(doc, isCurtain ? 'Verbrauch & Zubehör' : 'Beschläge & Verbinder', MARGIN, doc.y);
      doc.y += 12;

      doc.font('Helvetica').fontSize(9.5);
      for (const hw of item.hardware) {
        ensureRoom(doc, 14);
        const rowY = doc.y;
        doc.fillColor(COLOR.text).text(hw.label, MARGIN + 4, rowY, {
          width: CONTENT_W - 80,
          lineBreak: false,
          ellipsis: true,
        });
        doc.fillColor(COLOR.muted).text(`${hw.quantity}×`, MARGIN + CONTENT_W - 60, rowY, {
          width: 60,
          align: 'right',
          lineBreak: false,
        });
        doc.y = rowY + 13;
      }

      doc.y += 10;

      // ---------- SUMMARY ----------
      ensureRoom(doc, 64);
      const sumY = doc.y;
      doc.rect(MARGIN, sumY, CONTENT_W, 52).fillAndStroke(COLOR.surface, COLOR.border);

      const sumColW = CONTENT_W / 2;
      const sumPad = 14;

      eyebrow(doc, isCurtain ? 'Stoffbedarf' : 'Plattenfläche', MARGIN + sumPad, sumY + 12);
      doc.font('Times-Roman').fontSize(16).fillColor(COLOR.text).text(
        isCurtain ? `${item.totalSheetAreaM2.toFixed(2)} m` : `${item.totalSheetAreaM2.toFixed(2)} m²`,
        MARGIN + sumPad,
        sumY + 24,
        { width: sumColW - sumPad * 2, lineBreak: false },
      );

      eyebrow(doc, isCurtain ? 'Stoffgewicht ca.' : 'Geschätztes Gewicht', MARGIN + sumColW + sumPad, sumY + 12);
      doc.font('Times-Roman').fontSize(16).fillColor(COLOR.text).text(
        `${item.estimatedWeightKg.toFixed(1)} kg`,
        MARGIN + sumColW + sumPad,
        sumY + 24,
        { width: sumColW - sumPad * 2, lineBreak: false },
      );

      doc.y = sumY + 60;
    });

    // ---------- FOOTER ON EVERY PAGE ----------
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // PDFKit auto-paginates if text() targets a y past the bottom margin, even with
      // lineBreak:false. Temporarily lift the margin so the footer can sit at the very
      // bottom without triggering a runaway addPage cascade.
      const origBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const footerY = doc.page.height - 28;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(COLOR.muted)
        .text(
          `Unique Factory Berlin · ${order.documentId} · Seite ${i - range.start + 1} / ${range.count}`,
          MARGIN,
          footerY,
          {
            width: CONTENT_W,
            align: 'center',
            characterSpacing: 0.8,
            lineBreak: false,
          },
        );
      doc.page.margins.bottom = origBottom;
    }

    doc.end();
  });
}
