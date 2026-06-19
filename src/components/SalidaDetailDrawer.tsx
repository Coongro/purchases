import { getHostReact, actions } from '@coongro/plugin-sdk';

import { fmt, MEDIO_BY_ID } from '../data/salidasUi.js';

import { SalidasIcon as Icon } from './SalidasIcon.js';

const React = getHostReact();
const { useState, useEffect, useCallback } = React;
const h = React.createElement;

interface AccountLine {
  description: string;
  quantity: string;
  unit_price: string;
  subtotal: string;
  source_ref: string | null;
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

/** Form de pago inline — espejo de PagoForm del diseño (monto + quick + medios). */
function PagoForm(props: {
  saldo: number;
  onCancel: () => void;
  onConfirm: (monto: number, medio: string) => void;
  busy: boolean;
}) {
  const { saldo, onCancel, onConfirm, busy } = props;
  const [n, setN] = useState<number>(saldo);
  const [medio, setMedio] = useState('efectivo');
  const exceeds = n > saldo;
  const onInput = (e: { target: { value: string } }) => {
    const digits = e.target.value.replace(/[^\d]/g, '');
    setN(digits ? parseInt(digits, 10) : 0);
  };
  return h(
    'div',
    { className: 'sa-pago-form' },
    h(
      'div',
      { className: 'sa-form-eyebrow' },
      h(Icon, { name: 'out', size: 14 }),
      h('span', null, 'Registrar pago')
    ),
    h('label', { className: 'label', style: { marginBottom: 7 } }, 'Cuánto pagás'),
    h(
      'div',
      { style: { position: 'relative' } },
      h('span', { className: 'sa-amt-prefix' }, '$'),
      h('input', {
        className: `input sa-amt-input ${exceeds ? 'error' : ''}`,
        value: n ? n.toLocaleString('es-AR') : '',
        inputMode: 'numeric',
        onChange: onInput,
        placeholder: '0',
        autoFocus: true,
      })
    ),
    h(
      'div',
      { className: 'sa-quick' },
      h(
        'button',
        { className: n === saldo ? 'on' : '', onClick: () => setN(saldo) },
        'Saldo completo'
      ),
      h(
        'button',
        {
          className: n === Math.round(saldo / 2) ? 'on' : '',
          onClick: () => setN(Math.round(saldo / 2)),
        },
        'Mitad'
      ),
      h(
        'span',
        {
          style: {
            marginLeft: 'auto',
            fontSize: 11.5,
            color: exceeds ? 'var(--red-dk)' : 'var(--neutral-500)',
          },
        },
        exceeds ? 'Supera el saldo' : `Saldo ${fmt(saldo)}`
      )
    ),
    h('label', { className: 'label', style: { margin: '16px 0 7px' } }, 'Con qué'),
    h(
      'div',
      { className: 'sa-medios-form' },
      ...['efectivo', 'transferencia', 'debito', 'credito'].map((id) =>
        h(
          'button',
          {
            key: id,
            className: `sa-medio-form ${medio === id ? 'sel' : ''}`,
            onClick: () => setMedio(id),
          },
          h(Icon, { name: MEDIO_BY_ID[id].icon, size: 16 }),
          h('span', null, MEDIO_BY_ID[id].label)
        )
      )
    ),
    h(
      'div',
      { style: { display: 'flex', gap: 8, marginTop: 18 } },
      h(
        'button',
        {
          className: 'btn btn-secondary btn-lg',
          style: { flex: 1 },
          disabled: busy,
          onClick: onCancel,
        },
        'Cancelar'
      ),
      h(
        'button',
        {
          className: 'btn btn-dark btn-lg',
          style: { flex: 1.5 },
          disabled: busy || !(n > 0),
          onClick: () => onConfirm(n, medio),
        },
        h(Icon, { name: 'check', size: 15 }),
        ` Pagar ${n > 0 ? fmt(n) : ''}`
      )
    )
  );
}

/**
 * Detalle de una salida (cuenta por pagar de billing) — markup portado 1:1 de
 * detalle-drawer.jsx. Total/pagado/saldo + pagos + acción "Pagar" (saldar las a-pagar),
 * sobre el ledger payable (billing.accounts.getWithLines + billing.payments.record).
 */
export function SalidaDetailDrawer(props: {
  accountId: string | null;
  concept?: string;
  kind?: 'compra' | 'gasto';
  date?: string;
  paymentMethod?: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { accountId, concept, kind, date, paymentMethod, onClose, onChanged } = props;
  const [detail, setDetail] = useState<SalidaDetail | null>(null);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!accountId) return;
    try {
      const d = await actions.execute<SalidaDetail>('billing.accounts.getWithLines', {
        id: accountId,
      });
      setDetail(d ?? null);
    } catch {
      setDetail(null);
    }
  }, [accountId]);

  useEffect(() => {
    setPaying(false);
    if (accountId) void load();
    else setDetail(null);
  }, [accountId, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!accountId) return null;

  const total = Number(detail?.total) || 0;
  const paid = Number(detail?.paid) || 0;
  const balance = Number(detail?.balance) || 0;
  const isCompra = (kind ?? detail?.account.source) === 'compra';
  const pagada = !!detail && (detail.paymentStatus === 'paid' || balance <= 0.005);
  const headIcon = isCompra ? 'truck' : 'tag';
  const medio = paymentMethod ? MEDIO_BY_ID[paymentMethod] : null;
  const fechaFmt = date ? new Date(date).toLocaleDateString('es-AR') : null;

  const confirmPay = async (monto: number, mPay: string) => {
    if (monto <= 0 || !accountId) return;
    setBusy(true);
    try {
      await actions.execute('billing.payments.record', {
        accountId,
        amount: String(monto),
        method: mPay,
      });
      setPaying(false);
      await load();
      onChanged();
    } catch {
      /* el caller refresca igual */
    } finally {
      setBusy(false);
    }
  };

  return h(
    'div',
    { className: 'sal' },
    h('div', { className: 'sa-scrim', onClick: onClose }),
    h(
      'aside',
      { className: 'sa-drawer', role: 'dialog', 'aria-label': 'Detalle de la salida' },

      // ── Header ──
      h(
        'div',
        { className: 'sa-drawer-head' },
        h(
          'div',
          { className: 'sa-head-top' },
          h('div', { className: 't-eyebrow', style: { color: 'var(--gold-deep)' } }, 'SALIDA'),
          h(
            'button',
            { className: 'sa-iconbtn', onClick: onClose, title: 'Cerrar' },
            h(Icon, { name: 'x', size: 16 })
          )
        ),
        h(
          'div',
          { className: 'sa-ctx' },
          h('div', { className: 'sa-ctx-ic' }, h(Icon, { name: headIcon, size: 20 })),
          h(
            'div',
            { style: { minWidth: 0 } },
            h('h2', { className: 'sa-ctx-title' }, concept ?? 'Salida'),
            h(
              'div',
              { className: 'sa-ctx-meta' },
              h(
                'span',
                { className: `badge ${isCompra ? 'badge-neutral' : 'sa-badge-out'} sa-pill` },
                h(Icon, { name: isCompra ? 'truck' : 'tag', size: 12 }),
                isCompra ? 'Compra' : 'Gasto'
              ),
              fechaFmt &&
                h(
                  'span',
                  { className: 'sa-meta-item' },
                  h(Icon, { name: 'cal', size: 13 }),
                  fechaFmt
                ),
              medio &&
                h(
                  'span',
                  { className: 'sa-meta-item' },
                  h(Icon, { name: medio.icon, size: 13 }),
                  medio.label
                )
            )
          )
        )
      ),

      // ── Body ──
      h(
        'div',
        { className: 'sa-drawer-body' },
        !detail
          ? null
          : isCompra
            ? h(
                React.Fragment,
                null,
                h(
                  'div',
                  { className: 'sa-sec-label' },
                  h(
                    'span',
                    { className: 't-section-label', style: { color: 'var(--neutral-500)' } },
                    'Ítems'
                  ),
                  h('span', { className: 'sa-count' }, String(detail.lines.length))
                ),
                h(
                  'div',
                  { className: 'sa-lines' },
                  ...detail.lines.map((l, i) =>
                    h(
                      'div',
                      { key: i, className: 'sa-line' },
                      h('div', { className: 'sa-linechip' }, h(Icon, { name: 'box', size: 16 })),
                      h(
                        'div',
                        { style: { minWidth: 0, flex: 1 } },
                        h('div', { className: 'sa-line-name' }, l.description),
                        h(
                          'div',
                          { className: 'sa-line-meta' },
                          `${Number(l.quantity)} × ${fmt(l.unit_price)}`
                        ),
                        l.source_ref &&
                          h(
                            'div',
                            { className: 'sa-line-lote' },
                            h(Icon, { name: 'info', size: 12 }),
                            ` Lote ${l.source_ref}`
                          )
                      ),
                      h('div', { className: 'sa-line-amt' }, fmt(l.subtotal))
                    )
                  )
                ),
                h(
                  'div',
                  { className: 'sa-stock-note' },
                  h(Icon, { name: 'box', size: 14 }),
                  h(
                    'span',
                    null,
                    'Los lotes de esta compra entran a ',
                    h('strong', null, 'Farmacia'),
                    ' como stock disponible.'
                  )
                )
              )
            : h(
                React.Fragment,
                null,
                h(
                  'div',
                  { className: 'sa-sec-label' },
                  h(
                    'span',
                    { className: 't-section-label', style: { color: 'var(--neutral-500)' } },
                    'Detalle'
                  )
                ),
                h(
                  'div',
                  { className: 'sa-gasto-card' },
                  h(
                    'div',
                    { className: 'sa-gasto-row' },
                    h('span', { className: 'sa-gasto-k' }, 'Concepto'),
                    h('span', { className: 'sa-gasto-v' }, concept ?? 'Gasto')
                  ),
                  detail.account.notes &&
                    h(
                      'div',
                      { className: 'sa-gasto-row' },
                      h('span', { className: 'sa-gasto-k' }, 'Nota'),
                      h('span', { className: 'sa-gasto-v' }, detail.account.notes)
                    )
                )
              )
      ),

      // ── Footer ──
      detail &&
        h(
          'div',
          { className: 'sa-drawer-foot' },
          h(
            'div',
            { className: 'sa-totcard' },
            h(
              'div',
              { className: 'sa-total-row' },
              h('span', { style: { color: 'var(--neutral-700)', fontSize: 13 } }, 'Total'),
              h(
                'span',
                {
                  style: {
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 14,
                    color: 'var(--neutral-950)',
                    fontWeight: 500,
                  },
                },
                fmt(total)
              )
            ),
            paid > 0.005 &&
              h(
                'div',
                { className: 'sa-total-row' },
                h(
                  'span',
                  {
                    style: {
                      color: 'var(--neutral-700)',
                      fontSize: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    },
                  },
                  h('span', { className: 'sa-paid-ic' }, h(Icon, { name: 'check', size: 11 })),
                  ' Pagado'
                ),
                h(
                  'span',
                  {
                    style: {
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: 14,
                      color: 'var(--teal-deep)',
                      fontWeight: 500,
                    },
                  },
                  `− ${fmt(paid)}`
                )
              ),
            h('div', { className: 'sa-total-divider' }),
            pagada
              ? h(
                  'div',
                  { className: 'sa-pagada' },
                  h('span', { className: 'sa-pagada-ic' }, h(Icon, { name: 'check', size: 17 })),
                  h(
                    'div',
                    null,
                    h('div', { className: 'sa-pagada-t' }, 'Pagada'),
                    h(
                      'div',
                      { style: { fontSize: 12, color: 'var(--neutral-500)', marginTop: 4 } },
                      'Salida saldada por completo'
                    )
                  )
                )
              : h(
                  'div',
                  { className: 'sa-saldo-row' },
                  h(
                    'div',
                    null,
                    h(
                      'span',
                      {
                        className: 't-eyebrow',
                        style: { color: 'var(--neutral-500)', display: 'block' },
                      },
                      'SALDO A PAGAR'
                    ),
                    detail.paymentStatus === 'partial' &&
                      h(
                        'span',
                        { style: { fontSize: 11.5, color: 'var(--gold-deep)' } },
                        'Pago parcial registrado'
                      )
                  ),
                  h('span', { className: 'sa-saldo-num' }, fmt(balance))
                )
          ),

          detail.payments.length > 0 &&
            h(
              'div',
              { className: 'sa-pagos' },
              h(
                'div',
                { className: 'sa-sec-label', style: { marginBottom: 10 } },
                h(
                  'span',
                  { className: 't-section-label', style: { color: 'var(--neutral-500)' } },
                  'Pagos'
                ),
                h('span', { className: 'sa-count' }, String(detail.payments.length))
              ),
              h(
                'div',
                { className: 'sa-pago-list' },
                ...detail.payments.map((p) =>
                  h(
                    'div',
                    { key: p.id, className: 'sa-pago-row' },
                    h(
                      'span',
                      { className: 'sa-pago-chip' },
                      h(Icon, {
                        name: (MEDIO_BY_ID[p.method] || MEDIO_BY_ID.efectivo).icon,
                        size: 15,
                      })
                    ),
                    h(
                      'div',
                      { style: { flex: 1, minWidth: 0 } },
                      h(
                        'div',
                        { style: { fontSize: 13, color: 'var(--neutral-950)', fontWeight: 500 } },
                        (MEDIO_BY_ID[p.method] || { label: p.method }).label
                      ),
                      p.paid_at &&
                        h(
                          'div',
                          { style: { fontSize: 11.5, color: 'var(--neutral-500)' } },
                          new Date(p.paid_at).toLocaleDateString('es-AR')
                        )
                    ),
                    h(
                      'span',
                      {
                        style: {
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 13.5,
                          color: 'var(--neutral-950)',
                          fontWeight: 500,
                        },
                      },
                      fmt(p.amount)
                    )
                  )
                )
              )
            ),

          paying
            ? h(PagoForm, {
                saldo: balance,
                busy,
                onCancel: () => setPaying(false),
                onConfirm: (monto: number, mPay: string) => void confirmPay(monto, mPay),
              })
            : h(
                'div',
                { style: { display: 'flex', gap: 8, marginTop: 14 } },
                balance > 0.005 &&
                  h(
                    'button',
                    {
                      className: 'btn btn-dark btn-lg',
                      style: { flex: 1 },
                      onClick: () => setPaying(true),
                    },
                    h(Icon, { name: 'out', size: 15 }),
                    ` Pagar ${fmt(balance)}`
                  ),
                h(
                  'button',
                  {
                    className: 'btn btn-secondary btn-lg',
                    style: { flex: balance > 0.005 ? '0 0 auto' : 1 },
                    onClick: onClose,
                  },
                  'Cerrar'
                )
              )
        )
    )
  );
}
