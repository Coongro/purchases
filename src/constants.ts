/**
 * Medios de pago de una compra. Solo 'efectivo' toca la caja física (genera egreso);
 * 'transferencia' sale del banco; 'cuenta_corriente' queda a deber al proveedor (Nivel 2,
 * sin saldo todavía). Text libre en DB (config de negocio).
 */
export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
];

export const PAYMENT_METHOD_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.value, m.label])
);
