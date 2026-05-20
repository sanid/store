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
      path: '/orders/:documentId/refund',
      handler: 'order.refund',
    },
    {
      method: 'POST',
      path: '/orders/:documentId/cancel',
      handler: 'order.cancel',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/orders/:documentId/address',
      handler: 'order.updateAddress',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/orders/export',
      handler: 'order.exportCsv',
    },
    {
      method: 'GET',
      path: '/orders/lookup',
      handler: 'order.lookup',
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
      path: '/orders/:documentId/invoice',
      handler: 'order.generateInvoice',
      config: {
        auth: false,
      },
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
