import { getHostReact, getHostUI, actions } from '@coongro/plugin-sdk';

const UI = getHostUI();
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from '../constants.js';
import { formatMoney } from '../utils/money.js';

const React = getHostReact();
const { useState, useEffect, useCallback } = React;
const h = React.createElement;

const SERIF = 'font-serif font-black tracking-tight';
const SECTION_LABEL = 'text-[11px] font-bold tracking-wider uppercase text-cg-text-muted';

interface AccountLine {
  description: string;
  quantity: string;
  unit_price: string;
  subtotal: string;
}
interface Payment {
  id: string;
  amount: string;
  method: string;
  paid_at: string;
}
interface SalidaDetail {
  account: { id: string; source: string; notes: string | null };
  lines: AccountLine[];
  total: string;
  paid: string;
  balance: string;
  paymentStatus: string;
  payments: Payment[];
}

/**
 * Detalle de una salida (cuenta por pagar de billing) — espejo del checkout de Cobros.
 * Muestra ítems/concepto + total/pagado/saldo + pagos, y permite REGISTRAR UN PAGO (saldar
 * las "a pagar"), igual que "Cobrar". Usa el ledger payable (billing.accounts.getWithLines +
 * billing.payments.record), el mismo motor de Cobros.
 */
export function SalidaDetailDrawer(props: {
  /** id de cuenta a mostrar; null = cerrado. */
  accountId: string | null;
  /** Concepto resuelto (proveedor o gasto) + tipo, del row — para el header. */
  concept?: string;
  kind?: 'compra' | 'gasto';
  onClose: () => void;
  onChanged: () => void;
}) {
  const { accountId, concept, kind, onClose, onChanged } = props;
  const [detail, setDetail] = useState<SalidaDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('efectivo');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const d = await actions.execute<SalidaDetail>('billing.accounts.getWithLines', {
        id: accountId,
      });
      setDetail(d ?? null);
      setPayAmount(d?.balance ?? '');
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    setPaying(false);
    if (accountId) void load();
    else setDetail(null);
  }, [accountId, load]);

  const balance = Number(detail?.balance) || 0;
  const isCompra = (kind ?? detail?.account.source) === 'compra';

  const confirmPay = async () => {
    const amount = Number(payAmount) || 0;
    if (amount <= 0 || !accountId) return;
    setBusy(true);
    try {
      await actions.execute('billing.payments.record', {
        accountId,
        amount: String(amount),
        method: payMethod,
      });
      setPaying(false);
      await load();
      onChanged();
    } catch {
      /* sin feedback duro acá; el caller refresca */
    } finally {
      setBusy(false);
    }
  };

  const estadoFooter = () => {
    if (!detail) return null;
    if (detail.paymentStatus === 'paid' || balance <= 0.005) {
      return h(
        'div',
        { className: 'flex items-center gap-3' },
        h(
          'span',
          {
            className:
              'inline-flex items-center justify-center rounded-full text-cg-green bg-cg-green-bg',
            style: { width: 32, height: 32 },
          },
          h(UI.DynamicIcon, { icon: 'Check', size: 16 } as any)
        ),
        h('span', { className: `${SERIF} text-cg-green`, style: { fontSize: 18 } }, 'Pagada')
      );
    }
    return h(
      'div',
      { className: 'flex items-center justify-between' },
      h('span', { className: SECTION_LABEL }, 'Saldo a pagar'),
      h(
        'span',
        { className: `${SERIF} text-cg-danger`, style: { fontSize: 26 } },
        formatMoney(balance)
      )
    );
  };

  return h(
    UI.Sheet,
    {
      open: accountId !== null,
      onOpenChange: (v: boolean) => !v && onClose(),
      side: 'right',
    } as any,
    h(
      UI.SheetContent,
      {
        style: { width: '480px', maxWidth: '94vw', display: 'flex', flexDirection: 'column' },
      } as any,

      // Header
      h(
        UI.SheetHeader,
        null,
        h('div', { className: `${SECTION_LABEL} mb-1` }, 'SALIDA'),
        h(
          UI.SheetTitle,
          null,
          h(
            'span',
            { className: 'flex items-center gap-2' },
            h(
              'span',
              {
                className:
                  'inline-flex items-center justify-center rounded-lg text-cg-text-muted bg-cg-bg-secondary',
                style: { width: 34, height: 34 },
              },
              h(UI.DynamicIcon, { icon: isCompra ? 'Truck' : 'Tag', size: 17 } as any)
            ),
            h('span', { className: SERIF, style: { fontSize: 19 } }, concept ?? 'Salida')
          )
        )
      ),

      // Body
      h(
        'div',
        { style: { flex: 1, overflowY: 'auto' }, className: 'flex flex-col gap-4 py-4' },
        loading
          ? h(UI.LoadingOverlay, { variant: 'skeleton', rows: 4 } as any)
          : detail
            ? h(
                React.Fragment,
                null,
                // Ítems (compra) o concepto (gasto)
                isCompra && detail.lines.length > 0
                  ? h(
                      'div',
                      { className: 'flex flex-col gap-2' },
                      h('div', { className: SECTION_LABEL }, `Ítems · ${detail.lines.length}`),
                      ...detail.lines.map((l, i) =>
                        h(
                          'div',
                          {
                            key: i,
                            className:
                              'flex items-center justify-between gap-3 border-b border-cg-border-subtle pb-2 last:border-b-0',
                          },
                          h(
                            'div',
                            { className: 'min-w-0' },
                            h(
                              'div',
                              { className: 'text-sm text-cg-text font-medium' },
                              l.description
                            ),
                            h(
                              'div',
                              { className: 'text-xs text-cg-text-muted font-mono' },
                              `${Number(l.quantity)} × ${formatMoney(l.unit_price)}`
                            )
                          ),
                          h(
                            'span',
                            { className: 'font-mono text-cg-text' },
                            formatMoney(l.subtotal)
                          )
                        )
                      ),
                      isCompra &&
                        h(
                          'div',
                          {
                            className:
                              'text-xs text-cg-green bg-cg-green-bg rounded-lg px-3 py-2 mt-1',
                          },
                          'Los lotes de esta compra entran a Farmacia como stock disponible.'
                        )
                    )
                  : h(
                      'div',
                      { className: 'text-sm text-cg-text-muted' },
                      detail.account.notes || 'Gasto'
                    )
              )
            : h('div', { className: 'text-sm text-cg-text-muted' }, 'No se pudo cargar el detalle.')
      ),

      // Footer
      detail &&
        h(
          'div',
          { className: 'flex flex-col gap-3 border-t border-cg-border pt-4' },
          // Totales
          h(
            'div',
            { className: 'rounded-xl border border-cg-border p-4 flex flex-col gap-2' },
            h(
              'div',
              { className: 'flex items-center justify-between text-sm' },
              h('span', { className: 'text-cg-text-muted' }, 'Total'),
              h('span', { className: 'font-mono text-cg-text' }, formatMoney(detail.total))
            ),
            Number(detail.paid) > 0.005 &&
              h(
                'div',
                { className: 'flex items-center justify-between text-sm' },
                h('span', { className: 'text-cg-text-muted' }, 'Pagado'),
                h('span', { className: 'font-mono text-cg-green' }, `− ${formatMoney(detail.paid)}`)
              ),
            h('div', { className: 'border-t border-cg-border my-1' }),
            estadoFooter()
          ),

          // Pagos registrados
          detail.payments.length > 0 &&
            h(
              'div',
              { className: 'flex flex-col gap-1.5' },
              h('div', { className: SECTION_LABEL }, `Pagos · ${detail.payments.length}`),
              ...detail.payments.map((p) =>
                h(
                  'div',
                  { key: p.id, className: 'flex items-center justify-between text-sm' },
                  h(
                    'span',
                    { className: 'text-cg-text-muted' },
                    PAYMENT_METHOD_LABEL[p.method] ?? p.method
                  ),
                  h('span', { className: 'font-mono text-cg-text' }, formatMoney(p.amount))
                )
              )
            ),

          // Acción / form de pago
          paying
            ? h(
                'div',
                {
                  className:
                    'flex flex-col gap-2 rounded-xl border border-cg-gold p-3 bg-cg-gold-soft',
                },
                h(
                  'label',
                  { className: 'block text-xs font-semibold text-cg-text-muted' },
                  'Cuánto pagás'
                ),
                h(UI.Input, {
                  type: 'number',
                  min: 0,
                  value: payAmount,
                  onChange: (e: any) => setPayAmount(e.target.value),
                  autoFocus: true,
                } as any),
                h(
                  'label',
                  { className: 'block text-xs font-semibold text-cg-text-muted mt-1' },
                  'Con qué'
                ),
                h(UI.SegmentedControl, {
                  value: payMethod,
                  options: PAYMENT_METHODS,
                  onChange: (v: string) => setPayMethod(v),
                  size: 'sm',
                  'aria-label': 'Medio de pago',
                } as any),
                h(
                  'div',
                  { className: 'flex gap-2 mt-1' },
                  h(
                    UI.Button,
                    {
                      variant: 'ghost',
                      size: 'sm',
                      disabled: busy,
                      onClick: () => setPaying(false),
                    } as any,
                    'Cancelar'
                  ),
                  h(
                    UI.Button,
                    {
                      variant: 'brand',
                      size: 'sm',
                      disabled: busy || (Number(payAmount) || 0) <= 0,
                      onClick: () => void confirmPay(),
                      className: 'flex-1',
                    } as any,
                    `Pagar ${(Number(payAmount) || 0) > 0 ? formatMoney(Number(payAmount)) : ''}`
                  )
                )
              )
            : h(
                'div',
                { className: 'flex gap-2' },
                balance > 0.005 &&
                  h(
                    UI.Button,
                    {
                      variant: 'brand',
                      size: 'sm',
                      onClick: () => setPaying(true),
                      className: 'flex-1',
                    } as any,
                    h(UI.DynamicIcon, { icon: 'ArrowUpFromLine', size: 14 } as any),
                    ` Pagar ${formatMoney(balance)}`
                  ),
                h(
                  UI.Button,
                  {
                    variant: 'outline',
                    size: 'sm',
                    onClick: onClose,
                    className: balance > 0.005 ? '' : 'flex-1',
                  } as any,
                  'Cerrar'
                )
              )
        )
    )
  );
}
