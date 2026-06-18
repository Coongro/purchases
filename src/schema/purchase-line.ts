import { sql } from 'drizzle-orm';
import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const purchaseLineTable = pgTable('module_purchases_purchase_lines', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  purchase_id: uuid('purchase_id').notNull(),
  // Producto del catálogo (products). Nullable: permite un ítem suelto descripto a mano.
  product_id: uuid('product_id'),
  description: text('description').notNull(),
  quantity: numeric('quantity').notNull(),
  unit_cost: numeric('unit_cost').notNull(),
  subtotal: numeric('subtotal').notNull(),
  created_at: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type PurchaseLineRow = typeof purchaseLineTable.$inferSelect;
export type NewPurchaseLineRow = typeof purchaseLineTable.$inferInsert;
