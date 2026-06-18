import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq } from 'drizzle-orm';

import { purchaseLineTable } from '../schema/purchase-line.js';
import type { PurchaseLineRow, NewPurchaseLineRow } from '../schema/purchase-line.js';

export class PurchaseLineRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<PurchaseLineRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(purchaseLineTable));
  }

  /** Líneas de una compra. */
  async listByPurchase({ purchaseId }: { purchaseId: string }): Promise<PurchaseLineRow[]> {
    return this.db.ormQuery((tx) =>
      tx.select().from(purchaseLineTable).where(eq(purchaseLineTable.purchase_id, purchaseId))
    );
  }

  async getById({ id }: { id: string }): Promise<PurchaseLineRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(purchaseLineTable).where(eq(purchaseLineTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewPurchaseLineRow }): Promise<PurchaseLineRow[]> {
    return this.db.ormQuery((tx) => tx.insert(purchaseLineTable).values(data).returning());
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<NewPurchaseLineRow>;
  }): Promise<PurchaseLineRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(purchaseLineTable).set(data).where(eq(purchaseLineTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) =>
      tx.delete(purchaseLineTable).where(eq(purchaseLineTable.id, id))
    );
  }
}
