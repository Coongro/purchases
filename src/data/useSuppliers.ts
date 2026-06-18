import { getHostReact, actions } from '@coongro/plugin-sdk';

const React = getHostReact();
const { useState, useEffect, useCallback, useRef } = React;

export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  notes: string | null;
}

export interface UseSuppliersResult {
  rows: Supplier[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** Lista de proveedores (purchases.suppliers.list), ordenados por nombre. */
export function useSuppliers(): UseSuppliersResult {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const reload = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const list = await actions.execute<Supplier[]>('purchases.suppliers.list');
      setRows((list ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proveedores');
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
