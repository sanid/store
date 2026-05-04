export default {
  register() {},

  async bootstrap({ strapi }: { strapi: any }) {
    const CONFIGURATOR_SLUG = 'custom-furniture-piece';
    const CONFIGURATOR_SKU = 'CONFIG-FURNITURE-PIECE';

    const SCHEMA = {
      preset: 'furniture',
      pricingBase: 5000,
      pricingRules: [
        { field: 'width', type: 'linear', rate: 50 },
        { field: 'height', type: 'linear', rate: 40 },
        { field: 'depth', type: 'linear', rate: 60 },
      ],
      fields: [
        { id: 'type', type: 'select', label: 'Furniture Type', required: true, options: [
          { value: 'sideboard', label: 'Sideboard' },
          { value: 'shelf', label: 'Shelf Unit' },
          { value: 'cabinet', label: 'Cabinet' },
          { value: 'desk', label: 'Desk' },
          { value: 'tvboard', label: 'TV Board' },
        ]},
        { id: 'width', type: 'number', label: 'Width (cm)', required: true, min: 30, max: 300, step: 1, default: 120 },
        { id: 'height', type: 'number', label: 'Height (cm)', required: true, min: 30, max: 250, step: 1, default: 80 },
        { id: 'depth', type: 'number', label: 'Depth (cm)', required: true, min: 20, max: 80, step: 1, default: 40 },
        { id: 'color', type: 'color', label: 'Body Color', required: true, options: [
          { value: '#FFFFFF', label: 'White' },
          { value: '#000000', label: 'Black' },
          { value: '#D2B48C', label: 'Natural' },
          { value: '#8B7355', label: 'Oak' },
          { value: '#4A4A4A', label: 'Anthracite' },
          { value: '#2F4F4F', label: 'Dark Slate' },
          { value: '#6B8E23', label: 'Olive' },
          { value: '#A0522D', label: 'Sienna' },
        ]},
        { id: 'material', type: 'select', label: 'Material', required: true, options: [
          { value: 'mdf', label: 'MDF', priceModifier: 0 },
          { value: 'plywood', label: 'Plywood', priceModifier: 3000 },
          { value: 'oak', label: 'Solid Oak', priceModifier: 12000 },
          { value: 'walnut', label: 'Solid Walnut', priceModifier: 18000 },
        ]},
        { id: 'shelves', type: 'number', label: 'Number of Shelves', min: 0, max: 10, step: 1, default: 2, pricePerUnit: 800 },
        { id: 'doors', type: 'select', label: 'Doors', options: [
          { value: 'none', label: 'None (Open)', priceModifier: 0 },
          { value: '1', label: '1 Door', priceModifier: 2500 },
          { value: '2', label: '2 Doors', priceModifier: 4500 },
          { value: '3', label: '3 Doors', priceModifier: 6500 },
          { value: '4', label: '4 Doors', priceModifier: 8500 },
        ]},
        { id: 'legs', type: 'select', label: 'Legs', options: [
          { value: 'wall', label: 'Wall-mounted', priceModifier: 0 },
          { value: 'standard', label: 'Standard', priceModifier: 800 },
          { value: 'hairpin', label: 'Metal Hairpin', priceModifier: 2000 },
          { value: 'tapered', label: 'Tapered Wood', priceModifier: 1800 },
        ]},
        { id: 'backPanel', type: 'select', label: 'Back Panel', options: [
          { value: 'open', label: 'Open', priceModifier: 0 },
          { value: 'closed', label: 'Closed', priceModifier: 1500 },
          { value: 'matching', label: 'Matching Color', priceModifier: 2000 },
        ]},
      ],
    };

    const existing = await strapi.documents('api::product.product').findMany({
      filters: { slug: CONFIGURATOR_SLUG },
    });

    if (existing.length > 0) {
      const doc = existing[0];
      const schema = doc.customizationSchema as { preset?: string } | null;
      if (schema?.preset !== 'furniture') {
        await strapi.documents('api::product.product').update(doc.documentId, {
          data: {
            featured: true,
            status: 'published',
            customizationSchema: SCHEMA,
          },
        });
        try {
          await strapi.documents('api::product.product').publish(doc.documentId);
        } catch {}
        strapi.log.info(`[seed] Updated configurator product schema (documentId: ${doc.documentId})`);
      } else {
        strapi.log.info(`[seed] Configurator product up to date (documentId: ${doc.documentId})`);
      }
      return;
    }

    const product = await strapi.documents('api::product.product').create({
      data: {
        name: 'Custom Furniture Piece',
        slug: CONFIGURATOR_SLUG,
        description: '<p>A fully configurable furniture piece. Customize dimensions, materials, colors, and more.</p>',
        shortDescription: 'Design your own furniture — fully configurable.',
        price: 0,
        sku: CONFIGURATOR_SKU,
        inventory: 99999,
        featured: true,
        status: 'published',
        customizationSchema: SCHEMA,
      },
    });

    await strapi.documents('api::product.product').publish(product.documentId);

    strapi.log.info(`[seed] Created configurator product (documentId: ${product.documentId})`);
  },
};
