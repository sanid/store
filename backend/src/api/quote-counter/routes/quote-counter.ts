import { factories } from '@strapi/strapi';

// Intern: keine oeffentlichen Routen. Nummern werden ueber den Service vergeben.
export default factories.createCoreRouter('api::quote-counter.quote-counter', {
  only: [],
});
