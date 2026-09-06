import PDFDocument from 'pdfkit';
import {
  difficultyLabel,
  getCondition,
  getExtra,
  getObjectType,
  getService,
  quoteCatalog,
} from './quote-pricing';
import type { QuoteBreakdown, QuoteWorkingValues } from './quote-pricing';

const ISSUER = {
  name: process.env.INVOICE_ISSUER_NAME || 'Unique Factory Berlin',
  street: process.env.INVOICE_ISSUER_STREET || '',
  postalCode: process.env.INVOICE_ISSUER_POSTAL || '',
  city: process.env.INVOICE_ISSUER_CITY || 'Berlin',
  country: process.env.INVOICE_ISSUER_COUNTRY || 'Deutschland',
  email: process.env.INVOICE_ISSUER_EMAIL || '',
  phone: process.env.INVOICE_ISSUER_PHONE || '',
  taxId: process.env.INVOICE_ISSUER_TAX_ID || '',
  vatId: process.env.INVOICE_ISSUER_VAT_ID || '',
};

export interface OfferInput {
  quoteCode: string;
  offerNumber: string;
  offeredAt: string | Date;
  validUntil?: string | Date | null;
  customerName?: string | null;
  customerEmail?: string | null;
  objectLabel?: string | null;
  workingValues: QuoteWorkingValues;
  breakdown: QuoteBreakdown;
  offerNotes?: string | null;
  aiAssessment?: Record<string, unknown> | null;
  /** Wenn true, wird die KI-Einschaetzung als zweite Seite angehaengt. */
  includeAssessment?: boolean;
  fabricLabel?: string | null;
}

function fmt(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function num(v: number): string {
  return v.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

/** Strapi richtext ist Markdown — fuers PDF reicht das Entfernen der Auszeichnung. */
function plain(md?: string | null): string {
  if (!md) return '';
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\r/g, '')
    .trim();
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function generateOfferPdf(offer: OfferInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 56, bottom: 50, left: 56, right: 56 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const left = 56;
    const right = pageW - 56;
    const v = offer.workingValues;

    // --- Kopf ---
    doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
    doc.text(
      [ISSUER.name, ISSUER.street, [ISSUER.postalCode, ISSUER.city].filter(Boolean).join(' '), ISSUER.country]
        .filter(Boolean)
        .join(' · '),
      left,
      40,
      { width: pageW - 112, align: 'right' }
    );

    doc.fillColor('#111827').fontSize(10).text('', left, 110);
    for (const line of [offer.customerName || '', offer.customerEmail || ''].filter(Boolean)) {
      doc.text(line, left);
    }

    const titleY = 110;
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(20).text('Angebot', 320, titleY, {
      width: right - 320,
      align: 'right',
    });
    doc.font('Helvetica').fontSize(10);
    const issued = offer.offeredAt ? new Date(offer.offeredAt) : new Date();
    const metaRows: Array<[string, string]> = [
      ['Angebotsnummer', offer.offerNumber],
      ['Datum', issued.toLocaleDateString('de-DE')],
      ['Anfrage-Code', offer.quoteCode],
    ];
    if (offer.validUntil) {
      metaRows.push(['Gültig bis', new Date(offer.validUntil).toLocaleDateString('de-DE')]);
    }
    let metaY = titleY + 32;
    for (const [k, val] of metaRows) {
      doc.fillColor('#6b7280').text(k, 320, metaY, { width: 130, align: 'right' });
      doc.fillColor('#111827').text(val, 450, metaY, { width: right - 450, align: 'right' });
      metaY += 14;
    }

    // --- Leistungsbeschreibung ---
    let y = Math.max(metaY, 210) + 20;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827');
    doc.text(offer.objectLabel || getObjectType(v.objectType).label, left, y, { width: right - left });
    y = doc.y + 4;

    doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
    const specs = [
      `Leistung: ${getService(v.service).label}`,
      `Anzahl: ${v.quantity}`,
      `Material: ${offer.fabricLabel || (v.materialKind === 'leather' ? 'Leder' : 'Stoff')}`,
      `Materialbedarf: ${num(offer.breakdown.meta.fabricMeters)} lfm`,
      `Arbeitszeit: ${num(offer.breakdown.meta.laborHours)} Std.`,
      `Schwierigkeit: ${v.difficulty}/5 (${difficultyLabel(v.difficulty)})`,
      `Zustand: ${getCondition(v.condition).label}`,
    ];
    doc.text(specs.join('  ·  '), left, y, { width: right - left });
    y = doc.y + 6;

    const extraLabels = (v.extras || []).map((id) => getExtra(id)?.label).filter(Boolean);
    if (extraLabels.length) {
      doc.text(`Enthaltene Zusatzarbeiten: ${extraLabels.join(', ')}`, left, y, { width: right - left });
      y = doc.y + 6;
    }

    if (offer.offerNotes) {
      y += 6;
      doc.font('Helvetica').fontSize(10).fillColor('#111827');
      doc.text(plain(offer.offerNotes), left, y, { width: right - left });
      y = doc.y + 6;
    }

    // --- Positionen ---
    y += 14;
    const cols = [
      { label: 'Pos.', w: 32, x: left, align: 'left' as const },
      { label: 'Bezeichnung', w: 300, x: 88, align: 'left' as const },
      { label: 'Netto', w: 110, x: 429, align: 'right' as const },
    ];
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
    for (const c of cols) doc.text(c.label, c.x, y, { width: c.w, align: c.align });
    doc.strokeColor('#d1d5db').lineWidth(0.5).moveTo(left, y + 14).lineTo(right, y + 14).stroke();

    y += 20;
    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    offer.breakdown.lines.forEach((line, i) => {
      doc.fillColor('#111827').text(String(i + 1), cols[0].x, y, { width: cols[0].w });
      doc.text(line.label, cols[1].x, y, { width: cols[1].w });
      doc.text(fmt(line.amount), cols[2].x, y, { width: cols[2].w, align: 'right' });
      if (line.detail) {
        doc.fillColor('#9ca3af').fontSize(8).text(line.detail, cols[1].x, doc.y + 1, { width: cols[1].w });
        doc.fontSize(9);
      }
      y = doc.y + 8;
    });

    // --- Summen ---
    y += 4;
    doc.strokeColor('#d1d5db').lineWidth(0.5).moveTo(330, y).lineTo(right, y).stroke();
    y += 8;
    const totals: Array<[string, string, boolean]> = [
      ['Netto', fmt(offer.breakdown.net), false],
      [`USt. ${Math.round(quoteCatalog.rates.vatRate * 100)} %`, fmt(offer.breakdown.vat), false],
      ['Gesamt brutto', fmt(offer.breakdown.gross), true],
    ];
    for (const [k, val, bold] of totals) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10);
      doc.fillColor(bold ? '#111827' : '#6b7280').text(k, 330, y, { width: 130, align: 'right' });
      doc.fillColor('#111827').text(val, 460, y, { width: right - 460, align: 'right' });
      y += bold ? 18 : 14;
    }

    y += 16;
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
    doc.text(
      offer.validUntil
        ? `Dieses Angebot ist bis zum ${new Date(offer.validUntil).toLocaleDateString('de-DE')} gültig. Verbindlich nach Sichtung des Objekts in unserer Werkstatt.`
        : 'Verbindlich nach Sichtung des Objekts in unserer Werkstatt.',
      left,
      y,
      { width: right - left }
    );

    // --- Seite 2: KI-Einschaetzung ---
    if (offer.includeAssessment && offer.aiAssessment) {
      const a = offer.aiAssessment as Record<string, unknown>;
      doc.addPage();
      let ay = 70;
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827');
      doc.text('Einschätzung im Detail', left, ay);
      ay = doc.y + 10;

      if (typeof a.summary === 'string' && a.summary) {
        doc.font('Helvetica').fontSize(10).fillColor('#374151');
        doc.text(a.summary, left, ay, { width: right - left });
        ay = doc.y + 12;
      }

      const blocks: Array<[string, string[]]> = [
        ['Was den Aufwand treibt', asStringArray(a.difficultyReasons)],
        ['Mögliche Zusatzkosten', asStringArray(a.riskFlags)],
        ['Getroffene Annahmen', asStringArray(a.assumptions)],
        ['Offene Fragen', asStringArray(a.followUpQuestions)],
      ];
      for (const [title, items] of blocks) {
        if (!items.length) continue;
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280');
        doc.text(title.toUpperCase(), left, ay, { width: right - left });
        ay = doc.y + 4;
        doc.font('Helvetica').fontSize(9.5).fillColor('#111827');
        for (const item of items) {
          doc.text(`•  ${item}`, left, ay, { width: right - left, indent: 0 });
          ay = doc.y + 2;
        }
        ay += 10;
      }

      doc.font('Helvetica').fontSize(8).fillColor('#9ca3af');
      doc.text(
        'Diese Einschätzung entstand aus den übermittelten Fotos und Angaben und wurde von unserer Werkstatt geprüft. Sie dient der Nachvollziehbarkeit des Angebots.',
        left,
        ay + 4,
        { width: right - left }
      );
    }

    // --- Fusszeile auf allen Seiten ---
    // Der Fussbereich liegt unterhalb des unteren Rands. pdfkit legt fuer Text
    // jenseits dieser Grenze automatisch eine neue Seite an — was hier eine
    // Kettenreaktion ausloest, weil jede neue Seite wieder eine Fusszeile
    // braucht. Waehrend des Zeichnens den unteren Rand auf 0 setzen.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const origBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const fy = doc.page.height - 42;
      doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(left, fy).lineTo(right, fy).stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
      doc.text(
        [ISSUER.name, ISSUER.street, [ISSUER.postalCode, ISSUER.city].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join('\n'),
        left,
        fy + 6,
        { width: 180 }
      );
      doc.text(
        [
          ISSUER.email ? `E-Mail: ${ISSUER.email}` : '',
          ISSUER.phone ? `Tel: ${ISSUER.phone}` : '',
          ISSUER.taxId ? `Steuernr.: ${ISSUER.taxId}` : '',
          ISSUER.vatId ? `USt-IdNr.: ${ISSUER.vatId}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        250,
        fy + 6,
        { width: right - 250 }
      );
      doc.page.margins.bottom = origBottom;
    }

    doc.end();
  });
}
