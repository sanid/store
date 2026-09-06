import { factories } from '@strapi/strapi';

export default factories.createCoreService(
  'api::quote-counter.quote-counter',
  ({ strapi }: any) => ({
    // Lueckenlose Angebotsnummer: sperrt die Jahreszeile, inkrementiert, liefert "AN-YYYY-0000001".
    async nextOfferNumber(year: number): Promise<string> {
      const knex = strapi.db.connection;
      const tableName = 'quote_counters';

      const number: number = await knex.transaction(async (trx) => {
        const row = await trx(tableName).where({ year }).forUpdate().first();
        if (!row) {
          try {
            await trx(tableName).insert({
              year,
              last_number: 1,
              created_at: new Date(),
              updated_at: new Date(),
              published_at: new Date(),
            });
            return 1;
          } catch {
            const retry = await trx(tableName).where({ year }).forUpdate().first();
            const next = (retry?.last_number ?? 0) + 1;
            await trx(tableName)
              .where({ year })
              .update({ last_number: next, updated_at: new Date() });
            return next;
          }
        }
        const next = (row.last_number ?? 0) + 1;
        await trx(tableName).where({ year }).update({ last_number: next, updated_at: new Date() });
        return next;
      });

      return `AN-${year}-${String(number).padStart(7, '0')}`;
    },
  })
);
