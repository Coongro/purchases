import { getHostReact, getHostUI, usePlugin } from '@coongro/plugin-sdk';

const UI = getHostUI();
import { SalidasSummaryCards } from '../../components/SalidasSummaryCards.js';
import type { EstadoFilter } from '../../components/SalidasSummaryCards.js';
import { PAYMENT_METHODS, GASTO_CATEGORIES } from '../../constants.js';
import { createSalida } from '../../data/createSalida.js';
import { useProductOptions } from '../../data/useProductOptions.js';
import { useSalidas } from '../../data/useSalidas.js';
import type { SalidaRow } from '../../data/useSalidas.js';
import { useSuppliers } from '../../data/useSuppliers.js';
import { formatMoney, formatDate } from '../../utils/money.js';

const React = getHostReact();
const { useState, useMemo } = React;
const h = React.createElement;

const SERIF = 'font-serif font-black tracking-tight';
const FIELD_LABEL = 'block text-xs font-semibold text-cg-text-muted mb-1';

type Mode = 'gasto' | 'compra';

interface LineState {
  productId: string;
  description: string;
  quantity: string;
  unitCost: string;
}

const emptyLine = (): LineState => ({
  productId: '',
  description: '',
  quantity: '1',
  unitCost: '',
});

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

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('gasto');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('todas');
  const [deudaOpen, setDeudaOpen] = useState(true);

  // Estado del drawer (compartido gasto/compra)
  const [medio, setMedio] = useState('efectivo');
  const [pagada, setPagada] = useState(true);
  // Compra
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<LineState[]>([emptyLine()]);
  // Gasto
  const [gastoCategory, setGastoCategory] = useState('fijos');
  const [gastoConcept, setGastoConcept] = useState('');
  const [gastoAmount, setGastoAmount] = useState('');

  const compraTotal = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0),
    [lines]
  );
  const total = mode === 'compra' ? compraTotal : Number(gastoAmount) || 0;

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

  const openForm = () => {
    setMode('gasto');
    setMedio('efectivo');
    setPagada(true);
    setSupplierId('');
    setLines([emptyLine()]);
    setGastoCategory('fijos');
    setGastoConcept('');
    setGastoAmount('');
    setOpen(true);
  };

  const setLine = (i: number, patch: Partial<LineState>) =>
    setLines((prev: LineState[]) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const onPickProduct = (i: number, productId: string) => {
    const p = productOptions.find((o) => o.id === productId);
    setLine(i, { productId, description: p?.name ?? '', unitCost: p?.purchasePrice ?? '' });
  };
  const addLine = () => setLines((prev: LineState[]) => [...prev, emptyLine()]);
  const removeLine = (i: number) =>
    setLines((prev: LineState[]) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const save = async () => {
    if (mode === 'gasto' && (Number(gastoAmount) || 0) <= 0) {
      toast.warning('Falta el monto', 'Ingresá el monto del gasto.');
      return;
    }
    if (mode === 'compra' && compraTotal <= 0) {
      toast.warning('Falta el detalle', 'Agregá al menos un ítem con cantidad y costo.');
      return;
    }
    setBusy(true);
    try {
      await createSalida({
        mode,
        medio,
        pagada,
        gastoCategory,
        concept: gastoConcept,
        amount: Number(gastoAmount) || 0,
        supplierId: supplierId || null,
        items: lines.map((l) => ({
          productId: l.productId || null,
          description: l.description,
          quantity: Number(l.quantity) || 0,
          unitCost: Number(l.unitCost) || 0,
        })),
      });
      toast.success(
        pagada ? 'Salida registrada' : 'Salida registrada · queda a pagar',
        formatMoney(total)
      );
      setOpen(false);
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

  const modeOptions = [
    { value: 'gasto', label: 'Gasto' },
    { value: 'compra', label: 'Compra' },
  ];
  const estadoOptions = [
    { value: 'true', label: mode === 'compra' ? 'Ya pagué' : 'Pagada' },
    { value: 'false', label: mode === 'compra' ? 'Queda a pagar' : 'A pagar' },
  ];

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
          { variant: 'brand', size: 'sm', onClick: openForm } as any,
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
                    icon: 'Truck',
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
        } as any)
      )
    ),

    // Drawer lateral — Registrar salida
    h(
      UI.Sheet,
      { open, onOpenChange: (v: boolean) => setOpen(v), side: 'right' } as any,
      h(
        UI.SheetContent,
        {
          style: { width: '512px', maxWidth: '94vw', display: 'flex', flexDirection: 'column' },
        } as any,
        h(
          UI.SheetHeader,
          null,
          h(
            'div',
            { className: 'text-[11px] font-bold tracking-wider uppercase text-cg-text-muted mb-1' },
            'SALIDA'
          ),
          h(
            UI.SheetTitle,
            null,
            h('span', { className: SERIF, style: { fontSize: '21px' } }, 'Registrar salida')
          )
        ),

        h(
          'div',
          { style: { flex: 1, overflowY: 'auto' }, className: 'flex flex-col gap-4 py-4' },

          // Modo
          h(UI.SegmentedControl, {
            value: mode,
            options: modeOptions,
            onChange: (v: string) => setMode(v as Mode),
            size: 'sm',
            'aria-label': 'Tipo de salida',
          } as any),

          // Gasto
          mode === 'gasto' &&
            h(
              'div',
              { className: 'flex flex-col gap-3' },
              h(
                'div',
                null,
                h('label', { className: FIELD_LABEL }, 'Tipo de gasto'),
                h(
                  UI.Select,
                  { value: gastoCategory, onValueChange: setGastoCategory } as any,
                  ...GASTO_CATEGORIES.map((g) =>
                    h(UI.SelectItem, { key: g.value, value: g.value } as any, g.label)
                  )
                )
              ),
              h(
                'div',
                null,
                h('label', { className: FIELD_LABEL }, 'Monto'),
                h(UI.Input, {
                  type: 'number',
                  min: 0,
                  step: '0.01',
                  value: gastoAmount,
                  onChange: (e: any) => setGastoAmount(e.target.value),
                  placeholder: '0',
                } as any)
              ),
              h(
                'div',
                null,
                h('label', { className: FIELD_LABEL }, 'Concepto'),
                h(UI.Input, {
                  value: gastoConcept,
                  onChange: (e: any) => setGastoConcept(e.target.value),
                  placeholder: 'Ej: Luz, alquiler, retiro de socio…',
                } as any)
              )
            ),

          // Compra
          mode === 'compra' &&
            h(
              'div',
              { className: 'flex flex-col gap-4' },
              h(
                'div',
                null,
                h('label', { className: FIELD_LABEL }, 'Proveedor'),
                h(
                  UI.Select,
                  {
                    value: supplierId,
                    onValueChange: setSupplierId,
                    placeholder: 'Elegí (opcional)',
                  } as any,
                  ...suppliers.map((s) =>
                    h(UI.SelectItem, { key: s.id, value: s.id } as any, s.name)
                  )
                )
              ),
              h(
                'div',
                { className: 'flex flex-col gap-2' },
                h('label', { className: FIELD_LABEL }, 'Ítems'),
                ...lines.map((l, i) =>
                  h(
                    'div',
                    { key: i, className: 'grid grid-cols-12 gap-2 items-center' },
                    h(
                      'div',
                      { className: 'col-span-6' },
                      productOptions.length > 0
                        ? h(
                            UI.Select,
                            {
                              value: l.productId,
                              onValueChange: (v: string) => onPickProduct(i, v),
                              placeholder: 'Producto',
                            } as any,
                            ...productOptions.map((o) =>
                              h(UI.SelectItem, { key: o.id, value: o.id } as any, o.name)
                            )
                          )
                        : h(UI.Input, {
                            value: l.description,
                            onChange: (e: any) => setLine(i, { description: e.target.value }),
                            placeholder: 'Descripción',
                          } as any)
                    ),
                    h(
                      'div',
                      { className: 'col-span-2' },
                      h(UI.Input, {
                        type: 'number',
                        min: 0,
                        step: '1',
                        value: l.quantity,
                        onChange: (e: any) => setLine(i, { quantity: e.target.value }),
                        placeholder: 'Cant.',
                      } as any)
                    ),
                    h(
                      'div',
                      { className: 'col-span-3' },
                      h(UI.Input, {
                        type: 'number',
                        min: 0,
                        step: '0.01',
                        value: l.unitCost,
                        onChange: (e: any) => setLine(i, { unitCost: e.target.value }),
                        placeholder: 'Costo',
                      } as any)
                    ),
                    h(
                      'div',
                      { className: 'col-span-1 flex justify-end' },
                      h(
                        UI.IconButton,
                        {
                          variant: 'ghost',
                          size: 'sm',
                          'aria-label': 'Quitar ítem',
                          disabled: lines.length === 1,
                          onClick: () => removeLine(i),
                        } as any,
                        h(UI.DynamicIcon, { icon: 'Trash2', size: 13 } as any)
                      )
                    )
                  )
                ),
                h(
                  'div',
                  null,
                  h(
                    UI.Button,
                    { variant: 'outline', size: 'sm', onClick: addLine } as any,
                    h(UI.DynamicIcon, { icon: 'Plus', size: 13 } as any),
                    ' Agregar ítem'
                  )
                )
              )
            ),

          // Medio
          h(
            'div',
            null,
            h('label', { className: FIELD_LABEL }, 'Medio'),
            h(UI.SegmentedControl, {
              value: medio,
              options: PAYMENT_METHODS,
              onChange: (v: string) => setMedio(v),
              size: 'sm',
              'aria-label': 'Medio de pago',
            } as any)
          ),

          // Estado (pagada / a-pagar) — reusa el ledger payable de billing
          h(
            'div',
            null,
            h('label', { className: FIELD_LABEL }, 'Estado'),
            h(UI.SegmentedControl, {
              value: String(pagada),
              options: estadoOptions,
              onChange: (v: string) => setPagada(v === 'true'),
              size: 'sm',
              'aria-label': 'Estado de la salida',
            } as any)
          ),

          // Aviso de impacto
          h(
            'div',
            {
              className:
                'text-xs text-cg-text-muted bg-cg-bg-secondary rounded-lg px-3 py-2 border border-cg-border',
            },
            !pagada
              ? 'Queda a pagar — suma a las salidas pendientes, no toca la caja hoy.'
              : medio === 'efectivo'
                ? `En efectivo, se registra un egreso de ${formatMoney(total)} en la caja.`
                : 'Pagada por banco/tarjeta — no toca la caja.'
          )
        ),

        // Footer
        h(
          'div',
          { className: 'flex items-center justify-between gap-4 border-t border-cg-border pt-4' },
          h(
            'span',
            { className: 'font-mono font-bold text-base text-cg-text' },
            `Total ${formatMoney(total)}`
          ),
          h(
            'div',
            { className: 'flex gap-2' },
            h(
              UI.Button,
              {
                variant: 'ghost',
                size: 'sm',
                disabled: busy,
                onClick: () => setOpen(false),
              } as any,
              'Cancelar'
            ),
            h(
              UI.Button,
              { variant: 'brand', size: 'sm', disabled: busy, onClick: () => void save() } as any,
              'Registrar salida'
            )
          )
        )
      )
    )
  );
}
