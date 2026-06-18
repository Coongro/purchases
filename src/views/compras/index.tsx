import { getHostReact, getHostUI, usePlugin } from '@coongro/plugin-sdk';

const UI = getHostUI();
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '../../constants.js';
import { createPurchase } from '../../data/createPurchase.js';
import { useProductOptions } from '../../data/useProductOptions.js';
import { usePurchases } from '../../data/usePurchases.js';
import type { PurchaseRow } from '../../data/usePurchases.js';
import { useSuppliers } from '../../data/useSuppliers.js';
import { formatMoney, formatDate } from '../../utils/money.js';

const React = getHostReact();
const { useState, useMemo } = React;
const h = React.createElement;

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

export function ComprasView() {
  const { rows, loading, error, reload } = usePurchases();
  const { rows: suppliers } = useSuppliers();
  const productOptions = useProductOptions();
  const { toast } = usePlugin();

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineState[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0),
    [lines]
  );

  const openForm = () => {
    setSupplierId('');
    setPaymentMethod('efectivo');
    setNotes('');
    setLines([emptyLine()]);
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
    setBusy(true);
    try {
      await createPurchase({
        supplierId: supplierId || null,
        paymentMethod,
        notes: notes.trim() || null,
        lines: validLines,
      });
      toast.success(
        'Compra registrada',
        `${formatMoney(total)} · ${PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod}`
      );
      setOpen(false);
      await reload();
    } catch {
      toast.error('No se pudo registrar', 'Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

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
          h('h1', { className: 'text-2xl font-bold text-cg-text' }, 'Compras'),
          h(
            'p',
            { className: 'text-sm text-cg-text-muted mt-1' },
            'Lo que le comprás a tus proveedores. En efectivo, sale de la caja.'
          )
        ),
        h(
          UI.Button,
          { variant: 'brand', size: 'sm', onClick: openForm } as any,
          h(UI.DynamicIcon, { icon: 'Plus', size: 14 } as any),
          ' Nueva compra'
        )
      ),

      // Lista de compras
      loading
        ? h(UI.LoadingOverlay, { variant: 'skeleton', rows: 5 } as any)
        : error
          ? h(UI.ErrorDisplay, { message: error, onRetry: () => void reload() } as any)
          : rows.length === 0
            ? h(UI.EmptyState, {
                title: 'Sin compras todavía',
                description: 'Registrá tu primera compra a un proveedor.',
                icon: h(UI.DynamicIcon, { icon: 'ShoppingCart', size: 32 } as any),
              } as any)
            : h(
                'div',
                { className: 'flex flex-col gap-2' },
                ...rows.map((p: PurchaseRow) =>
                  h(
                    'div',
                    {
                      key: p.id,
                      className:
                        'bg-cg-bg rounded-xl border border-cg-border px-4 py-3 shadow-sm flex items-center justify-between gap-3',
                    },
                    h(
                      'div',
                      { className: 'min-w-0 flex flex-col gap-1' },
                      h('div', { className: 'text-sm font-semibold text-cg-text' }, p.supplierName),
                      h(
                        'div',
                        { className: 'flex items-center gap-2 text-xs text-cg-text-muted' },
                        formatDate(p.purchaseDate),
                        h(
                          UI.Badge,
                          { variant: 'secondary' } as any,
                          PAYMENT_METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod
                        )
                      )
                    ),
                    h(
                      'span',
                      { className: 'font-mono font-semibold text-cg-text' },
                      formatMoney(p.total)
                    )
                  )
                )
              ),

      // FormDialog — Nueva compra
      h(
        UI.FormDialog,
        {
          open,
          onOpenChange: (v: boolean) => setOpen(v),
          title: 'Nueva compra',
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
                'Registrar compra'
              )
            )
          ),
        } as any,
        h(
          'div',
          { className: 'flex flex-col gap-4' },

          // Proveedor + medio de pago
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
                ...suppliers.map((s) => h(UI.SelectItem, { key: s.id, value: s.id } as any, s.name))
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

          // Ítems
          h(
            'div',
            { className: 'flex flex-col gap-2' },
            h('label', { className: 'block text-xs font-semibold text-cg-text-muted' }, 'Ítems'),
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

          // Nota
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

          // Aviso: efectivo → egreso de caja
          paymentMethod === 'efectivo' &&
            total > 0 &&
            h(
              'div',
              {
                className:
                  'text-xs text-cg-text-muted bg-cg-bg-secondary rounded-lg px-3 py-2 border border-cg-border',
              },
              `Al ser en efectivo, se registra un egreso de ${formatMoney(total)} en la caja.`
            )
        )
      )
    )
  );
}
