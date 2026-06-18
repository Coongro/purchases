import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const purchaseTable = pgTable('module_purchases_purchases', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  supplier_id: uuid('supplier_id'),
  // Fecha de negocio de la compra (ISO/UTC). Default now() si no se pasa.
  purchase_date: timestamp('purchase_date', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  // 'efectivo' | 'transferencia' | 'cuenta_corriente'. Text libre (config de negocio).
  payment_method: text('payment_method').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type PurchaseRow = typeof purchaseTable.$inferSelect;
export type NewPurchaseRow = typeof purchaseTable.$inferInsert;
