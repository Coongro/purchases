import { getHostReact, getHostUI, usePlugin } from '@coongro/plugin-sdk';

const UI = getHostUI();
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  GASTO_CATEGORIES,
  GASTO_CATEGORY_LABEL,
} from '../../constants.js';
import { createGasto } from '../../data/createGasto.js';
import { createPurchase } from '../../data/createPurchase.js';
import { useProductOptions } from '../../data/useProductOptions.js';
import { useSalidas } from '../../data/useSalidas.js';
import type { SalidaRow } from '../../data/useSalidas.js';
import { useSuppliers } from '../../data/useSuppliers.js';
import { formatMoney, formatDate } from '../../utils/money.js';

const React = getHostReact();
const { useState, useMemo } = React;
const h = React.createElement;

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

/**
 * SALIDAS — todo lo que sale plata: gastos simples + compras a proveedor, en una sola lista.
 * El modo Gasto registra un egreso de caja (billing.expenses); el modo Compra alimenta el
 * stock + registra el pago (createPurchase). Solo el efectivo toca el arqueo. Diseño aprobado
 * en A:/Coongro2/Salidas; el estado pagada/a-pagar + lote por ítem + 3 selectores por categoría
 * quedan diferidos (necesitan schema — ver memoria salidas_entity_spec_coong212).
 */
export function SalidasView() {
  const { rows, loading, error, reload } = useSalidas();
  const { rows: suppliers } = useSuppliers();
  const productOptions = useProductOptions();
  const { toast } = usePlugin();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('gasto');
  const [busy, setBusy] = useState(false);

  // Estado del modo Compra.
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineState[]>([emptyLine()]);

  // Estado del modo Gasto.
  const [gastoCategory, setGastoCategory] = useState('fijos');
  const [gastoConcept, setGastoConcept] = useState('');
  const [gastoAmount, setGastoAmount] = useState('');

  const compraTotal = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0),
    [lines]
  );
  const total = mode === 'compra' ? compraTotal : Number(gastoAmount) || 0;

  const openForm = () => {
    setMode('gasto');
    setSupplierId('');
    setPaymentMethod('efectivo');
    setNotes('');
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

  const saveCompra = async () => {
    const validLines = lines
      .filter(
        (l) =>
          (Number(l.quantity) || 0) > 0 &&
          (Number(l.unitCost) || 0) >= 0 &&
          (l.productId || l.description.trim())
      )
      .map((l) => ({
        productId: l.productId || null,
        description: l.description.trim() || 'Ítem',
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
      }));
    if (validLines.length === 0) {
      toast.warning('Falta el detalle', 'Agregá al menos un ítem con cantidad y costo.');
      return;
    }
    await createPurchase({
      supplierId: supplierId || null,
      paymentMethod,
      notes: notes.trim() || null,
      lines: validLines,
    });
    toast.success(
      'Compra registrada',
      `${formatMoney(compraTotal)} · ${PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod}`
    );
  };

  const saveGasto = async () => {
    const amount = Number(gastoAmount) || 0;
    if (amount <= 0) {
      toast.warning('Falta el monto', 'Ingresá el monto del gasto.');
      return;
    }
    await createGasto({
      category: gastoCategory,
      amount,
      notes: gastoConcept.trim() || GASTO_CATEGORY_LABEL[gastoCategory],
    });
    toast.success('Gasto registrado', formatMoney(amount));
  };

  const save = async () => {
    setBusy(true);
    try {
      if (mode === 'compra') await saveCompra();
      else await saveGasto();
      setOpen(false);
      await reload();
    } catch {
      toast.error('No se pudo registrar', 'Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const modeTab = (value: Mode, label: string, icon: string) =>
    h(
      UI.Button,
      {
        type: 'button',
        variant: mode === value ? 'brand' : 'outline',
        size: 'sm',
        onClick: () => setMode(value),
      } as any,
      h(UI.DynamicIcon, { icon, size: 14 } as any),
      ` ${label}`
    );

  return h(
    'div',
    { className: 'font-inter min-h-screen bg-cg-bg-secondary p-6' },
    h(
      'div',
      { className: 'w-full flex flex-col gap-5' },

      // Header
      h(
        'div',
        { className: 'flex items-end justify-between gap-4 flex-wrap' },
        h(
          'div',
          null,
          h('h1', { className: 'text-2xl font-bold text-cg-text' }, 'Salidas'),
          h(
            'p',
            { className: 'text-sm text-cg-text-muted mt-1' },
            'Todo lo que sale: gastos y compras a proveedores. En efectivo, sale de la caja.'
          )
        ),
        h(
          UI.Button,
          { variant: 'brand', size: 'sm', onClick: openForm } as any,
          h(UI.DynamicIcon, { icon: 'Plus', size: 14 } as any),
          ' Registrar salida'
        )
      ),

      // Lista unificada de salidas
      loading
        ? h(UI.LoadingOverlay, { variant: 'skeleton', rows: 5 } as any)
        : error
          ? h(UI.ErrorDisplay, { message: error, onRetry: () => void reload() } as any)
          : rows.length === 0
            ? h(UI.EmptyState, {
                title: 'Sin salidas todavía',
                description: 'Registrá un gasto o una compra a proveedor.',
                icon: h(UI.DynamicIcon, { icon: 'ArrowUpFromLine', size: 32 } as any),
              } as any)
            : h(
                'div',
                { className: 'flex flex-col gap-2' },
                ...rows.map((s: SalidaRow) =>
                  h(
                    'div',
                    {
                      key: s.id,
                      className:
                        'bg-cg-bg rounded-xl border border-cg-border px-4 py-3 shadow-sm flex items-center justify-between gap-3',
                    },
                    h(
                      'div',
                      { className: 'min-w-0 flex flex-col gap-1' },
                      h(
                        'div',
                        { className: 'flex items-center gap-2' },
                        h(
                          UI.Badge,
                          { variant: s.kind === 'compra' ? 'secondary' : 'outline' } as any,
                          s.kind === 'compra' ? 'Compra' : 'Gasto'
                        ),
                        h(
                          'span',
                          { className: 'text-sm font-semibold text-cg-text truncate' },
                          s.concept
                        )
                      ),
                      h(
                        'div',
                        { className: 'flex items-center gap-2 text-xs text-cg-text-muted' },
                        formatDate(s.date),
                        s.paymentMethod &&
                          h(
                            'span',
                            null,
                            `· ${PAYMENT_METHOD_LABEL[s.paymentMethod] ?? s.paymentMethod}`
                          )
                      )
                    ),
                    h(
                      'span',
                      { className: 'font-mono font-semibold text-cg-text' },
                      formatMoney(s.total)
                    )
                  )
                )
              ),

      // FormDialog — Registrar salida
      h(
        UI.FormDialog,
        {
          open,
          onOpenChange: (v: boolean) => setOpen(v),
          title: 'Registrar salida',
          size: 'lg',
          footer: h(
            'div',
            { className: 'flex items-center justify-between gap-4 w-full' },
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
                'Registrar'
              )
            )
          ),
        } as any,
        h(
          'div',
          { className: 'flex flex-col gap-4' },

          // Selector de modo
          h(
            'div',
            { className: 'flex gap-2' },
            modeTab('gasto', 'Gasto', 'Receipt'),
            modeTab('compra', 'Compra', 'ShoppingCart')
          ),

          // ── Modo Gasto ──
          mode === 'gasto' &&
            h(
              'div',
              { className: 'flex flex-col gap-3' },
              h(
                'div',
                { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                h(
                  'div',
                  null,
                  h(
                    'label',
                    { className: 'block text-xs font-semibold text-cg-text-muted mb-1' },
                    'Tipo de gasto'
                  ),
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
                  h(
                    'label',
                    { className: 'block text-xs font-semibold text-cg-text-muted mb-1' },
                    'Monto'
                  ),
                  h(UI.Input, {
                    type: 'number',
                    size: 'sm',
                    min: 0,
                    step: '0.01',
                    value: gastoAmount,
                    onChange: (e: any) => setGastoAmount(e.target.value),
                    placeholder: '0',
                  } as any)
                )
              ),
              h(
                'div',
                null,
                h(
                  'label',
                  { className: 'block text-xs font-semibold text-cg-text-muted mb-1' },
                  'Concepto'
                ),
                h(UI.Input, {
                  size: 'sm',
                  value: gastoConcept,
                  onChange: (e: any) => setGastoConcept(e.target.value),
                  placeholder: 'Ej: Luz, alquiler, retiro de socio…',
                } as any)
              ),
              h(
                'div',
                {
                  className:
                    'text-xs text-cg-text-muted bg-cg-bg-secondary rounded-lg px-3 py-2 border border-cg-border',
                },
                'El gasto se registra como egreso de caja. (Medios no-efectivo y "a pagar" llegan con el estado de salida.)'
              )
            ),

          // ── Modo Compra ──
          mode === 'compra' &&
            h(
              'div',
              { className: 'flex flex-col gap-4' },
              h(
                'div',
                { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                h(
                  'div',
                  null,
                  h(
                    'label',
                    { className: 'block text-xs font-semibold text-cg-text-muted mb-1' },
                    'Proveedor'
                  ),
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
                  null,
                  h(
                    'label',
                    { className: 'block text-xs font-semibold text-cg-text-muted mb-1' },
                    'Cómo se pagó'
                  ),
                  h(UI.SegmentedControl, {
                    value: paymentMethod,
                    options: PAYMENT_METHODS,
                    onChange: (v: string) => setPaymentMethod(v),
                    size: 'sm',
                    'aria-label': 'Medio de pago',
                  } as any)
                )
              ),
              h(
                'div',
                { className: 'flex flex-col gap-2' },
                h(
                  'label',
                  { className: 'block text-xs font-semibold text-cg-text-muted' },
                  'Ítems'
                ),
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
                            size: 'sm',
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
                        size: 'sm',
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
                        size: 'sm',
                        min: 0,
                        step: '0.01',
                        value: l.unitCost,
                        onChange: (e: any) => setLine(i, { unitCost: e.target.value }),
                        placeholder: 'Costo unit.',
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
              ),
              h(
                'div',
                null,
                h(
                  'label',
                  { className: 'block text-xs font-semibold text-cg-text-muted mb-1' },
                  'Nota (opcional)'
                ),
                h(UI.Input, {
                  size: 'sm',
                  value: notes,
                  onChange: (e: any) => setNotes(e.target.value),
                  placeholder: 'Ej: remito 1234',
                } as any)
              ),
              paymentMethod === 'efectivo' &&
                compraTotal > 0 &&
                h(
                  'div',
                  {
                    className:
                      'text-xs text-cg-text-muted bg-cg-bg-secondary rounded-lg px-3 py-2 border border-cg-border',
                  },
                  `Al ser en efectivo, se registra un egreso de ${formatMoney(compraTotal)} en la caja.`
                )
            )
        )
      )
    )
  );
}
