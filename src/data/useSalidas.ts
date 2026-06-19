import { getHostReact, actions } from '@coongro/plugin-sdk';

const React = getHostReact();
const { useState, useEffect, useCallback, useRef } = React;

export type SalidaEstado = 'pagada' | 'parcial' | 'apagar';

/** Una salida = una cuenta por pagar (billing, direction='payable'). */
export interface SalidaRow {
  id: string;
  kind: 'compra' | 'gasto';
  date: string;
  /** Proveedor (compra) o concepto (gasto). */
  concept: string;
  estado: SalidaEstado;
  total: string;
  paid: string;
  balance: string;
  /** Medio del último pago, si está pagada (null si queda a pagar). */
  paymentMethod: string | null;
}

/** Deuda agrupada por proveedor/concepto, para el panel "A pagar — por proveedor". */
export interface DeudaRow {
  key: string;
  name: string;
  saldo: string;
  parcial: boolean;
}

interface RawAccount {
  id: string;
  contact_id: string | null;
  source: string;
  notes: string | null;
  opened_at: string;
  total: string;
  paid: string;
  balance: string;
  paymentStatus: string; // 'na' | 'unpaid' | 'partial' | 'paid'
}
interface RawPayment {
  id: string;
  account_id: string;
  method: string;
  paid_at: string;
}
interface RawSupplier {
  id: string;
  name: string;
}
interface RawDebtor {
  contact_id: string | null;
  debt: string;
  account_count: number;
}

export interface UseSalidasResult {
  rows: SalidaRow[];
  deuda: DeudaRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** paymentStatus de billing → estado de Salidas. */
function toEstado(paymentStatus: string, balance: string): SalidaEstado {
  if (paymentStatus === 'paid') return 'pagada';
  if (paymentStatus === 'partial') return 'parcial';
  // 'unpaid' / 'na' con saldo = a pagar; sin saldo (na sin líneas) lo tratamos a-pagar igual.
  return Number(balance) > 0.005 ? 'apagar' : 'pagada';
}

/**
 * Salidas = cuentas POR PAGAR del ledger de billing (direction='payable'). Reusa el mismo
 * motor de Cobros (cuenta+líneas+pagos→estado). Resuelve nombre de proveedor contra
 * purchases.suppliers y el medio del último pago. billing es blando: si no está, lista vacía.
 */
export function useSalidas(): UseSalidasResult {
  const [rows, setRows] = useState<SalidaRow[]>([]);
  const [deuda, setDeuda] = useState<DeudaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const reload = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const [accounts, payments, suppliers, debtors] = await Promise.all([
        actions.execute<RawAccount[]>('billing.accounts.listWithTotals', { direction: 'payable' }),
        actions.execute<RawPayment[]>('billing.payments.list').catch(() => [] as RawPayment[]),
        actions.execute<RawSupplier[]>('purchases.suppliers.list').catch(() => [] as RawSupplier[]),
        actions
          .execute<RawDebtor[]>('billing.accounts.listDebtors', { direction: 'payable' })
          .catch(() => [] as RawDebtor[]),
      ]);

      const supplierName = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
      // Medio del último pago por cuenta (los pagos vienen del más reciente al más viejo).
      const medioByAccount = new Map<string, string>();
      for (const p of payments ?? []) {
        if (!medioByAccount.has(p.account_id)) medioByAccount.set(p.account_id, p.method);
      }

      const conceptOf = (a: RawAccount) =>
        a.source === 'compra'
          ? a.contact_id
            ? (supplierName.get(a.contact_id) ?? 'Proveedor')
            : 'Compra'
          : a.notes?.trim() || 'Gasto';

      const mapped: SalidaRow[] = (accounts ?? []).map((a) => ({
        id: a.id,
        kind: a.source === 'compra' ? 'compra' : 'gasto',
        date: a.opened_at,
        concept: conceptOf(a),
        estado: toEstado(a.paymentStatus, a.balance),
        total: a.total,
        paid: a.paid,
        balance: a.balance,
        paymentMethod: medioByAccount.get(a.id) ?? null,
      }));
      mapped.sort((x, y) => (x.date < y.date ? 1 : -1));
      setRows(mapped);

      setDeuda(
        (debtors ?? []).map((d) => ({
          key: d.contact_id ?? 'gasto',
          name: d.contact_id ? (supplierName.get(d.contact_id) ?? 'Proveedor') : 'Gastos varios',
          saldo: d.debt,
          parcial: false,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las salidas');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, deuda, loading, error, reload };
}
