export default {
  register() {},

  async bootstrap({ strapi }: { strapi: any }) {
    await seedFurniture(strapi);
    await seedCurtain(strapi);
    await ensureEmployeeRole(strapi);
  },
};

const EMPLOYEE_ACTIONS = [
  'api::ops.ops.me',
  'api::ops.ops.orders',
  'api::ops.ops.order',
  'api::ops.ops.orderStatus',
  'api::ops.ops.orderAddress',
  'api::ops.ops.orderCancel',
  'api::ops.ops.orderInvoice',
  'api::ops.ops.quotes',
  'api::ops.ops.quote',
  'api::order.order.refund',
  'api::order.order.updateTracking',
  'api::order.order.createDhlLabel',
  'api::order.order.exportCsv',
  'api::quote-request.quote-request.opsUpdate',
  'api::quote-request.quote-request.recalculate',
  'api::quote-request.quote-request.issueOffer',
];

async function ensureEmployeeRole(strapi: any) {
  try {
    let role = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'employee' },
    });
    if (!role) {
      role = await strapi.query('plugin::users-permissions.role').create({
        data: {
          name: 'Mitarbeiter',
          description: 'Interner Zugriff auf die Ops-Konsole (Bestellungen, Anfragen, Fulfillment)',
          type: 'employee',
        },
      });
      strapi.log.info('[seed] Employee role created (type: employee)');
    }

    const existing = await strapi.query('plugin::users-permissions.permission').findMany({
      where: { role: role.id },
    });
    const have = new Set(existing.map((p: any) => p.action));
    const missing = EMPLOYEE_ACTIONS.filter((action) => !have.has(action));
    for (const action of missing) {
      await strapi.query('plugin::users-permissions.permission').create({
        data: { action, role: role.id },
      });
    }
    if (missing.length > 0) {
      strapi.log.info(`[seed] Employee role: granted ${missing.length} ops permissions`);
    }
  } catch (err: any) {
    strapi.log.warn(`[seed] Could not ensure employee role: ${err.message}`);
  }
}

async function seedFurniture(strapi: any) {
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
        await strapi.documents('api::product.product').update({ documentId: doc.documentId, 
          data: {
            featured: true,
            status: 'published',
            customizationSchema: SCHEMA,
          },
        });
        try {
          await strapi.documents('api::product.product').publish({ documentId: doc.documentId });
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

    await strapi.documents('api::product.product').publish({ documentId: product.documentId });

    strapi.log.info(`[seed] Created configurator product (documentId: ${product.documentId})`);
}

async function seedCurtain(strapi: any) {
  const SLUG = 'curtain-custom';
  const SKU = 'CONFIG-CURTAIN';

  const SCHEMA = {
    preset: 'curtain',
    fields: [
      { id: 'fabricId', type: 'string', label: 'Fabric', required: true },
      { id: 'side', type: 'select', label: 'Side', required: true, options: [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
        { value: 'both', label: 'Both' },
      ] },
      { id: 'width', type: 'number', label: 'Width (cm)', required: true, min: 30, max: 600, step: 1, default: 100 },
      { id: 'height', type: 'number', label: 'Height (cm)', required: true, min: 30, max: 400, step: 1, default: 100 },
      { id: 'header', type: 'select', label: 'Header', required: true, options: [
        { value: 'wave', label: 'Wave' },
        { value: 'flemish', label: 'Flemish' },
        { value: 'triple-pinch', label: 'Triple Pinch' },
        { value: 'eyelet', label: 'Eyelet' },
        { value: 'single-pinch', label: 'Single Pinch' },
        { value: 'pencil', label: 'Pencil' },
      ] },
      { id: 'reserve', type: 'select', label: 'Fabric Reserve', options: [
        { value: 'none', label: 'None' },
        { value: 'low', label: 'Low' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'High' },
      ] },
      { id: 'lining', type: 'select', label: 'Lining', options: [
        { value: 'none', label: 'None' },
        { value: 'thermo', label: 'Thermo' },
        { value: 'acoustic', label: 'Acoustic' },
        { value: 'dimout', label: 'Dimout' },
        { value: 'blackout', label: 'Blackout' },
      ] },
      { id: 'accessory', type: 'select', label: 'Accessory', options: [
        { value: 'none', label: 'None' },
        { value: 'glider-4mm', label: 'Glider 4mm' },
        { value: 'glider-6mm', label: 'Glider 6mm' },
      ] },
      { id: 'name', type: 'string', label: 'Curtain Name' },
      { id: 'remark', type: 'string', label: 'Remark' },
    ],
  };

  const existing = await strapi.documents('api::product.product').findMany({
    filters: { slug: SLUG },
  });

  if (existing.length > 0) {
    const doc = existing[0];
    const schema = doc.customizationSchema as { preset?: string } | null;
    if (schema?.preset !== 'curtain') {
      await strapi.documents('api::product.product').update({ documentId: doc.documentId, 
        data: { featured: false, status: 'published', customizationSchema: SCHEMA },
      });
      try { await strapi.documents('api::product.product').publish({ documentId: doc.documentId }); } catch {}
      strapi.log.info(`[seed] Updated curtain product schema (documentId: ${doc.documentId})`);
    } else {
      strapi.log.info(`[seed] Curtain product up to date (documentId: ${doc.documentId})`);
    }
    return;
  }

  const product = await strapi.documents('api::product.product').create({
    data: {
      name: 'Custom Curtain',
      slug: SLUG,
      description: '<p>A made-to-measure curtain. Choose fabric, header, lining, and accessories.</p>',
      shortDescription: 'Vorhang nach Maß — Stoff, Faltenband, Futter frei wählbar.',
      price: 0,
      sku: SKU,
      inventory: 99999,
      featured: false,
      status: 'published',
      customizationSchema: SCHEMA,
    },
  });

  await strapi.documents('api::product.product').publish({ documentId: product.documentId });

  strapi.log.info(`[seed] Created curtain product (documentId: ${product.documentId})`);
}
