/**
 * Helpers de UI compartidos por las vistas/drawers de Salidas (formato, medios, tipos
 * de gasto, categorías de producto). Espejo de data.jsx del diseño, adaptado a Coongro.
 */

/** Formato de plata del diseño: "$ 10.000". */
export const fmt = (n: number | string): string =>
  '$ ' + Math.round(Number(n) || 0).toLocaleString('es-AR');

export interface Medio {
  id: string;
  label: string;
  icon: string;
}

/** Medios de pago (mismo set que Cobros, sin cheque). Solo efectivo toca caja. */
export const MEDIOS: Medio[] = [
  { id: 'efectivo', label: 'Efectivo', icon: 'cash' },
  { id: 'transferencia', label: 'Transferencia', icon: 'transfer' },
  { id: 'debito', label: 'Débito', icon: 'card' },
  { id: 'credito', label: 'Crédito', icon: 'card' },
];
export const MEDIO_BY_ID: Record<string, Medio> = Object.fromEntries(MEDIOS.map((m) => [m.id, m]));

export interface GastoTipo {
  id: string;
  label: string;
  icon: string;
}

/** Tipos de gasto (modo Gasto). */
export const GASTOS: GastoTipo[] = [
  { id: 'retiro', label: 'Retiro', icon: 'cashout' },
  { id: 'fijos', label: 'Gastos fijos', icon: 'bolt' },
  { id: 'otro', label: 'Otro', icon: 'tag' },
];
export const GASTO_BY_ID: Record<string, GastoTipo> = Object.fromEntries(
  GASTOS.map((g) => [g.id, g])
);

export interface ProdCat {
  id: string;
  label: string;
  tag: string;
  icon: string;
  noun: string;
}

/** Categorías de producto (modo Compra · 3 selectores que caen en una sola lista). */
export const PROD_CATS: ProdCat[] = [
  { id: 'med', label: 'Medicamentos', tag: 'Med.', icon: 'pill', noun: 'medicamento' },
  { id: 'vacc', label: 'Vacunas', tag: 'Vacuna', icon: 'syringe', noun: 'vacuna' },
  { id: 'insumo', label: 'Insumos', tag: 'Insumo', icon: 'box', noun: 'insumo' },
];
export const PROD_CAT_BY_ID: Record<string, ProdCat> = Object.fromEntries(
  PROD_CATS.map((c) => [c.id, c])
);
