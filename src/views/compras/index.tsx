import { getHostReact, getHostUI, usePlugin, actions } from '@coongro/plugin-sdk';

import { RegistrarDrawer, type SubmitPayload } from '../../components/RegistrarDrawer.js';
import { SalidaDetailDrawer } from '../../components/SalidaDetailDrawer.js';
import { SalidasSummaryCards } from '../../components/SalidasSummaryCards.js';
import type { EstadoFilter } from '../../components/SalidasSummaryCards.js';
import { PAYMENT_METHODS } from '../../constants.js';
import { createSalida } from '../../data/createSalida.js';
import { useProductOptions } from '../../data/useProductOptions.js';
import { useSalidas } from '../../data/useSalidas.js';
import type { SalidaRow } from '../../data/useSalidas.js';
import { useSuppliers } from '../../data/useSuppliers.js';
import { formatMoney, formatDate } from '../../utils/money.js';

const UI = getHostUI();
const React = getHostReact();
const { useState, useMemo } = React;
const h = React.createElement;

const SERIF = 'font-serif font-black tracking-tight';

/** Badge de estado de la salida (pagada / parcial · saldo / a pagar). */
function estadoBadge(s: SalidaRow) {
  if (s.estado === 'pagada') return h(UI.Badge, { variant: 'paid' } as any, 'Pagada');
  if (s.estado === 'parcial')
    return h(UI.Badge, { variant: 'orange' } as any, `Parcial · saldo ${formatMoney(s.balance)}`);
  return h(UI.Badge, { variant: 'warning-soft' } as any, 'A pagar');
}

/**
 * SALIDAS — todo lo que sale: gastos + compras a proveedor. Diseño A:/Coongro2/Salidas,
 * mismo lenguaje que Cobros/Caja. Reusa el ledger POR PAGAR de billing (cuenta+líneas+pagos
 * → estado), así el estado pagada/parcial/a-pagar es real. Drawer con modos Gasto/Compra +
 * control de estado. El lote por ítem va aparte (COONG-217). Solo el efectivo+pagada toca caja.
 */
export function SalidasView() {
  const { rows, deuda, loading, error, reload } = useSalidas();
  const { rows: suppliers } = useSuppliers();
  const productOptions = useProductOptions();
  const { toast } = usePlugin();

  const [registrando, setRegistrando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('todas');
  const [deudaOpen, setDeudaOpen] = useState(true);
  // Salida abierta en el drawer de detalle (click en una fila).
  const [detailRow, setDetailRow] = useState<SalidaRow | null>(null);

  const metrics = useMemo(() => {
    let aPagar = 0;
    let pagado = 0;
    let nApagar = 0;
    rows.forEach((s) => {
      const balance = Number(s.balance) || 0;
      pagado += Number(s.paid) || 0;
      if (balance > 0.005) {
        aPagar += balance;
        nApagar += 1;
      }
    });
    return { aPagar, nApagar, pagado, nSalidas: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (estadoFilter === 'apagar')
      result = result.filter((r) => r.estado === 'apagar' || r.estado === 'parcial');
    else if (estadoFilter === 'pagadas') result = result.filter((r) => r.estado === 'pagada');
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.concept.toLowerCase().includes(q));
    }
    return result;
  }, [rows, estadoFilter, search]);

  const deudaTotal = useMemo(() => deuda.reduce((s, d) => s + (Number(d.saldo) || 0), 0), [deuda]);

  // Registrar: el RegistrarDrawer recolecta el form y delega acá (createSalida + toast +
  // reload). Si el proveedor se cargó libre (sin id), se crea primero en purchases.suppliers.
  const onSubmit = async (payload: SubmitPayload) => {
    setBusy(true);
    try {
      let supplierId = payload.supplierId;
      if (payload.mode === 'compra' && !supplierId && payload.supplierName) {
        try {
          const s = await actions.execute<{ id: string }>('purchases.suppliers.create', {
            data: { name: payload.supplierName },
          });
          supplierId = s?.id ?? null;
        } catch {
          /* si no se pudo crear, la compra queda sin proveedor asociado */
        }
      }
      await createSalida({
        mode: payload.mode,
        medio: payload.medio,
        pagada: payload.pagada,
        gastoCategory: payload.gastoCategory,
        concept: payload.concept,
        amount: payload.amount,
        supplierId,
        items: payload.items,
      });
      toast.success(
        payload.pagada ? 'Salida registrada' : 'Salida registrada · queda a pagar',
        formatMoney(payload.total)
      );
      setRegistrando(false);
      await reload();
    } catch {
      toast.error('No se pudo registrar', 'Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'fecha',
        header: 'Fecha',
        render: (s: SalidaRow) => h('span', { className: 'font-mono' }, formatDate(s.date)),
      },
      {
        key: 'concepto',
        header: 'Concepto',
        render: (s: SalidaRow) => h('span', { className: 'font-medium text-cg-text' }, s.concept),
      },
      {
        key: 'tipo',
        header: 'Tipo',
        render: (s: SalidaRow) =>
          s.kind === 'compra'
            ? h(
                UI.Badge,
                { variant: 'secondary' } as any,
                h(UI.DynamicIcon, { icon: 'Truck', size: 12 } as any),
                ' Compra'
              )
            : h(
                UI.Badge,
                { variant: 'outline' } as any,
                h(UI.DynamicIcon, { icon: 'Tag', size: 12 } as any),
                ' Gasto'
              ),
      },
      {
        key: 'medio',
        header: 'Medio',
        render: (s: SalidaRow) =>
          h(
            'span',
            { className: 'text-cg-text-muted' },
            s.paymentMethod
              ? (PAYMENT_METHODS.find((m) => m.value === s.paymentMethod)?.label ?? s.paymentMethod)
              : '—'
          ),
      },
      { key: 'estado', header: 'Estado', render: (s: SalidaRow) => estadoBadge(s) },
      {
        key: 'monto',
        header: 'Monto',
        className: 'text-right',
        render: (s: SalidaRow) =>
          h('span', { className: 'font-mono font-semibold text-cg-text' }, formatMoney(s.total)),
      },
    ],
    []
  );

  // Render mobile: cada salida como card (la DataTable usa esto en pantallas chicas).
  const mobileRender = (s: SalidaRow) =>
    h(
      'div',
      { className: 'flex flex-col gap-1.5' },
      h(
        'div',
        { className: 'flex items-center justify-between gap-2' },
        h('span', { className: 'font-medium text-cg-text' }, s.concept),
        h('span', { className: 'font-mono font-semibold text-cg-text' }, formatMoney(s.total))
      ),
      h(
        'div',
        { className: 'flex items-center gap-2 flex-wrap' },
        s.kind === 'compra'
          ? h(
              UI.Badge,
              { variant: 'secondary', size: 'sm' } as any,
              h(UI.DynamicIcon, { icon: 'Truck', size: 11 } as any),
              ' Compra'
            )
          : h(
              UI.Badge,
              { variant: 'outline', size: 'sm' } as any,
              h(UI.DynamicIcon, { icon: 'Tag', size: 11 } as any),
              ' Gasto'
            ),
        estadoBadge(s)
      ),
      h(
        'div',
        { className: 'text-xs', style: { color: 'var(--cg-text-muted)' } },
        [
          formatDate(s.date),
          s.paymentMethod
            ? (PAYMENT_METHODS.find((m) => m.value === s.paymentMethod)?.label ?? s.paymentMethod)
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      )
    );

  return h(
    'div',
    { className: 'font-inter min-h-screen bg-cg-bg-secondary p-6' },
    h(
      'div',
      { className: 'w-full flex flex-col gap-6' },

      // Header
      h(
        'div',
        { className: 'flex items-end justify-between gap-4 flex-wrap' },
        h(
          'div',
          null,
          h('h1', { className: `text-2xl text-cg-text ${SERIF}` }, 'Salidas'),
          h(
            'p',
            { className: 'text-sm text-cg-text-muted mt-1' },
            'Todo lo que sale de plata — gastos y compras a proveedores, en un solo lugar.'
          )
        ),
        h(
          UI.Button,
          { variant: 'brand', size: 'sm', onClick: () => setRegistrando(true) } as any,
          h(UI.DynamicIcon, { icon: 'Plus', size: 14 } as any),
          ' Registrar salida'
        )
      ),

      // Tarjetas-resumen (atajos de filtro por estado)
      h(SalidasSummaryCards, {
        metrics,
        loading,
        estadoFilter,
        onFilter: (f: EstadoFilter) => setEstadoFilter(f),
      }),

      // Panel "A pagar — por proveedor"
      !loading &&
        deuda.length > 0 &&
        h(
          'div',
          { className: 'bg-cg-bg rounded-xl border border-cg-border overflow-hidden' },
          h(
            'button',
            {
              type: 'button',
              onClick: () => setDeudaOpen((v: boolean) => !v),
              className: 'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-cg-bg-hover',
            },
            h(
              'span',
              {
                className:
                  'inline-flex items-center justify-center rounded-lg text-cg-gold-deep bg-cg-gold-soft',
                style: { width: 32, height: 32 },
              },
              h(UI.DynamicIcon, { icon: 'Store', size: 16 } as any)
            ),
            h(
              'div',
              { className: 'min-w-0 flex flex-col' },
              h(
                'span',
                { className: 'text-sm font-medium text-cg-text' },
                'A pagar — por proveedor'
              ),
              h(
                'span',
                { className: 'text-xs text-cg-text-muted' },
                `${deuda.length} ${deuda.length === 1 ? 'acreedor' : 'acreedores'}`
              )
            ),
            h(
              'span',
              { className: 'ml-auto font-mono font-bold text-cg-gold-deep' },
              formatMoney(deudaTotal)
            ),
            h(UI.DynamicIcon, {
              icon: deudaOpen ? 'ChevronUp' : 'ChevronDown',
              size: 16,
              className: 'text-cg-text-muted',
            } as any)
          ),
          deudaOpen &&
            h(
              'div',
              { className: 'px-4 pb-2 border-t border-cg-border' },
              ...deuda.map((d) =>
                h(
                  'div',
                  {
                    key: d.key,
                    className:
                      'flex items-center gap-3 py-2.5 border-b border-cg-border-subtle last:border-b-0',
                  },
                  h(UI.DynamicIcon, {
                    icon: 'Store',
                    size: 15,
                    className: 'text-cg-text-muted',
                  } as any),
                  h('span', { className: 'text-sm text-cg-text' }, d.name),
                  h(
                    'span',
                    { className: 'ml-auto font-mono font-medium text-cg-text' },
                    formatMoney(d.saldo)
                  )
                )
              )
            )
        ),

      // Lista (DataTable, mismo lenguaje que Cobros)
      h(
        'div',
        { className: 'bg-cg-bg rounded-xl border border-cg-border p-6 shadow-sm' },
        h(UI.DataTable, {
          data: filtered,
          rowKey: (s: SalidaRow) => s.id,
          loading,
          error,
          onRetry: reload,
          onRowClick: (s: SalidaRow) => setDetailRow(s),
          columns,
          searchPlaceholder: 'Proveedor o concepto',
          searchValue: search,
          onSearchChange: setSearch,
          filterSections: [
            {
              label: 'Estado',
              options: [
                { value: 'todas', label: 'Todas' },
                { value: 'apagar', label: 'A pagar' },
                { value: 'pagadas', label: 'Pagadas' },
              ],
              value: estadoFilter,
              onChange: (v: string) => setEstadoFilter(v as EstadoFilter),
            },
          ],
          emptyState: {
            title: 'Sin salidas todavía',
            description: 'Registrá un gasto o una compra a proveedor.',
            icon: h(UI.DynamicIcon, { icon: 'ArrowUpFromLine', size: 32 } as any),
            filteredTitle: 'Sin salidas en este filtro',
            filteredDescription: 'Probá cambiar el estado o la búsqueda.',
          },
          skeletonRows: 7,
          mobileRender,
        } as any)
      )
    ),

    // Drawer lateral — Registrar salida (formato del diseño, sobre tokens cg-*)
    registrando &&
      h(RegistrarDrawer, {
        onClose: () => setRegistrando(false),
        onSubmit: (p: SubmitPayload) => void onSubmit(p),
        suppliers,
        products: productOptions,
        busy,
      }),

    // Drawer de detalle — click en una fila abre el detalle + permite registrar pago.
    h(SalidaDetailDrawer, {
      accountId: detailRow?.id ?? null,
      concept: detailRow?.concept,
      kind: detailRow?.kind,
      date: detailRow?.date,
      paymentMethod: detailRow?.paymentMethod,
      onClose: () => setDetailRow(null),
      onChanged: () => void reload(),
    })
  );
}
