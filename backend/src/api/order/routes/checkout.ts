import rateLimit from '../../middlewares/rateLimit';

export default {
  routes: [
    {
      method: 'POST',
      path: '/orders/create-payment-intent',
      handler: 'order.createPaymentIntent',
      config: {
        auth: false,
        middlewares: [rateLimit({ windowMs: 60 * 1000, max: 5 })],
      },
    },
    {
      method: 'POST',
      path: '/orders/validate-promo',
      handler: 'order.validatePromoCode',
      config: {
        auth: false,
        middlewares: [rateLimit({ windowMs: 60 * 1000, max: 10 })],
      },
    },
    {
      method: 'POST',
      path: '/orders/webhook',
      handler: 'order.handleStripeWebhook',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/orders/:documentId/tracking',
      handler: 'order.updateTracking',
    },
  ],
};
