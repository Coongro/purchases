import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq, sql } from 'drizzle-orm';

import { purchaseLineTable } from '../schema/purchase-line.js';
import { purchaseTable } from '../schema/purchase.js';
import type { PurchaseRow, NewPurchaseRow } from '../schema/purchase.js';
import { toIsoUtc } from '../utils/datetime.js';

/** Compra con el total derivado de la suma de sus líneas. */
export interface PurchaseWithTotal extends PurchaseRow {
  total: string;
}

export class PurchaseRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<PurchaseRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(purchaseTable));
  }

  /**
   * Compras con total (suma de subtotales de líneas) derivado por SQL, de la más reciente a
   * la más vieja. `purchase_date` normalizada a ISO-UTC para que el front la parsee bien.
   */
  async listWithTotals(): Promise<PurchaseWithTotal[]> {
    const purchases = (await this.db.ormQuery((tx) =>
      tx.select().from(purchaseTable)
    )) as PurchaseRow[];
    const lineTotals = (await this.db.ormQuery((tx) =>
      tx
        .select({
          purchase_id: purchaseLineTable.purchase_id,
          total: sql<string>`coalesce(sum(${purchaseLineTable.subtotal}::numeric), 0)::text`,
        })
        .from(purchaseLineTable)
        .groupBy(purchaseLineTable.purchase_id)
    )) as Array<{ purchase_id: string; total: string }>;
    const totalBy = new Map(lineTotals.map((t) => [t.purchase_id, t.total]));
    return purchases
      .map((p) => ({
        ...p,
        purchase_date: toIsoUtc(p.purchase_date),
        total: totalBy.get(p.id) ?? '0',
      }))
      .sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1));
  }

  async getById({ id }: { id: string }): Promise<PurchaseRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(purchaseTable).where(eq(purchaseTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewPurchaseRow }): Promise<PurchaseRow[]> {
    return this.db.ormQuery((tx) => tx.insert(purchaseTable).values(data).returning());
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<NewPurchaseRow>;
  }): Promise<PurchaseRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(purchaseTable).set(data).where(eq(purchaseTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) => tx.delete(purchaseTable).where(eq(purchaseTable.id, id)));
  }
}
