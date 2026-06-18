import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const supplierTable = pgTable('module_purchases_suppliers', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  contact: text('contact'),
  notes: text('notes'),
  is_active: boolean('is_active').notNull().default(true),
  deleted_at: timestamp('deleted_at', { mode: 'string' }),
  created_at: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type SupplierRow = typeof supplierTable.$inferSelect;
export type NewSupplierRow = typeof supplierTable.$inferInsert;
