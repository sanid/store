import { factories } from '@strapi/strapi';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { sendShippingConfirmationEmail, sendOrderConfirmationEmail } from '../services/email';
import { buildProductionDataForOrder } from '../services/production';
import { generateProductionPdf } from '../services/production-pdf';
import { generateInvoicePdf } from '../services/invoice-pdf';
import { priceCurtain } from '../services/curtain-pricing';
import { createDhlLabel, isDhlConfigured } from '../services/dhl';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey) : null;

const SHIPPING_ZONES: Record<string, { countries: string[]; rate: number }> = {
  de: { countries: ['DE'], rate: 499 },
  eu: { countries: ['AT', 'BE', 'FR', 'NL', 'GB'], rate: 999 },
  international: { countries: ['US', 'CA'], rate: 1499 },
};

const FREE_SHIPPING_THRESHOLD = 7500;

function getShippingRate(country: string, subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  for (const zone of Object.values(SHIPPING_ZONES)) {
    if (zone.countries.includes(country)) return zone.rate;
  }
  return SHIPPING_ZONES.international.rate;
}

function pricePieces(c: Record<string, unknown>): number {
  // Clamp to realistic furniture bounds (cm). Without this, a crafted payload could
  // multiply to absurd cubic-cm and bill the customer millions.
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  const width = clamp(Number(c.width) || 200, 10, 400);
  const height = clamp(Number(c.height) || 84, 10, 300);
  const depth = clamp(Number(c.depth) || 40, 10, 120);
  const columns = clamp(Number(c.columns) || 4, 1, 12);
  const rows = clamp(Number(c.rows) || 2, 1, 10);
  const doors = Array.isArray(c.doors) ? (c.doors as boolean[]) : [];
  const backs = !!c.backs;
  const finish = String(c.finish || 'color');
  const base = String(c.base || 'legs');

  const cubicCm = width * height * depth;
  const priceBase = 39900;
  const perCm3 = 0.18;
  const cells = rows * columns;
  const doorCount = doors.filter(Boolean).length;
  const backsCost = backs ? cells * 1500 : 0;
  const finishMul = finish === 'veneer' ? 1.35 : finish === 'plywood' ? 1.1 : 1;
  const baseAdd = base === 'plinth' ? 4900 : 2900;
  return Math.round(
    (priceBase + cubicCm * perCm3 / 4 + cells * 1800 + doorCount * 2200 + backsCost + baseAdd) * finishMul
  );
}

function calculatePriceAdjustment(
  schema: {
    preset?: string;
    pricingBase?: number;
    pricingRules?: Array<{ field: string; type: string; rate: number }>;
    fields?: Array<{
      id: string;
      type: string;
      options?: Array<{ value: string; priceModifier?: number }>;
      priceModifier?: Record<string, number>;
      pricePerUnit?: number;
    }>;
  } | null,
  customization: Record<string, unknown> | null
): number {
  if (!customization) return 0;

  if (schema?.preset === 'furniture') {
    return pricePieces(customization);
  }

  if (schema?.preset === 'curtain') {
    return priceCurtain(customization);
  }

  if (!schema?.fields) return 0;

  if (typeof schema.pricingBase === 'number' && schema.pricingBase > 0) {
    let price = schema.pricingBase;

    for (const rule of schema.pricingRules || []) {
      const val = Number(customization[rule.field]) || 0;
      if (rule.type === 'linear' && rule.rate) {
        price += val * rule.rate;
      }
    }

    for (const field of schema.fields) {
      const val = customization[field.id];
      if (val == null || val === '') continue;

      if (field.type === 'select' && field.options) {
        const selected = field.options.find((opt) => opt.value === String(val));
        if (selected && typeof selected.priceModifier === 'number' && selected.priceModifier > 0) {
          price += selected.priceModifier;
        }
      } else if (field.type === 'number' && field.pricePerUnit && typeof val === 'number') {
        price += val * field.pricePerUnit;
      } else if (field.priceModifier && field.priceModifier[String(val)]) {
        const mod = field.priceModifier[String(val)];
        if (typeof mod === 'number' && mod > 0) {
          price += mod;
        }
      }
    }

    return price;
  }

  let adjustment = 0;
  for (const field of schema.fields) {
    const val = customization[field.id];
    if (val == null || val === '') continue;

    if (field.type === 'select' && field.options) {
      const selected = field.options.find((opt) => opt.value === String(val));
      if (selected && typeof selected.priceModifier === 'number' && selected.priceModifier > 0) {
        adjustment += selected.priceModifier;
      }
    } else if (field.type === 'number' && field.pricePerUnit && typeof val === 'number') {
      adjustment += val * field.pricePerUnit;
    } else if (field.priceModifier && field.priceModifier[String(val)]) {
      const mod = field.priceModifier[String(val)];
      if (typeof mod === 'number' && mod > 0) {
        adjustment += mod;
      }
    }
  }
  return adjustment;
}

export default factories.createCoreController('api::order.order', ({ strapi }: { strapi: any }) => ({
  async createPaymentIntent(ctx: any) {
    const { cartItems, customerEmail, shippingCountry, shippingAddress, promoCode } = ctx.request.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return ctx.badRequest('cartItems is required and must be a non-empty array');
    }

    if (!customerEmail || typeof customerEmail !== 'string') {
      return ctx.badRequest('customerEmail is required');
    }

    if (!shippingCountry || typeof shippingCountry !== 'string') {
      return ctx.badRequest('shippingCountry is required');
    }

    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return ctx.badRequest('shippingAddress is required');
    }

    if (!stripe) {
      return ctx.internalServerError('Stripe is not configured');
    }

    const currency = process.env.STRIPE_CURRENCY || 'eur';

    try {
      const orderLines: Array<{
        productId: string;
        name: string;
        basePrice: number;
        totalPrice: number;
        quantity: number;
        customization: Record<string, unknown>;
        previewImage?: string;
      }> = [];
      let subtotal = 0;

      for (const item of cartItems) {
        let product = await strapi.documents('api::product.product').findOne({
          documentId: item.productId,
          populate: { image: true },
        });

        if (!product) {
          product = await strapi.documents('api::product.product').findOne({
            documentId: item.productId,
            populate: { image: true },
            status: 'draft',
          });
        }

        if (!product) {
          strapi.log.warn(`Product not found for documentId: ${item.productId}`);
          return ctx.badRequest('One or more products in your cart are unavailable');
        }

        const qty = Math.max(1, Math.min(Math.floor(Number(item.quantity) || 1), 99));

        if (product.inventory !== null && product.inventory !== undefined && product.inventory < qty) {
          return ctx.badRequest(`"${product.name}" is out of stock or insufficient inventory`);
        }

        const serverAdjustment = calculatePriceAdjustment(
          product.customizationSchema,
          item.customization
        );
        const schema = product.customizationSchema as { preset?: string; pricingBase?: number } | null;
        const isFullPrice = schema?.preset === 'furniture' || schema?.preset === 'curtain' || (typeof schema?.pricingBase === 'number' && schema.pricingBase > 0);
        const unitAmount = isFullPrice ? serverAdjustment : product.price + serverAdjustment;
        if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
          strapi.log.warn(
            `Rejecting cart item with non-positive unitAmount=${unitAmount} for product ${item.productId} (preset=${schema?.preset}, fabricId=${(item.customization as any)?.fabricId ?? 'n/a'})`,
          );
          return ctx.badRequest('One or more items in your cart could not be priced. Please review your selections.');
        }
        const lineTotal = unitAmount * qty;
        subtotal += lineTotal;

        // Only accept raster previews. SVG would let an attacker stash <script> for any
        // downstream context that renders the data URL as HTML. 250KB cap is plenty for a
        // small product preview thumbnail.
        const previewImage =
          typeof item.previewImage === 'string' &&
          (item.previewImage.startsWith('data:image/png;base64,') ||
            item.previewImage.startsWith('data:image/jpeg;base64,') ||
            item.previewImage.startsWith('data:image/webp;base64,')) &&
          item.previewImage.length < 250_000
            ? item.previewImage
            : undefined;

        orderLines.push({
          productId: item.productId,
          name: product.name,
          basePrice: product.price,
          totalPrice: unitAmount,
          quantity: qty,
          customization: item.customization || {},
          previewImage,
        });
      }

      const productionData = buildProductionDataForOrder(
        orderLines.map((l) => ({
          name: l.name,
          quantity: l.quantity,
          customization: l.customization,
        }))
      );

      let discountAmount = 0;
      let appliedPromoCode: string | null = null;

      if (promoCode && typeof promoCode === 'string') {
        const promo = await strapi.documents('api::promo-code.promo-code').findMany({
          filters: {
            code: promoCode.toUpperCase(),
            active: true,
          },
        });

        if (promo.length > 0) {
          const p = promo[0];
          const now = new Date();
          const expired = p.expiresAt && new Date(p.expiresAt) < now;
          const maxedOut = p.maxUses && p.maxUses > 0 && p.usedCount >= p.maxUses;
          const minNotMet = p.minOrderAmount && p.minOrderAmount > 0 && subtotal < p.minOrderAmount;

          if (!expired && !maxedOut && !minNotMet) {
            discountAmount = Math.floor(subtotal * p.percentageDiscount / 100);
            appliedPromoCode = p.code;
          }
        }
      }

      // Free-shipping threshold is evaluated on the discounted subtotal so 100% promos
      // don't yield free items + free shipping, and near-threshold orders with a promo
      // don't sneak under the bar.
      const shippingCost = getShippingRate(shippingCountry.toUpperCase(), subtotal - discountAmount);

      const totalAmount = Math.max(0, subtotal - discountAmount + shippingCost);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency,
        payment_method_types: ['card', 'paypal'],
        shipping: {
          name: `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim(),
          address: {
            line1: shippingAddress.street || '',
            city: shippingAddress.city || '',
            postal_code: shippingAddress.postalCode || '',
            country: (shippingAddress.country || shippingCountry).toUpperCase(),
          },
        },
        metadata: {
          customerEmail,
          shippingCountry: shippingCountry.toUpperCase(),
          shippingCost: String(shippingCost),
          promoCode: appliedPromoCode || '',
          discountAmount: String(discountAmount),
        },
      });

      const orderSummary = orderLines.map((l) => `${l.name} (x${l.quantity})`).join(', ');

      const order = await strapi.documents('api::order.order').create({
        data: {
          stripeSessionId: paymentIntent.id,
          customerEmail,
          customerName: `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim(),
          totalAmount,
          currency,
          status: 'pending',
          items: orderLines,
          orderSummary,
          shippingAddress: {
            firstName: shippingAddress.firstName || '',
            lastName: shippingAddress.lastName || '',
            street: shippingAddress.street || '',
            city: shippingAddress.city || '',
            postalCode: shippingAddress.postalCode || '',
            country: (shippingAddress.country || shippingCountry).toUpperCase(),
          },
          promoCode: appliedPromoCode,
          discountAmount,
          productionData,
          productionToken: randomUUID(),
        },
      });

      ctx.send({
        clientSecret: paymentIntent.client_secret,
        orderId: order.documentId,
        subtotal,
        shippingCost,
        discountAmount,
        promoCode: appliedPromoCode,
        totalAmount,
        currency,
      });
    } catch (err: any) {
      strapi.log.error('PaymentIntent creation failed:', err);
      ctx.internalServerError('Failed to initiate payment');
    }
  },

  async validatePromoCode(ctx: any) {
    const { code } = ctx.request.body;

    if (!code || typeof code !== 'string') {
      return ctx.badRequest('code is required');
    }

    try {
      const promo = await strapi.documents('api::promo-code.promo-code').findMany({
        filters: {
          code: code.toUpperCase(),
          active: true,
        },
      });

      if (promo.length === 0) {
        return ctx.send({ valid: false, error: 'Invalid promo code' });
      }

      const p = promo[0];
      const now = new Date();

      if (p.expiresAt && new Date(p.expiresAt) < now) {
        return ctx.send({ valid: false, error: 'This promo code has expired' });
      }

      if (p.maxUses && p.maxUses > 0 && p.usedCount >= p.maxUses) {
        return ctx.send({ valid: false, error: 'This promo code has reached its usage limit' });
      }

      ctx.send({
        valid: true,
        code: p.code,
        label: p.label || `${p.percentageDiscount}% off`,
        percentageDiscount: p.percentageDiscount,
        minOrderAmount: p.minOrderAmount || 0,
      });
    } catch (err: any) {
      strapi.log.error('Promo code validation failed:', err);
      ctx.internalServerError('Failed to validate promo code');
    }
  },

  async refund(ctx: any) {
    const { documentId } = ctx.params;
    const reason = ctx.request.body?.reason as string | undefined;

    if (!stripe) return ctx.internalServerError('Stripe is not configured');

    const order = await strapi.documents('api::order.order').findOne({ documentId });
    if (!order) return ctx.notFound('Order not found');
    if (!order.stripeSessionId) {
      return ctx.badRequest('Order has no Stripe payment intent');
    }
    if (order.status === 'refunded') {
      return ctx.badRequest('Order is already refunded');
    }

    try {
      const refund = await stripe.refunds.create({
        payment_intent: order.stripeSessionId,
        reason: reason === 'requested_by_customer' || reason === 'duplicate' || reason === 'fraudulent' ? reason : undefined,
      });

      await strapi.documents('api::order.order').update({ documentId: documentId, 
        data: { status: 'refunded' },
      });

      return { refundId: refund.id, status: refund.status, orderId: documentId };
    } catch (err: any) {
      strapi.log.error('Refund failed:', err);
      return ctx.internalServerError(err.message || 'Refund failed');
    }
  },

  async cancel(ctx: any) {
    const { documentId } = ctx.params;
    const email = String(ctx.request.body?.email || '').trim().toLowerCase();

    if (!email) return ctx.badRequest('email is required');

    const order = await strapi.documents('api::order.order').findOne({ documentId });
    if (!order || String(order.customerEmail || '').toLowerCase() !== email) {
      return ctx.notFound('Order not found');
    }

    const cancelable = order.status === 'pending' || order.status === 'paid';
    if (!cancelable) {
      return ctx.badRequest(
        'Bestellung kann nicht mehr storniert werden — die Produktion hat bereits begonnen.'
      );
    }

    if (order.status === 'paid' && stripe && order.stripeSessionId) {
      try {
        await stripe.refunds.create({
          payment_intent: order.stripeSessionId,
          reason: 'requested_by_customer',
        });
      } catch (err: any) {
        strapi.log.error('Customer cancel refund failed:', err);
        return ctx.internalServerError('Erstattung fehlgeschlagen — bitte kontaktieren Sie uns.');
      }
    }

    await strapi.documents('api::order.order').update({ documentId: documentId, 
      data: { status: 'cancelled' },
    });

    return { orderId: documentId, status: 'cancelled' };
  },

  async updateAddress(ctx: any) {
    const { documentId } = ctx.params;
    const body = (ctx.request.body || {}) as Record<string, string>;
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) return ctx.badRequest('email is required');

    const order = await strapi.documents('api::order.order').findOne({ documentId });
    if (!order || String(order.customerEmail || '').toLowerCase() !== email) {
      return ctx.notFound('Order not found');
    }

    const editable = order.status === 'paid' || order.status === 'processing';
    if (!editable) {
      return ctx.badRequest('Adresse kann in diesem Status nicht mehr geändert werden.');
    }

    const fields = ['firstName', 'lastName', 'street', 'city', 'postalCode', 'country'] as const;
    const current = (order.shippingAddress as Record<string, string>) || {};
    const next: Record<string, string> = { ...current };
    for (const f of fields) {
      if (typeof body[f] === 'string' && body[f].trim().length > 0) {
        next[f] = body[f].trim().slice(0, 200);
      }
    }
    for (const required of ['firstName', 'lastName', 'street', 'city', 'postalCode'] as const) {
      if (!next[required]) {
        return ctx.badRequest(`Pflichtfeld fehlt: ${required}`);
      }
    }

    await strapi.documents('api::order.order').update({ documentId: documentId, 
      data: { shippingAddress: next },
    });

    return { orderId: documentId, shippingAddress: next };
  },

  async generateInvoice(ctx: any) {
    const { documentId } = ctx.params;
    const email = String(ctx.query?.email || '').trim().toLowerCase();
    if (!email) return ctx.badRequest('email is required');

    const order = await strapi.documents('api::order.order').findOne({
      documentId,
    });
    if (!order || String(order.customerEmail || '').toLowerCase() !== email) {
      return ctx.notFound('Order not found');
    }
    if (!order.invoiceNumber) {
      return ctx.badRequest('Rechnung ist noch nicht verfügbar');
    }

    const items = ((order.items as any[]) || []).map((it: any) => ({
      name: it.name,
      quantity: it.quantity,
      totalPrice: it.totalPrice,
    }));

    const pdf = await generateInvoicePdf({
      documentId: order.documentId,
      invoiceNumber: order.invoiceNumber,
      invoicedAt: order.invoicedAt || order.createdAt,
      createdAt: order.createdAt,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      totalAmount: order.totalAmount || 0,
      currency: order.currency || 'eur',
      promoCode: order.promoCode,
      discountAmount: order.discountAmount || 0,
      shippingAddress: order.shippingAddress as Record<string, string> | null,
      items,
    });

    ctx.set('Content-Type', 'application/pdf');
    ctx.set('Content-Disposition', `attachment; filename="rechnung-${order.invoiceNumber}.pdf"`);
    ctx.body = pdf;
  },

  async exportCsv(ctx: any) {
    const from = ctx.query?.from ? new Date(String(ctx.query.from)) : null;
    const to = ctx.query?.to ? new Date(String(ctx.query.to)) : null;
    const status = ctx.query?.status ? String(ctx.query.status) : null;

    const filters: Record<string, unknown> = {};
    if (status) filters.status = status;
    if (from || to) {
      filters.createdAt = {
        ...(from && !isNaN(from.getTime()) ? { $gte: from.toISOString() } : {}),
        ...(to && !isNaN(to.getTime()) ? { $lte: to.toISOString() } : {}),
      };
    }

    const orders = await strapi.documents('api::order.order').findMany({
      filters,
      sort: ['createdAt:desc'],
      pagination: { pageSize: 1000 },
    });

    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const headers = [
      'orderId',
      'createdAt',
      'status',
      'customerEmail',
      'customerName',
      'totalAmount',
      'currency',
      'discountAmount',
      'promoCode',
      'itemCount',
      'items',
      'street',
      'city',
      'postalCode',
      'country',
      'trackingCarrier',
      'trackingNumber',
      'stripeSessionId',
    ];

    const lines: string[] = [headers.join(',')];

    for (const o of orders) {
      const items = (o.items as Array<{ name: string; quantity: number }>) || [];
      const itemCount = items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
      const itemSummary = items.map((it) => `${it.quantity}x ${it.name}`).join(' | ');
      const a = (o.shippingAddress as Record<string, string> | null) || {};
      lines.push(
        [
          o.documentId,
          o.createdAt,
          o.status,
          o.customerEmail,
          o.customerName,
          o.totalAmount,
          o.currency,
          o.discountAmount,
          o.promoCode,
          itemCount,
          itemSummary,
          a.street,
          a.city,
          a.postalCode,
          a.country,
          o.trackingCarrier,
          o.trackingNumber,
          o.stripeSessionId,
        ]
          .map(escape)
          .join(',')
      );
    }

    const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
    ctx.body = '﻿' + lines.join('\n');
  },

  async lookup(ctx: any) {
    const id = String(ctx.query?.id || '').trim();
    const email = String(ctx.query?.email || '').trim().toLowerCase();

    if (!id || !email) {
      return ctx.badRequest('id and email are required');
    }

    const order = await strapi.documents('api::order.order').findOne({
      documentId: id,
    });

    if (!order || String(order.customerEmail || '').toLowerCase() !== email) {
      // Same response either way to avoid order-id enumeration
      return ctx.notFound('Order not found');
    }

    return {
      orderId: order.documentId,
      status: order.status,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      currency: order.currency,
      items: ((order.items as any[]) || []).map((it: any) => ({
        name: it.name,
        quantity: it.quantity,
        totalPrice: it.totalPrice,
      })),
      shippingAddress: order.shippingAddress,
      trackingNumber: order.trackingNumber || null,
      trackingCarrier: order.trackingCarrier || null,
      invoiceNumber: order.invoiceNumber || null,
    };
  },

  async handleStripeWebhook(ctx: any) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      return ctx.internalServerError('Stripe webhook is not configured');
    }

    const sig = ctx.request.headers['stripe-signature'];

    if (!sig) {
      return ctx.badRequest('Missing stripe-signature header');
    }

    try {
      const rawBody = ctx.request.body[Symbol.for('unparsedBody')] || ctx.request.rawBody;

      if (!rawBody) {
        return ctx.internalServerError('Raw body not available for webhook signature verification');
      }
      const event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        webhookSecret
      );

      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;

        const orders = await strapi.documents('api::order.order').findMany({
          filters: { stripeSessionId: pi.id },
        });

        if (orders.length > 0) {
          const order = orders[0];
          const shippingData = pi.shipping || {};
          const now = new Date();
          let invoiceNumber = (order as any).invoiceNumber as string | undefined;
          if (!invoiceNumber) {
            try {
              invoiceNumber = await strapi
                .service('api::invoice-counter.invoice-counter')
                .nextInvoiceNumber(now.getFullYear());
            } catch (e: any) {
              strapi.log.error(`Failed to mint gapless invoice number: ${e.message}`);
              // Fail the webhook so Stripe retries — never ship without a valid invoice number.
              return ctx.internalServerError('Invoice number minting failed');
            }
          }
          // Preserve the original flat-shape shippingAddress collected at checkout (used by
          // invoice/CSV exports). If it's missing, fall back to Stripe's structured shape.
          const existingAddress = (order.shippingAddress as Record<string, unknown> | null) || null;
          const hasFlatAddress =
            !!existingAddress && (existingAddress.street || existingAddress.postalCode || existingAddress.city);
          const updateData: Record<string, unknown> = {
            status: 'paid',
            customerName: order.customerName || shippingData.name || '',
            invoiceNumber,
            invoicedAt: now.toISOString(),
          };
          if (!hasFlatAddress && shippingData.address) {
            const a = shippingData.address as unknown as Record<string, string | null | undefined>;
            const [firstName = '', ...rest] = String(shippingData.name || '').split(' ');
            updateData.shippingAddress = {
              firstName,
              lastName: rest.join(' '),
              street: [a.line1, a.line2].filter(Boolean).join(' '),
              city: a.city || '',
              postalCode: a.postal_code || '',
              country: a.country || '',
            };
          }
          await strapi.documents('api::order.order').update({ documentId: order.documentId, 
            data: updateData,
          });

          strapi.log.info(`Order ${order.documentId} marked as paid`);

          const items = (order.items as Array<{ productId: string; quantity: number }>) || [];
          const qtyByProduct = new Map<string, number>();
          for (const it of items) {
            qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) || 0) + it.quantity);
          }
          if (qtyByProduct.size) {
            try {
              const knex = strapi.db.connection;
              // Atomic decrement: only decrement rows that still have enough inventory.
              // Rows with NULL inventory are treated as unlimited and skipped.
              // If a decrement fails (insufficient stock at webhook time), the order is
              // already paid — we log and flag for manual review rather than charge a
              // customer for something we can't ship.
              await Promise.all(
                [...qtyByProduct.entries()].map(async ([productId, qty]) => {
                  const updated = await knex('products')
                    .where({ document_id: productId })
                    .whereNotNull('inventory')
                    .andWhere('inventory', '>=', qty)
                    .decrement('inventory', qty);
                  if (!updated) {
                    // Either inventory is NULL (unlimited — fine) or insufficient (bad).
                    const row = await knex('products').where({ document_id: productId }).first();
                    if (row && row.inventory != null && row.inventory < qty) {
                      strapi.log.error(
                        `INVENTORY_SHORTFALL order=${order.documentId} product=${productId} need=${qty} have=${row.inventory}`,
                      );
                    }
                  }
                }),
              );
            } catch (e: any) {
              strapi.log.warn(`Failed to decrement inventory batch: ${e.message}`);
            }
          }

          if (order.customerEmail) {
            try {
              await sendOrderConfirmationEmail(order.customerEmail, {
                orderId: order.documentId,
                customerName: shippingData.name || order.customerName || '',
                totalAmount: order.totalAmount || 0,
                currency: order.currency || 'eur',
                items: ((order.items as any[]) || []).map((it: any) => ({
                  name: it.name,
                  quantity: it.quantity,
                  totalPrice: it.totalPrice || 0,
                })),
                shippingAddress: (order.shippingAddress as any) || null,
              });
            } catch (e: any) {
              strapi.log.warn(`Failed to send order confirmation: ${e.message}`);
            }
          }

          if (order.promoCode) {
            // Atomic increment: only succeed if we're still under maxUses. Prevents two
            // concurrent webhook handlers from both crossing the limit.
            try {
              const knex = strapi.db.connection;
              const updated = await knex('promo_codes')
                .where({ code: order.promoCode })
                .andWhere((qb: any) =>
                  qb.whereNull('max_uses').orWhereRaw('used_count < max_uses'),
                )
                .increment('used_count', 1);
              if (!updated) {
                strapi.log.warn(`Promo ${order.promoCode}: not incremented (maxUses reached or missing)`);
              }
            } catch (e: any) {
              strapi.log.warn(`Failed to increment promo usedCount: ${e.message}`);
            }
          }
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object;
        const orders = await strapi.documents('api::order.order').findMany({
          filters: { stripeSessionId: pi.id },
        });
        if (orders.length > 0) {
          await strapi.documents('api::order.order').update({ documentId: orders[0].documentId, 
            data: { status: 'failed' },
          });
        }
      } else if (event.type === 'charge.refunded') {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent as string;
        if (paymentIntentId) {
          const orders = await strapi.documents('api::order.order').findMany({
            filters: { stripeSessionId: paymentIntentId },
          });
          if (orders.length > 0) {
            await strapi.documents('api::order.order').update({ documentId: orders[0].documentId, 
              data: { status: 'refunded' },
            });
          }
        }
      }

      ctx.send({ received: true });
    } catch (err: any) {
      strapi.log.error('Webhook signature verification failed:', err);
      ctx.status = 400;
      ctx.send({ error: 'Webhook Error' });
    }
  },

  async generateProductionPdf(ctx: any) {
    const { documentId } = ctx.params;
    const queryToken = ctx.query?.token;

    try {
      const order = await strapi.documents('api::order.order').findOne({
        documentId,
        // include private fields
        populate: '*',
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      const orderToken = (order as any).productionToken;
      if (!orderToken || !queryToken || queryToken !== orderToken) {
        return ctx.unauthorized('Invalid or missing production token');
      }

      const orderLines =
        (order.items as Array<{
          name: string;
          quantity: number;
          totalPrice: number;
          customization?: Record<string, unknown>;
          previewImage?: string;
        }>) || [];

      const stored = order.productionData as
        | { items: any[]; hasFurniture: boolean }
        | null
        | undefined;

      const production =
        stored && stored.items && stored.items.length > 0
          ? stored
          : buildProductionDataForOrder(
              orderLines.map((l) => ({
                name: l.name,
                quantity: l.quantity,
                customization: l.customization,
              }))
            );

      if (!production.items.length) {
        return ctx.badRequest('This order has no producible items');
      }

      const pdf = await generateProductionPdf(
        {
          documentId: order.documentId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          totalAmount: order.totalAmount,
          currency: order.currency,
          shippingAddress: order.shippingAddress as Record<string, unknown> | null,
          items: orderLines,
          createdAt: order.createdAt,
        },
        production.items
      );

      ctx.set('Content-Type', 'application/pdf');
      ctx.set(
        'Content-Disposition',
        `attachment; filename="production-${documentId.slice(-12)}.pdf"`,
      );
      // Token rides in the URL — prevent it leaking via Referer to anything downstream.
      ctx.set('Referrer-Policy', 'no-referrer');
      ctx.set('Cache-Control', 'no-store, private');
      ctx.body = pdf;

      // Rotate the token after a successful download so the link is single-use. If the
      // operator needs to re-download, they re-issue from the admin order detail page.
      try {
        await strapi.documents('api::order.order').update({ documentId: documentId, 
          data: { productionToken: randomUUID() },
        });
      } catch (e: any) {
        strapi.log.warn(`Failed to rotate productionToken for ${documentId}: ${e.message}`);
      }
    } catch (err: any) {
      strapi.log.error('Production PDF generation failed:', err);
      ctx.internalServerError('Failed to generate production PDF');
    }
  },

  async updateTracking(ctx: any) {
    const { documentId } = ctx.params;
    const { trackingNumber, trackingCarrier } = ctx.request.body;

    if (!trackingNumber || typeof trackingNumber !== 'string') {
      return ctx.badRequest('trackingNumber is required');
    }

    try {
      const order = await strapi.documents('api::order.order').findOne({
        documentId,
      });

      if (!order) {
        return ctx.notFound('Order not found');
      }

      if (order.status !== 'paid' && order.status !== 'processing') {
        return ctx.badRequest('Order must be in paid or processing status to add tracking');
      }

      await strapi.documents('api::order.order').update({ documentId: documentId, 
        data: {
          status: 'shipped',
          trackingNumber: trackingNumber.trim(),
          trackingCarrier: (trackingCarrier || '').trim(),
        },
      });

      strapi.log.info(`Order ${documentId} marked as shipped with tracking ${trackingNumber}`);

      try {
        await sendShippingConfirmationEmail(order.customerEmail, {
          orderId: documentId.slice(-12).toUpperCase(),
          customerName: order.customerName || '',
          trackingNumber: trackingNumber.trim(),
          trackingCarrier: trackingCarrier?.trim() || undefined,
          items: (order.items as Array<{ name: string; quantity: number }>) || [],
          shippingAddress: order.shippingAddress as any,
        });
        strapi.log.info(`Shipping confirmation email sent to ${order.customerEmail}`);
      } catch (emailErr: any) {
        strapi.log.warn(`Failed to send shipping email for order ${documentId}: ${emailErr.message}`);
      }

      const updated = await strapi.documents('api::order.order').findOne({
        documentId,
      });

      ctx.send({ data: updated });
    } catch (err: any) {
      strapi.log.error('Update tracking failed:', err);
      ctx.internalServerError('Failed to update tracking');
    }
  },

  async createDhlLabel(ctx: any) {
    if (!isDhlConfigured()) {
      return ctx.internalServerError('DHL shipping is not configured');
    }

    const { documentId } = ctx.params;
    const body = ctx.request.body || {};
    const weightKg = Number(body.weightKg) || undefined;
    const lengthCm = Number(body.lengthCm) || undefined;
    const widthCm = Number(body.widthCm) || undefined;
    const heightCm = Number(body.heightCm) || undefined;

    try {
      const order = await strapi.documents('api::order.order').findOne({
        documentId,
      });

      if (!order) return ctx.notFound('Order not found');

      if (order.status !== 'paid' && order.status !== 'processing') {
        return ctx.badRequest('Order must be paid or processing to create a DHL label');
      }

      const addr = (order.shippingAddress as Record<string, string>) || {};
      const nameParts = `${addr.firstName || ''} ${addr.lastName || ''}`.trim() || order.customerName || '';
      const [firstName, ...rest] = nameParts.split(' ');

      const result = await createDhlLabel({
        consignee: {
          firstName: firstName || '',
          lastName: rest.join(' ') || '',
          street: addr.street || '',
          postalCode: addr.postalCode || '',
          city: addr.city || '',
          country: addr.country || 'DE',
          email: order.customerEmail || undefined,
        },
        shipmentDetails: {
          weightKg,
          lengthCm,
          widthCm,
          heightCm,
        },
      });

      await strapi.documents('api::order.order').update({ documentId: documentId, 
        data: {
          trackingNumber: result.trackingNumber,
          trackingCarrier: 'DHL',
          dhlShipmentId: result.shipmentNumber,
        },
      });

      const labelBuffer = Buffer.from(result.labelB64, 'base64');

      ctx.set('Content-Type', 'application/pdf');
      ctx.set('Content-Disposition', `attachment; filename="dhl-label-${documentId.slice(-12)}.pdf"`);
      ctx.body = labelBuffer;

      strapi.log.info(`DHL label created for order ${documentId}: ${result.trackingNumber}`);
    } catch (err: any) {
      strapi.log.error('DHL label creation failed:', err);
      ctx.internalServerError(err.message || 'Failed to create DHL label');
    }
  },
}));
