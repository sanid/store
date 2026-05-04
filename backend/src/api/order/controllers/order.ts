import { factories } from '@strapi/strapi';
import Stripe from 'stripe';
import { sendShippingConfirmationEmail } from '../services/email';

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

function calculatePriceAdjustment(
  schema: { fields?: Array<{ id: string; type: string; options?: Array<{ value: string; priceModifier?: number }>; priceModifier?: Record<string, number> }> } | null,
  customization: Record<string, unknown> | null
): number {
  if (!schema?.fields || !customization) return 0;
  let adjustment = 0;
  for (const field of schema.fields) {
    const val = customization[field.id];
    if (val == null || val === '') continue;

    if (field.type === 'select' && field.options) {
      const selected = field.options.find((opt) => opt.value === String(val));
      if (selected && typeof selected.priceModifier === 'number' && selected.priceModifier > 0) {
        adjustment += selected.priceModifier;
      }
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
      }> = [];
      let subtotal = 0;

      for (const item of cartItems) {
        const product = await strapi.documents('api::product.product').findOne({
          documentId: item.productId,
          populate: { image: true },
        });

        if (!product) {
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
        const unitAmount = product.price + serverAdjustment;
        const lineTotal = unitAmount * qty;
        subtotal += lineTotal;

        orderLines.push({
          productId: item.productId,
          name: product.name,
          basePrice: product.price,
          totalPrice: unitAmount,
          quantity: qty,
          customization: item.customization || {},
        });
      }

      const shippingCost = getShippingRate(shippingCountry.toUpperCase(), subtotal);

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
          await strapi.documents('api::order.order').update(order.documentId, {
            data: {
              status: 'paid',
              customerName: shippingData.name || '',
              shippingAddress: {
                name: shippingData.name,
                address: shippingData.address,
              },
            },
          });

          strapi.log.info(`Order ${order.documentId} marked as paid`);

          for (const item of (order.items as Array<{ productId: string; quantity: number }>) || []) {
            try {
              const product = await strapi.documents('api::product.product').findOne({
                documentId: item.productId,
              });
              if (product && product.inventory != null) {
                const newInventory = Math.max(0, product.inventory - item.quantity);
                await strapi.documents('api::product.product').update(item.productId, {
                  data: { inventory: newInventory },
                });
              }
            } catch (e: any) {
              strapi.log.warn(`Failed to decrement inventory for product ${item.productId}: ${e.message}`);
            }
          }

          if (order.promoCode) {
            const promoCodes = await strapi.documents('api::promo-code.promo-code').findMany({
              filters: { code: order.promoCode },
            });
            if (promoCodes.length > 0) {
              await strapi.documents('api::promo-code.promo-code').update(promoCodes[0].documentId, {
                data: { usedCount: (promoCodes[0].usedCount || 0) + 1 },
              });
            }
          }
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object;
        const orders = await strapi.documents('api::order.order').findMany({
          filters: { stripeSessionId: pi.id },
        });
        if (orders.length > 0) {
          await strapi.documents('api::order.order').update(orders[0].documentId, {
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
            await strapi.documents('api::order.order').update(orders[0].documentId, {
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

      await strapi.documents('api::order.order').update(documentId, {
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
}));
