/**
 * Proveedores — datos y estado (generado por el Builder de Vistas).
 *
 * ⚠️ ARCHIVO REGENERABLE: se reescribe al guardar el diseño en el Builder.
 * La lógica custom va en `handlers.ts` (nunca se pisa). Diseño: `spec.json`.
 */
import {
  useAction,
  coreSettings,
  useFormat,
  useSettings,
  usePlugin,
  useViewLoader,
} from '@coongro/plugin-sdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { customHandlers } from './handlers.js';

const NO_ROWS: any[] = [];

export function useProveedoresView() {
  // Formato con la zona del negocio: lo reciben los handlers en su ctx.
  const fmt = useFormat();
  // Las cargas con la zona en la clave esperan a la del negocio (una vez, no dos).
  const { loading: zoneLoading } = useSettings(coreSettings);
  // Params de ESTA vista (su instancia), no los del overlay que esté encima.
  const viewParams = usePlugin().views.params as any;
  const { toast } = usePlugin();
  // Registro con el que se abrió la vista (views.open(id, { record })): en una
  // ficha es por lo que filtran sus tablas hijas. Null en una lista suelta.
  const viewRecord = (viewParams?.record ?? null) as Record<string, any> | null;

  const normKey = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');

  // ── tabla 1 — purchases.suppliers: estado propio en su scope (mismos nombres, sin colisión) ──
  const useTable1 = () => {
    const [search, setSearch] = useState('');

    // Filas de la tabla: una consulta de la caché del host. Se vuelve a cargar
    // sola cuando cambia algo de lo que leyó (lo que se escribe en esta pestaña
    // y, con el canal del servidor, lo que cambian otros): sin recargas a mano.
    const rowsQuery = useViewLoader<any[]>(
      ['purchases.proveedores.tabla', viewRecord?.id ?? null, fmt.timeZone],
      async (query) => {
        const ctx = {
          execute: function exec<T = unknown>(id: string, args?: unknown): Promise<T> {
            return query.execute<T>(id, args);
          },
          record: viewRecord,
          fmt,
          timeZone: fmt.timeZone,
          params: viewParams,
        };
        const byBlock = customHandlers.loadDataFor?.['tabla'];
        const data = byBlock
          ? await byBlock(ctx)
          : customHandlers.loadData
            ? await customHandlers.loadData(ctx)
            : await query.execute<any[]>('purchases.suppliers.list');
        if (data !== null && data !== undefined && !Array.isArray(data))
          // eslint-disable-next-line no-console -- aviso para quien escribe handlers.ts
          console.warn(
            '[purchases.proveedores.tabla] la carga de la tabla no devolvió un arreglo y la tabla queda vacía. ¿Es una lista paginada? Devolvé sus items.',
            data
          );
        return Array.isArray(data) ? data : [];
      },
      { enabled: !zoneLoading }
    );
    const rows: any[] = rowsQuery.data ?? NO_ROWS;
    const loading = rowsQuery.status === 'loading';
    // Volver a pedir ya (el `reload` de los handlers): casi nunca hace falta.
    const load = rowsQuery.refresh;
    // Por qué no cargó, con el mensaje del servidor: la tabla lo muestra en su estado de error.
    const loadError =
      rowsQuery.status === 'error'
        ? rowsQuery.error?.message || 'No se pudieron cargar los datos.'
        : null;
    const notifiedLoadError = useRef<string | null>(null);
    useEffect(() => {
      if (rowsQuery.status === 'success') notifiedLoadError.current = null;
      if (!loadError || notifiedLoadError.current === loadError) return;
      notifiedLoadError.current = loadError;
      toast.error('No se pudieron cargar los datos', loadError);
      // deps: el estado y el mensaje (toast es del host)
    }, [rowsQuery.status, loadError]);

    // columnas de la tabla: key + label (+ ref/refDisplay/refPath/ref2/display/values/prefix/suffix/format/iconFrom/empty*)
    const COLUMNS: {
      key: string;
      label: string;
      ref?: string;
      refDisplay?: string;
      refPath?: string;
      ref2?: string;
      display?: string;
      values?: { value: string; label?: string; icon?: string; tone?: string }[];
      tone?: string;
      prefix?: string;
      suffix?: string;
      format?: string;
      iconFrom?: string;
      emptyLabel?: string;
      emptyIcon?: string;
      dateDisplay?: string;
      pinned?: boolean;
    }[] = [
      { key: 'name', label: 'Proveedor' },
      { key: 'contact', label: 'Contacto', emptyLabel: '—' },
      { key: 'notes', label: 'Nota', emptyLabel: '—' },
      {
        key: 'is_active',
        label: 'Estado',
        display: 'pill',
        values: [
          { value: 'true', label: 'Activo', tone: 'success' },
          { value: 'false', label: 'Inactivo', tone: 'neutral' },
        ],
      },
      { key: 'created_at', label: 'Alta', format: 'date' },
    ];
    const cellValue = (
      row: any,
      c: { key: string; ref?: string; refDisplay?: string; refPath?: string; ref2?: string }
    ) => {
      let v = row?.[c.key];
      if (v === undefined) {
        const k = Object.keys(row ?? {}).find((x) => normKey(x) === normKey(c.key));
        v = k ? row[k] : undefined;
      }
      return v;
    };

    // orden por columna (click en el encabezado) + filtros automáticos
    const [sort, setSort] = useState<{ k: string; d: 1 | -1 } | null>(null);
    // firma del UI.DataTable del host: (key, 'asc' | 'desc' | null)
    const onSortChange = useCallback((k: string, d: 'asc' | 'desc' | null) => {
      setSort(d ? { k, d: d === 'asc' ? 1 : -1 } : null);
    }, []);
    const [filters, setFilters] = useState<Record<string, string>>({ is_active: 'true' });
    // opciones de filtro: los valores distintos (al menos 2) de cada columna; los automáticos se quedan con las de 2..12 y con más de 12 la lista del filtro trae buscador
    const filterOptions = useMemo(() => {
      const out: Record<string, string[]> = {};
      for (const c of COLUMNS) {
        const vals = [
          ...new Set(
            rows
              .map((r) => {
                const v = cellValue(r, c);
                return v === null || v === undefined ? '' : String(v);
              })
              .filter(Boolean)
          ),
        ];
        if (vals.length >= 2) out[c.key] = vals.sort((a, b) => a.localeCompare(b, 'es'));
      }
      return out;
    }, [rows]);
    const filterCounts = useMemo(() => {
      const out: Record<string, Record<string, number>> = {};
      for (const c of COLUMNS) {
        const m: Record<string, number> = {};
        for (const r of rows) {
          const v = cellValue(r, c);
          const s = v === null || v === undefined ? '' : String(v);
          if (s) m[s] = (m[s] ?? 0) + 1;
        }
        out[c.key] = m;
      }
      return out;
    }, [rows]);
    // la búsqueda filtra con una pausa corta: no se recorre la lista en cada tecla
    const [searchTerm, setSearchTerm] = useState('');
    useEffect(() => {
      const timer = setTimeout(() => {
        setSearchTerm(search);
      }, 150);
      return () => {
        clearTimeout(timer);
      };
    }, [search]);
    const visibleRows = useMemo(() => {
      let out = rows;
      const term = normKey(searchTerm);
      if (term)
        out = out.filter((r) =>
          COLUMNS.some((c) => {
            const v = cellValue(r, c);
            return (
              v !== null &&
              v !== undefined &&
              normKey(typeof v === 'object' ? JSON.stringify(v) : String(v)).includes(term)
            );
          })
        );
      for (const [k, fv] of Object.entries(filters)) {
        if (!fv) continue;
        const c = COLUMNS.find((x) => x.key === k);
        if (c)
          out = out.filter((r) => {
            const v = cellValue(r, c);
            return String(v ?? '') === fv;
          });
      }
      if (sort) {
        const c = COLUMNS.find((x) => x.key === sort.k);
        if (c)
          out = [...out].sort((ra, rb) => {
            const va = cellValue(ra, c);
            const vb = cellValue(rb, c);
            const na = Number(va);
            const nb = Number(vb);
            const cmp =
              !Number.isNaN(na) && !Number.isNaN(nb) && va !== '' && vb !== ''
                ? na - nb
                : String(va ?? '').localeCompare(String(vb ?? ''));
            return sort.d * cmp;
          });
      }
      return out;
    }, [rows, searchTerm, filters, sort]);
    // limpiar todo: búsqueda + filtros + orden (botón "Limpiar filtros" del FilterBar)
    const clearFilters = useCallback(() => {
      setSearch('');
      setFilters({});
      setSort(null);
    }, []);
    // paginación (20 por página); vuelve a la página 1 al buscar/filtrar/ordenar
    const [page, setPage] = useState(1);
    useEffect(() => {
      setPage(1);
    }, [search, filters, sort]);
    const pagedRows = useMemo(
      () => visibleRows.slice((page - 1) * 20, page * 20),
      [visibleRows, page]
    );
    const [pendingDelete, setPendingDelete] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);
    const removeRow = useCallback((row: any) => {
      setPendingDelete(row ?? null);
    }, []);
    const cancelDelete = useCallback(() => {
      if (!deleting) setPendingDelete(null);
    }, [deleting]);
    const { run: removeRecord } = useAction<unknown, { id: unknown }>('purchases.suppliers.delete');
    const confirmDelete = useCallback(async () => {
      if (!pendingDelete) return;
      const ids: any[] = Array.isArray(pendingDelete.ids) ? pendingDelete.ids : [pendingDelete.id];
      setDeleting(true);
      try {
        for (const id of ids) {
          const res = await removeRecord({ id });
          if (!res.success) throw new Error(res.error ?? 'No se pudo eliminar');
        }
        toast.success(
          'Eliminado',
          ids.length === 1
            ? 'El registro se eliminó correctamente'
            : ids.length + ' registros eliminados'
        );
        setPendingDelete(null);
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo eliminar');
      } finally {
        setDeleting(false);
      }
      // toast es del host (estable)
    }, [pendingDelete, removeRecord]);
    return {
      filterCounts,
      sort,
      onSortChange,
      filters,
      setFilters,
      filterOptions,
      cellValue,
      clearFilters,
      page,
      setPage,
      pagedRows,
      pendingDelete,
      deleting,
      confirmDelete,
      cancelDelete,
      loading,
      loadError,
      search,
      setSearch,
      load,
      COLUMNS,
      visibleRows,
      removeRow,
    };
  };
  const t1 = useTable1();

  const reloadTables = useCallback(() => {
    void t1.load();
  }, [t1]);

  return { t1, reloadTables };
}
