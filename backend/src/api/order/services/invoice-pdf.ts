import PDFDocument from 'pdfkit';

const VAT_RATE = Number(process.env.INVOICE_VAT_RATE || 19);

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
  iban: process.env.INVOICE_ISSUER_IBAN || '',
  bic: process.env.INVOICE_ISSUER_BIC || '',
  bank: process.env.INVOICE_ISSUER_BANK || '',
};

interface InvoiceOrder {
  documentId: string;
  invoiceNumber: string;
  invoicedAt: string | Date;
  createdAt?: string | Date;
  customerEmail?: string | null;
  customerName?: string | null;
  totalAmount: number; // gross cents
  currency: string;
  promoCode?: string | null;
  discountAmount?: number | null; // gross cents
  shippingAddress?: Record<string, string> | null;
  items: Array<{
    name: string;
    quantity: number;
    totalPrice: number; // unit gross in cents
  }>;
  shippingCost?: number; // gross cents, optional — if absent, derived
}

function fmt(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: (currency || 'eur').toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${(currency || '').toUpperCase()}`.trim();
  }
}

function grossToNet(grossCents: number, rate: number): { net: number; vat: number } {
  const net = Math.round(grossCents / (1 + rate / 100));
  return { net, vat: grossCents - net };
}

export function generateInvoicePdf(order: InvoiceOrder): Promise<Buffer> {
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
    const right = pageW - 56;
    const currency = order.currency || 'eur';

    // --- Header: issuer top-right, customer top-left ---
    doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
    const issuerLine = [
      ISSUER.name,
      [ISSUER.street].filter(Boolean).join(''),
      [ISSUER.postalCode, ISSUER.city].filter(Boolean).join(' '),
      ISSUER.country,
    ]
      .filter(Boolean)
      .join(' · ');
    doc.text(issuerLine, 56, 40, { width: pageW - 112, align: 'right' });

    // Customer address block
    doc.fillColor('#111827').fontSize(10).font('Helvetica').text('', 56, 110);
    const a = order.shippingAddress || {};
    const addressLines = [
      order.customerName ||
        `${a.firstName || ''} ${a.lastName || ''}`.trim() ||
        order.customerEmail ||
        '',
      a.street || '',
      `${a.postalCode || ''} ${a.city || ''}`.trim(),
      a.country || '',
    ].filter((l) => l && l.trim().length > 0);
    for (const line of addressLines) {
      doc.text(line, 56);
    }

    // --- Title block on the right ---
    const titleY = 110;
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(20).text('Rechnung', 320, titleY, {
      width: right - 320,
      align: 'right',
    });
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
    const issuedAt = order.invoicedAt ? new Date(order.invoicedAt) : new Date();
    const metaRows: Array<[string, string]> = [
      ['Rechnungsnummer', order.invoiceNumber],
      ['Rechnungsdatum', issuedAt.toLocaleDateString('de-DE')],
      ['Bestellnummer', order.documentId],
    ];
    let metaY = titleY + 32;
    for (const [k, v] of metaRows) {
      doc.fillColor('#6b7280').text(k, 320, metaY, { width: 130, align: 'right' });
      doc.fillColor('#111827').text(v, 450, metaY, { width: right - 450, align: 'right' });
      metaY += 14;
    }

    // --- Line items table ---
    const tableY = Math.max(metaY, 220) + 24;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
    const cols = [
      { label: 'Pos.', w: 32, x: 56, align: 'left' as const },
      { label: 'Bezeichnung', w: 240, x: 88, align: 'left' as const },
      { label: 'Menge', w: 50, x: 328, align: 'right' as const },
      { label: 'Einzel netto', w: 75, x: 378, align: 'right' as const },
      { label: 'USt.', w: 40, x: 453, align: 'right' as const },
      { label: 'Gesamt brutto', w: 60, x: 493, align: 'right' as const },
    ];
    for (const c of cols) {
      doc.text(c.label, c.x, tableY, { width: c.w, align: c.align });
    }
    doc
      .strokeColor('#d1d5db')
      .lineWidth(0.5)
      .moveTo(56, tableY + 14)
      .lineTo(right, tableY + 14)
      .stroke();

    let rowY = tableY + 20;
    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    let netSubtotal = 0;
    let vatSubtotal = 0;
    let grossItemsSubtotal = 0;

    order.items.forEach((item, idx) => {
      const lineGross = item.totalPrice * item.quantity;
      const { net: unitNet } = grossToNet(item.totalPrice, VAT_RATE);
      const { net: lineNet, vat: lineVat } = grossToNet(lineGross, VAT_RATE);
      netSubtotal += lineNet;
      vatSubtotal += lineVat;
      grossItemsSubtotal += lineGross;

      doc.text(String(idx + 1), cols[0].x, rowY, { width: cols[0].w });
      doc.text(item.name, cols[1].x, rowY, { width: cols[1].w });
      doc.text(String(item.quantity), cols[2].x, rowY, { width: cols[2].w, align: 'right' });
      doc.text(fmt(unitNet, currency), cols[3].x, rowY, { width: cols[3].w, align: 'right' });
      doc.text(`${VAT_RATE}%`, cols[4].x, rowY, { width: cols[4].w, align: 'right' });
      doc.text(fmt(lineGross, currency), cols[5].x, rowY, { width: cols[5].w, align: 'right' });
      rowY += 18;
    });

    // Derive shipping & discount from totals if not provided
    const discountGross = order.discountAmount || 0;
    const shippingGross =
      typeof order.shippingCost === 'number'
        ? order.shippingCost
        : Math.max(0, order.totalAmount - grossItemsSubtotal + discountGross);

    if (discountGross > 0) {
      const { net, vat } = grossToNet(-discountGross, VAT_RATE);
      netSubtotal += net;
      vatSubtotal += vat;
      doc.text('—', cols[0].x, rowY, { width: cols[0].w });
      doc.text(`Rabatt${order.promoCode ? ` (${order.promoCode})` : ''}`, cols[1].x, rowY, {
        width: cols[1].w,
      });
      doc.text('1', cols[2].x, rowY, { width: cols[2].w, align: 'right' });
      doc.text(fmt(net, currency), cols[3].x, rowY, { width: cols[3].w, align: 'right' });
      doc.text(`${VAT_RATE}%`, cols[4].x, rowY, { width: cols[4].w, align: 'right' });
      doc.text(fmt(-discountGross, currency), cols[5].x, rowY, { width: cols[5].w, align: 'right' });
      rowY += 18;
    }

    if (shippingGross > 0) {
      const { net, vat } = grossToNet(shippingGross, VAT_RATE);
      netSubtotal += net;
      vatSubtotal += vat;
      doc.text('—', cols[0].x, rowY, { width: cols[0].w });
      doc.text('Versand', cols[1].x, rowY, { width: cols[1].w });
      doc.text('1', cols[2].x, rowY, { width: cols[2].w, align: 'right' });
      doc.text(fmt(net, currency), cols[3].x, rowY, { width: cols[3].w, align: 'right' });
      doc.text(`${VAT_RATE}%`, cols[4].x, rowY, { width: cols[4].w, align: 'right' });
      doc.text(fmt(shippingGross, currency), cols[5].x, rowY, { width: cols[5].w, align: 'right' });
      rowY += 18;
    }

    // --- Totals box ---
    rowY += 8;
    doc
      .strokeColor('#d1d5db')
      .lineWidth(0.5)
      .moveTo(330, rowY)
      .lineTo(right, rowY)
      .stroke();
    rowY += 8;

    const totalsRows: Array<[string, string, boolean]> = [
      ['Netto', fmt(netSubtotal, currency), false],
      [`USt. ${VAT_RATE}%`, fmt(vatSubtotal, currency), false],
      ['Gesamt', fmt(order.totalAmount, currency), true],
    ];
    for (const [k, v, bold] of totalsRows) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10);
      doc.fillColor(bold ? '#111827' : '#6b7280').text(k, 330, rowY, { width: 130, align: 'right' });
      doc.fillColor('#111827').text(v, 460, rowY, { width: right - 460, align: 'right' });
      rowY += bold ? 18 : 14;
    }

    // --- Payment notice ---
    rowY += 18;
    doc.font('Helvetica').fontSize(10).fillColor('#111827');
    doc.text(
      'Der Rechnungsbetrag wurde per Online-Zahlung beglichen. Vielen Dank für Ihren Einkauf!',
      56,
      rowY,
      { width: right - 56 }
    );

    // --- Footer with issuer details ---
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const fy = doc.page.height - 42;
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(0.5)
        .moveTo(56, fy)
        .lineTo(right, fy)
        .stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
      const col1 = [
        ISSUER.name,
        [ISSUER.street].filter(Boolean).join(''),
        [ISSUER.postalCode, ISSUER.city].filter(Boolean).join(' '),
        ISSUER.country,
      ]
        .filter(Boolean)
        .join('\n');
      const col2 = [
        ISSUER.email ? `E-Mail: ${ISSUER.email}` : '',
        ISSUER.phone ? `Tel: ${ISSUER.phone}` : '',
        ISSUER.taxId ? `Steuernr.: ${ISSUER.taxId}` : '',
        ISSUER.vatId ? `USt-IdNr.: ${ISSUER.vatId}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      const col3 = [
        ISSUER.bank ? `Bank: ${ISSUER.bank}` : '',
        ISSUER.iban ? `IBAN: ${ISSUER.iban}` : '',
        ISSUER.bic ? `BIC: ${ISSUER.bic}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      doc.text(col1, 56, fy + 6, { width: 170 });
      doc.text(col2, 230, fy + 6, { width: 170 });
      doc.text(col3, 400, fy + 6, { width: right - 400 });
    }

    doc.end();
  });
}
