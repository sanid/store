import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::invoice-counter.invoice-counter', ({ strapi }: any) => ({
  // Atomic gapless invoice number: locks the per-year row, increments, returns formatted "RE-YYYY-0000001".
  async nextInvoiceNumber(year: number): Promise<string> {
    const knex = strapi.db.connection;
    const tableName = 'invoice_counters';

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
          // race: another tx inserted the row; re-read with lock and increment
          const retry = await trx(tableName).where({ year }).forUpdate().first();
          const next = (retry?.last_number ?? 0) + 1;
          await trx(tableName).where({ year }).update({ last_number: next, updated_at: new Date() });
          return next;
        }
      }
      const next = (row.last_number ?? 0) + 1;
      await trx(tableName).where({ year }).update({ last_number: next, updated_at: new Date() });
      return next;
    });

    return `RE-${year}-${String(number).padStart(7, '0')}`;
  },
}));
