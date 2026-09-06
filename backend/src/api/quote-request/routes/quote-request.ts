import { factories } from '@strapi/strapi';

// Lesen/Aendern laeuft ueber das Admin-Panel (Content Manager), nicht ueber die
// oeffentliche API. Nur die Aktionen in quote-request-actions.ts sind erreichbar.
export default factories.createCoreRouter('api::quote-request.quote-request', {
  only: [],
});
