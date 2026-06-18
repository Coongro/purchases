/**
 * @coongro/purchases — Exportaciones server-only
 *
 * Schema tables y repositories (dependen de drizzle-orm).
 * NO importar desde el browser — usar '@coongro/purchases' para hooks/componentes.
 */
export * from './schema/supplier.js';
export { SupplierRepository } from './repositories/supplier.repository.js';
export * from './schema/purchase.js';
export { PurchaseRepository } from './repositories/purchase.repository.js';
export * from './schema/purchase-line.js';
export { PurchaseLineRepository } from './repositories/purchase-line.repository.js';
