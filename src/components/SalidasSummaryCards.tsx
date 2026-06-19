import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import { formatMoney } from '../utils/money.js';
import { useMinWidth } from '../utils/responsive.js';

const UI = getHostUI();
const React = getHostReact();
const h = React.createElement;

/** Métricas del rango, calculadas en la vista desde las cuentas por pagar. */
export interface SalidasMetrics {
  aPagar: number;
  nApagar: number;
  pagado: number;
  nSalidas: number;
}

export type EstadoFilter = 'todas' | 'apagar' | 'pagadas';

interface CardDef {
  key: EstadoFilter;
  label: string;
  icon: string;
  fg: string;
  bg: string;
  value: (m: SalidasMetrics) => string;
  sub: (m: SalidasMetrics) => string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const CARDS: CardDef[] = [
  {
    key: 'apagar',
    label: 'A PAGAR',
    icon: 'AlertCircle',
    fg: 'text-cg-gold-deep',
    bg: 'bg-cg-gold-soft',
    value: (m) => formatMoney(m.aPagar),
    sub: (m) => plural(m.nApagar, 'salida pendiente', 'salidas pendientes'),
  },
  {
    key: 'pagadas',
    label: 'PAGADO',
    icon: 'CheckCircle2',
    fg: 'text-cg-green',
    bg: 'bg-cg-green-bg',
    value: (m) => formatMoney(m.pagado),
    sub: () => 'salido (pagado)',
  },
  {
    key: 'todas',
    label: 'SALIDAS',
    icon: 'ArrowUpFromLine',
    fg: 'text-cg-text-muted',
    bg: 'bg-cg-bg-secondary',
    value: (m) => String(m.nSalidas),
    sub: () => 'en este rango',
  },
];

/**
 * Tarjetas-resumen de Salidas (diseño aprobado, mismo lenguaje que Cobros/Cuentas):
 * atajos de filtro por estado. A PAGAR y PAGADO ahora son reales — vienen del ledger
 * payable de billing (saldo vs pagado). Grilla en JS (ver utils/responsive).
 */
export function SalidasSummaryCards(props: {
  metrics: SalidasMetrics;
  loading: boolean;
  estadoFilter: EstadoFilter;
  onFilter: (f: EstadoFilter) => void;
}) {
  const { metrics, loading, estadoFilter, onFilter } = props;
  const wide = useMinWidth(720);
  const cols = wide ? 3 : 1;

  return h(
    'div',
    { style: { display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 14 } },
    ...CARDS.map((c) => {
      const active = c.key !== 'todas' && estadoFilter === c.key;
      return h(
        'button',
        {
          key: c.key,
          type: 'button',
          onClick: () => onFilter(active ? 'todas' : c.key),
          className: [
            'flex flex-col text-left rounded-xl bg-cg-bg shadow-sm transition-colors',
            'hover:bg-cg-bg-hover',
            active ? 'border-2 border-cg-accent' : 'border border-cg-border',
          ].join(' '),
          style: { padding: active ? 15 : 16 },
        },
        h(
          'div',
          { className: 'flex items-center gap-2.5' },
          h(
            'span',
            {
              className: `inline-flex items-center justify-center rounded-lg ${c.fg} ${c.bg}`,
              style: { width: 34, height: 34 },
            },
            h(UI.DynamicIcon, { icon: c.icon, size: 17 } as any)
          ),
          h(
            'span',
            { className: 'text-[11px] font-semibold tracking-wide text-cg-text-muted' },
            c.label
          )
        ),
        h(
          'div',
          { className: 'text-2xl font-bold text-cg-text font-mono mt-2' },
          loading ? ' ' : c.value(metrics)
        ),
        h('div', { className: 'text-xs text-cg-text-muted mt-0.5' }, loading ? ' ' : c.sub(metrics))
      );
    })
  );
}
