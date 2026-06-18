import { getHostReact, actions } from '@coongro/plugin-sdk';

const React = getHostReact();
const { useState, useEffect, useCallback, useRef } = React;

/** Una salida unificada: compra a proveedor o gasto simple. */
export interface SalidaRow {
  id: string;
  kind: 'compra' | 'gasto';
  date: string;
  /** Proveedor (compra) o concepto/categoría (gasto). */
  concept: string;
  paymentMethod: string | null;
  total: string;
}

interface RawPurchase {
  id: string;
  supplier_id: string | null;
  purchase_date: string;
  payment_method: string;
  total: string;
  notes: string | null;
}
interface RawSupplier {
  id: string;
  name: string;
}
interface RawExpense {
  id: string;
  amount: string;
  category: string;
  spent_at: string;
  notes: string | null;
}

export interface UseSalidasResult {
  rows: SalidaRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** Categoría que usa createPurchase para el egreso de caja de una compra en efectivo. */
const PURCHASE_EXPENSE_CATEGORY = 'proveedor';

/**
 * Lista unificada de SALIDAS = compras (purchases.records) + gastos (billing.expenses),
 * ordenadas por fecha desc. Los egresos con categoría 'proveedor' se EXCLUYEN: son los
 * que genera automáticamente una compra en efectivo, ya representados por su compra (si
 * no, la compra aparecería dos veces). billing es blando: si no está, se listan solo
 * compras. Ver memoria salidas_entity_spec_coong212 para el modelo completo (tabla
 * `salida` propia + estado/medio, diferido).
 */
export function useSalidas(): UseSalidasResult {
  const [rows, setRows] = useState<SalidaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const reload = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const [purchases, suppliers] = await Promise.all([
        actions.execute<RawPurchase[]>('purchases.records.listWithTotals'),
        actions.execute<RawSupplier[]>('purchases.suppliers.list'),
      ]);
      const nameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

      const compras: SalidaRow[] = (purchases ?? []).map((p) => ({
        id: `compra:${p.id}`,
        kind: 'compra',
        date: p.purchase_date,
        concept: p.supplier_id ? (nameById.get(p.supplier_id) ?? 'Proveedor') : 'Compra',
        paymentMethod: p.payment_method,
        total: p.total,
      }));

      let gastos: SalidaRow[] = [];
      try {
        const expenses = await actions.execute<RawExpense[]>('billing.expenses.list');
        gastos = (expenses ?? [])
          .filter((e) => e.category !== PURCHASE_EXPENSE_CATEGORY)
          .map((e) => ({
            id: `gasto:${e.id}`,
            kind: 'gasto',
            date: e.spent_at,
            concept: e.notes?.trim() || e.category,
            paymentMethod: null,
            total: e.amount,
          }));
      } catch {
        // billing no disponible: solo compras.
      }

      const all = [...compras, ...gastos].sort((a, b) => (a.date < b.date ? 1 : -1));
      setRows(all);
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

  return { rows, loading, error, reload };
}
