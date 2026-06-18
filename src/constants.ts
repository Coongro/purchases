/**
 * Medios de pago de una salida. Todos menos cheque (decisión de negocio: no complicar con
 * cuál usa cada veterinaria). Solo 'efectivo' toca la caja física (genera egreso); el resto
 * sale del banco/tarjeta. Text libre en DB (config de negocio). El estado pagada/a-pagar
 * (cuenta corriente con proveedor) necesita schema propio — diferido (ver memoria
 * salidas_entity_spec_coong212).
 */
export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
];

export const PAYMENT_METHOD_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label])
);

/** Categorías de gasto simple (modo Gasto de Salidas), según el diseño aprobado. */
export const GASTO_CATEGORIES = [
  { value: 'retiro', label: 'Retiro' },
  { value: 'fijos', label: 'Gastos fijos' },
  { value: 'otro', label: 'Otro' },
];

export const GASTO_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  GASTO_CATEGORIES.map((g) => [g.value, g.label])
);
