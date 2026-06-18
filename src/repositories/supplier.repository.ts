import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq, isNull } from 'drizzle-orm';

import { supplierTable } from '../schema/supplier.js';
import type { SupplierRow, NewSupplierRow } from '../schema/supplier.js';

export class SupplierRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<SupplierRow[]> {
    return this.db.ormQuery((tx) =>
      tx.select().from(supplierTable).where(isNull(supplierTable.deleted_at))
    );
  }

  async getById({ id }: { id: string }): Promise<SupplierRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(supplierTable).where(eq(supplierTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewSupplierRow }): Promise<SupplierRow[]> {
    return this.db.ormQuery((tx) => tx.insert(supplierTable).values(data).returning());
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<NewSupplierRow>;
  }): Promise<SupplierRow[]> {
    return this.db.ormQuery((tx) =>
      tx.update(supplierTable).set(data).where(eq(supplierTable.id, id)).returning()
    );
  }

  async delete({ id }: { id: string }): Promise<SupplierRow[]> {
    return this.db.ormQuery((tx) =>
      tx
        .update(supplierTable)
        .set({
          deleted_at: new Date().toISOString(),
          is_active: false,
        } as unknown as Partial<NewSupplierRow>)
        .where(eq(supplierTable.id, id))
        .returning()
    );
  }

  async restore({ id }: { id: string }): Promise<SupplierRow[]> {
    return this.db.ormQuery((tx) =>
      tx
        .update(supplierTable)
        .set({ deleted_at: null, is_active: true } as unknown as Partial<NewSupplierRow>)
        .where(eq(supplierTable.id, id))
        .returning()
    );
  }
}
