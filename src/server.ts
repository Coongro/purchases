/**
 * @coongro/purchases — Exportaciones server-only
 *
 * Schema tables y repositories (dependen de drizzle-orm).
 * NO importar desde el browser — usar '@coongro/purchases' para hooks/componentes.
 */
export * from './schema/supplier.js';
export { SupplierRepository } from './repositories/supplier.repository.js';
