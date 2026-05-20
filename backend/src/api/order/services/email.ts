import nodemailer from 'nodemailer';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
    : undefined,
});

const FROM_ADDRESS = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@customstore.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function sendShippingConfirmationEmail(
  to: string,
  orderData: {
    orderId: string;
    customerName: string;
    trackingNumber: string;
    trackingCarrier?: string;
    items: Array<{ name: string; quantity: number }>;
    shippingAddress: {
      firstName?: string;
      lastName?: string;
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  }
): Promise<void> {
  const itemsList = orderData.items
    .map((item) => `  • ${item.name} (x${item.quantity})`)
    .join('\n');

  const itemsListHtml = orderData.items
    .map((item) => `  • ${escapeHtml(item.name)} (x${escapeHtml(String(item.quantity))})`)
    .join('<br>');

  const address = orderData.shippingAddress;
  const addressStr = address
    ? `${address.firstName || ''} ${address.lastName || ''}\n${address.street || ''}\n${address.postalCode || ''} ${address.city || ''}\n${address.country || ''}`.trim()
    : '';

  const addressHtml = address
    ? `${escapeHtml(address.firstName || '')} ${escapeHtml(address.lastName || '')}<br>${escapeHtml(address.street || '')}<br>${escapeHtml(address.postalCode || '')} ${escapeHtml(address.city || '')}<br>${escapeHtml(address.country || '')}`
    : '';

  const safeOrderId = escapeHtml(orderData.orderId);
  const safeName = escapeHtml(orderData.customerName || 'there');
  const safeTracking = escapeHtml(orderData.trackingNumber);
  const safeCarrier = orderData.trackingCarrier ? ` (${escapeHtml(orderData.trackingCarrier)})` : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:32px 24px;border-bottom:1px solid #e5e7eb;">
        <h1 style="margin:0;font-size:20px;color:#111827;">Your order has been shipped!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
          Hello ${safeName},
        </p>
        <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
          Great news — your order <strong>#${safeOrderId}</strong> is on its way!
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#f3f4f6;border-radius:8px;">
          <tr>
            <td style="padding:16px;">
              <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Tracking Number</p>
              <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${safeTracking}${safeCarrier}</p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#374151;">Items shipped:</p>
        <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.8;">${itemsListHtml}</p>

        ${addressHtml ? `
        <p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#374151;">Shipping to:</p>
        <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">${addressHtml}</p>
        ` : ''}

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:16px 0;">
              <a href="${FRONTEND_URL}" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">Visit our shop</a>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
          Order reference: #${safeOrderId}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">CustomStore — Premium Custom Products</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const trackingCarrierStr = orderData.trackingCarrier ? ` (${orderData.trackingCarrier})` : '';

  const text = `Your order has been shipped!

Hello ${orderData.customerName || 'there'},

Your order #${orderData.orderId} is on its way!

Tracking Number: ${orderData.trackingNumber}${trackingCarrierStr}

Items shipped:
${itemsList}

${addressStr ? `Shipping to:\n${addressStr}\n` : ''}
Order reference: #${orderData.orderId}

Visit our shop: ${FRONTEND_URL}`;

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject: `Your order #${safeOrderId} has been shipped!`,
      text,
      html,
    });
  } catch (err: any) {
    console.error('Failed to send shipping confirmation email:', err.message);
    throw err;
  }
}

function formatCents(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: (currency || 'eur').toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${(currency || '').toUpperCase()}`.trim();
  }
}

export async function sendOrderConfirmationEmail(
  to: string,
  orderData: {
    orderId: string;
    customerName: string;
    totalAmount: number;
    currency: string;
    items: Array<{ name: string; quantity: number; totalPrice: number }>;
    shippingAddress?: {
      firstName?: string;
      lastName?: string;
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    } | null;
  }
): Promise<void> {
  const safeOrderId = escapeHtml(orderData.orderId);
  const safeName = escapeHtml(orderData.customerName || '');
  const lookupUrl = `${FRONTEND_URL}/order-lookup?id=${encodeURIComponent(orderData.orderId)}`;

  const itemsHtml = orderData.items
    .map(
      (it) =>
        `<tr><td style="padding:8px 0;color:#374151;font-size:14px;">${escapeHtml(it.name)} × ${it.quantity}</td><td style="padding:8px 0;text-align:right;color:#111827;font-size:14px;font-weight:600;">${escapeHtml(formatCents(it.totalPrice * it.quantity, orderData.currency))}</td></tr>`
    )
    .join('');

  const itemsText = orderData.items
    .map((it) => `  • ${it.name} × ${it.quantity}  —  ${formatCents(it.totalPrice * it.quantity, orderData.currency)}`)
    .join('\n');

  const a = orderData.shippingAddress;
  const addressHtml = a
    ? `${escapeHtml(a.firstName || '')} ${escapeHtml(a.lastName || '')}<br>${escapeHtml(a.street || '')}<br>${escapeHtml(a.postalCode || '')} ${escapeHtml(a.city || '')}<br>${escapeHtml(a.country || '')}`
    : '';
  const addressText = a
    ? `${a.firstName || ''} ${a.lastName || ''}\n${a.street || ''}\n${a.postalCode || ''} ${a.city || ''}\n${a.country || ''}`.trim()
    : '';

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
  <tr><td style="padding:32px 24px;border-bottom:1px solid #e5e7eb;">
    <h1 style="margin:0;font-size:20px;color:#111827;">Bestellbestätigung</h1>
    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Bestellnummer #${safeOrderId}</p>
  </td></tr>
  <tr><td style="padding:24px;">
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">Hallo ${safeName || 'und vielen Dank für Ihre Bestellung'},</p>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">wir haben Ihre Zahlung erhalten und die Bestellung wird nun bearbeitet. Sie erhalten eine weitere E-Mail, sobald die Ware versandt wurde.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #e5e7eb;">${itemsHtml}
      <tr><td style="padding:12px 0 0;border-top:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:700;">Gesamt</td><td style="padding:12px 0 0;border-top:1px solid #e5e7eb;text-align:right;color:#111827;font-size:14px;font-weight:700;">${escapeHtml(formatCents(orderData.totalAmount, orderData.currency))}</td></tr>
    </table>
    ${addressHtml ? `<p style="margin:16px 0 4px;font-size:13px;font-weight:600;color:#374151;">Lieferadresse</p><p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${addressHtml}</p>` : ''}
    <p style="margin:24px 0 0;"><a href="${lookupUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:13px;font-weight:600;">Bestellstatus ansehen</a></p>
  </td></tr>
</table></body></html>`;

  const text = `Bestellbestätigung — #${orderData.orderId}

Hallo ${orderData.customerName || ''},
wir haben Ihre Zahlung erhalten. Sie erhalten eine weitere E-Mail bei Versand.

Artikel:
${itemsText}

Gesamt: ${formatCents(orderData.totalAmount, orderData.currency)}

${addressText ? `Lieferadresse:\n${addressText}\n\n` : ''}Bestellstatus: ${lookupUrl}`;

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject: `Bestellbestätigung #${orderData.orderId}`,
      text,
      html,
    });
  } catch (err: any) {
    console.error('Failed to send order confirmation email:', err.message);
  }
}
