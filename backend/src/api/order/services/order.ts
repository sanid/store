import { factories } from '@strapi/strapi';

function buildOrderSummary(items: Array<{ name: string; quantity: number }>): string {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items.map((item) => `${item.name} (x${item.quantity})`).join(', ');
}

export default factories.createCoreService('api::order.order', ({ strapi }: { strapi: any }) => ({
  async create(params: any) {
    const result = await super.create(params);
    if (result?.items && !result.orderSummary) {
      const summary = buildOrderSummary(result.items);
      if (summary) {
        await strapi.documents('api::order.order').update(result.documentId, {
          data: { orderSummary: summary },
        });
        result.orderSummary = summary;
      }
    }
    return result;
  },

  async update(documentId: string, params: any) {
    const result = await super.update(documentId, params);
    if (result?.items && !result.orderSummary) {
      const summary = buildOrderSummary(result.items);
      if (summary) {
        await strapi.documents('api::order.order').update(result.documentId, {
          data: { orderSummary: summary },
        });
        result.orderSummary = summary;
      }
    }
    return result;
  },
}));
