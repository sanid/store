export default {
  routes: [
    {
      method: 'POST',
      path: '/orders/create-payment-intent',
      handler: 'order.createPaymentIntent',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/orders/validate-promo',
      handler: 'order.validatePromoCode',
      config: {
        auth: false,
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
    {
      method: 'GET',
      path: '/orders/:documentId/production-pdf',
      handler: 'order.generateProductionPdf',
      config: {
        auth: false,
      },
    },
  ],
};
