import { factories } from '@strapi/strapi';

// Internal-only: no public routes. Sequence is minted via the service in the order webhook.
export default factories.createCoreRouter('api::invoice-counter.invoice-counter', {
  only: [],
});
