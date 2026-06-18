import { getHostReact, actions } from '@coongro/plugin-sdk';

const React = getHostReact();
const { useState, useEffect, useCallback, useRef } = React;

export interface PurchaseRow {
  id: string;
  supplierId: string | null;
  supplierName: string;
  purchaseDate: string;
  paymentMethod: string;
  total: string;
  notes: string | null;
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

export interface UsePurchasesResult {
  rows: PurchaseRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Compras con total (purchases.records.listWithTotals) y nombre de proveedor resuelto de
 * forma blanda (si no hay proveedor → "—"). Más reciente primero (ya viene ordenado del repo).
 */
export function usePurchases(): UsePurchasesResult {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
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
      setRows(
        (purchases ?? []).map((p) => ({
          id: p.id,
          supplierId: p.supplier_id,
          supplierName: p.supplier_id ? (nameById.get(p.supplier_id) ?? '—') : '—',
          purchaseDate: p.purchase_date,
          paymentMethod: p.payment_method,
          total: p.total,
          notes: p.notes,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las compras');
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
