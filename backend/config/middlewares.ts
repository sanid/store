import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      origins: (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'))
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      includeUnparsed: true,
      jsonLimit: '10mb',
      formLimit: '10mb',
      textLimit: '10mb',
    },
  },
  {
    name: 'global::rateLimit',
    config: {
      windowMs: 60_000,
      max: 10,
      paths: '^/api/orders/(create-payment-intent|validate-promo)',
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
