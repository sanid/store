import type { Core } from '@strapi/strapi';

const corsOrigins = (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS must be set in production (comma-separated list of allowed origins).');
}

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      origins: corsOrigins,
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
      // Cover all unauthenticated order endpoints. Without this, lookup/cancel/address/invoice
      // can be brute-forced for the email field given a leaked documentId.
      paths:
        '^/api/orders/(create-payment-intent|validate-promo|lookup|[^/]+/(cancel|address|invoice|production-pdf))',
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
