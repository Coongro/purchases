/**
 * Proveedores — composición y render (generado por el Builder de Vistas).
 *
 * ⚠️ ARCHIVO REGENERABLE: se reescribe al guardar el diseño en el Builder.
 * La lógica custom va en `handlers.ts` (nunca se pisa). Diseño: `spec.json`.
 */
import { useAccess, useIsMobile, views } from '@coongro/plugin-sdk';
import * as UI from '@coongro/ui-components';
import { createElement as h, useLayoutEffect, useState } from 'react';

import { useProveedoresView } from './use-proveedores.js';

/** Ancho real del contenido de una caja (sin su padding): lo que decide el layout, no la ventana. */
function useLayoutWidth(): [(el: HTMLDivElement | null) => void, number, HTMLDivElement | null] {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!box) return undefined;
    const read = () => {
      const cs = getComputedStyle(box);
      setWidth(
        Math.round(
          box.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
        )
      );
    };
    read();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(box);
    return () => ro.disconnect();
  }, [box]);
  return [setBox, width, box];
}

/** El ancho medido para los componentes del Core (si la versión instalada lo admite). */
const LayoutWidthProvider = (
  UI as unknown as {
    LayoutWidthProvider?: (props: {
      width: number;
      children?: unknown;
    }) => ReturnType<typeof h> | null;
  }
).LayoutWidthProvider;

function withLayoutWidth(width: number, node: ReturnType<typeof h>) {
  return LayoutWidthProvider && width > 0 ? h(LayoutWidthProvider, { width }, node) : node;
}

/** El Core dibuja el menú «⋯» de las acciones en las filas del celular (si no, va el pie de respaldo). */
const HOST_STACK_ACTIONS = Boolean(
  (UI as unknown as { DATA_TABLE_STACK_ACTIONS?: boolean }).DATA_TABLE_STACK_ACTIONS
);

export function ProveedoresView() {
  const access = useAccess();
  const isMobile = useIsMobile();
  const [layoutBox, layoutWidth] = useLayoutWidth();
  const { t1 } = useProveedoresView();

  // ── tabla 1 — purchases.suppliers: render propio sobre su estado t1 ──
  const renderTable1 = (() => {
    const {
      loading,
      loadError,
      load,
      visibleRows,
      COLUMNS,
      removeRow,
      sort,
      onSortChange,
      cellValue,
      clearFilters,
      search,
      setSearch,
      filters,
      setFilters,
      filterCounts,
      page,
      setPage,
      pagedRows,
    } = t1;
    const cellText = (row: any, c: any) => {
      const v = cellValue(row, c);
      return v === null || v === undefined
        ? ''
        : typeof v === 'object'
          ? JSON.stringify(v)
          : String(v);
    };
    const TONE_VARIANT: Record<string, string> = {
      neutral: 'neutral-soft',
      success: 'success-soft',
      warning: 'warning-soft',
      danger: 'danger-soft',
      outline: 'outline',
    };
    const enumVal = (c: any, raw: string) => (c.values ?? []).find((e: any) => e.value === raw);
    const formatDate = (fmt: string, raw: string) => {
      const s = String(raw ?? '');
      const only = (fmt === 'date' ? /^(\d{4})-(\d{2})-(\d{2})/ : /^(\d{4})-(\d{2})-(\d{2})$/).exec(
        s
      );
      if (only) return only[3] + '/' + only[2] + '/' + only[1];
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      const p = (n: number) => String(n).padStart(2, '0');
      const dmy = p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
      const hm = p(d.getHours()) + ':' + p(d.getMinutes());
      return fmt === 'datetime' ? dmy + ' ' + hm : fmt === 'time' ? hm : dmy;
    };
    const relativeDay = (fmt: string, raw: string) => {
      const s = String(raw ?? '');
      const only = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
      const d =
        fmt === 'date' && only
          ? new Date(Number(only[1]), Number(only[2]) - 1, Number(only[3]))
          : new Date(s);
      if (isNaN(d.getTime())) return null;
      const t = new Date();
      const n = Math.round(
        (new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() -
          new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
          864e5
      );
      const a = Math.abs(n);
      const unit =
        a < 31
          ? a === 1
            ? '1 día'
            : a + ' días'
          : a < 365
            ? Math.round(a / 30) === 1
              ? '1 mes'
              : Math.round(a / 30) + ' meses'
            : Math.round(a / 365) === 1
              ? '1 año'
              : Math.round(a / 365) + ' años';
      return n === 0
        ? 'Hoy'
        : n === 1
          ? 'Ayer'
          : n === -1
            ? 'Mañana'
            : n > 0
              ? 'Hace ' + unit
              : 'En ' + unit;
    };
    const renderCell = (row: any, c: any, sub?: any) => {
      const raw = cellText(row, c);
      if (raw === '' && c.emptyLabel) {
        return h(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--cg-text-muted)',
            },
          },
          c.emptyIcon ? h(UI.DynamicIcon, { icon: c.emptyIcon, size: 15 }) : null,
          c.emptyLabel
        );
      }
      const ev = enumVal(c, raw);
      const label = c.format ? formatDate(c.format, raw) : (ev?.label ?? raw);
      const shown = raw !== '' ? (c.prefix ?? '') + label + (c.suffix ?? '') : label;
      if (c.display === 'avatar') {
        // sin nombre no hay a quién dibujar: nada (o el emptyLabel, más arriba), no un «?»
        if (String(raw).trim() === '') return '';
        const words = String(raw)
          .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
          .split(/\s+/)
          .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
          .filter(Boolean);
        const initial = (
          words.length === 1
            ? (words[0] ?? '').slice(0, 2)
            : (words[0]?.charAt(0) ?? '') + (words[words.length - 1]?.charAt(0) ?? '')
        ).toUpperCase();
        const pairs = [
          ['var(--cg-sky-soft)', 'var(--cg-sky-deep)'],
          ['var(--cg-pink-soft)', 'var(--cg-pink-deep)'],
          ['var(--cg-gold-soft)', 'var(--cg-text)'],
          ['var(--cg-bg-secondary)', 'var(--cg-text-secondary)'],
        ];
        const seed = String(raw);
        let hsh = 0;
        for (let i = 0; i < seed.length; i++) hsh = (hsh * 31 + seed.charCodeAt(i)) >>> 0;
        const pair = pairs.find((_p, pi) => pi === hsh % pairs.length);
        return h(
          'span',
          {
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
              maxWidth: '100%',
            },
          },
          h(
            'span',
            {
              'aria-hidden': true,
              style: {
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: pair?.[0],
                color: pair?.[1],
                fontWeight: 600,
                fontSize: '11px',
              },
            },
            initial
          ),
          sub === undefined
            ? h(
                'span',
                {
                  style: {
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                  },
                },
                shown
              )
            : h(
                'span',
                {
                  style: {
                    display: 'flex',
                    flexDirection: 'column' as const,
                    gap: '1px',
                    minWidth: 0,
                  },
                },
                h(
                  'span',
                  {
                    style: {
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    },
                  },
                  shown
                ),
                h(
                  'span',
                  {
                    style: {
                      fontSize: '12px',
                      color: 'var(--cg-text-muted)',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    },
                  },
                  sub
                )
              )
        );
      }
      if (c.display === 'swatch') {
        const tones: Record<string, string> = {
          neutral: 'var(--cg-text-tertiary)',
          gray: 'var(--cg-text-tertiary)',
          grey: 'var(--cg-text-tertiary)',
          red: 'var(--cg-danger)',
          danger: 'var(--cg-danger)',
          orange: 'var(--cg-orange)',
          yellow: 'var(--cg-gold)',
          gold: 'var(--cg-gold)',
          warning: 'var(--cg-gold)',
          green: 'var(--cg-teal-dk)',
          success: 'var(--cg-success)',
          teal: 'var(--cg-success)',
          turquoise: 'var(--cg-sky-dk)',
          sky: 'var(--cg-sky)',
          info: 'var(--cg-info)',
          blue: 'var(--cg-sky-deep)',
          purple: 'var(--cg-purple)',
          pink: 'var(--cg-pink-dk)',
        };
        const key = String(raw).trim();
        const color = /^#[0-9a-fA-F]{3,8}$/.test(key)
          ? key
          : (tones[key.toLowerCase()] ?? 'var(--cg-bg-secondary)');
        return h(
          'span',
          { style: { display: 'inline-flex', alignItems: 'center', gap: '8px' } },
          h('span', {
            'aria-hidden': true,
            style: {
              width: '14px',
              height: '14px',
              borderRadius: '4px',
              flexShrink: 0,
              background: color,
              border: '1px solid var(--cg-border)',
            },
          }),
          shown
        );
      }
      if ((c.format === 'date' || c.format === 'datetime') && !c.display && raw !== '') {
        const rel = relativeDay(c.format, raw);
        return c.dateDisplay === 'relative'
          ? h('span', { title: shown }, rel ?? shown)
          : h(
              'span',
              {
                title: rel ?? undefined,
                style: {
                  fontFamily: 'var(--cg-font-mono)',
                  fontSize: '12.5px',
                  fontVariantNumeric: 'tabular-nums',
                },
              },
              shown
            );
      }
      const iconName = ev?.icon;
      const icon = iconName ? h(UI.DynamicIcon, { icon: iconName, size: 16 }) : null;
      if (c.display === 'pill') {
        return label
          ? h(
              UI.Badge,
              {
                variant: TONE_VARIANT[ev?.tone ?? c.tone ?? 'neutral'] ?? 'neutral-soft',
                size: 'compact',
                icon,
              },
              label
            )
          : '';
      }
      if (c.display === 'progress') {
        const n = Math.max(0, Math.min(100, Number(cellValue(row, c)) || 0));
        return h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: '90px' } },
          h(
            'div',
            {
              style: {
                flex: '1 1 0',
                height: '6px',
                borderRadius: '999px',
                background: 'var(--cg-bg-secondary)',
                overflow: 'hidden',
              },
            },
            h('div', {
              style: {
                width: n + '%',
                height: '100%',
                borderRadius: '999px',
                background: 'var(--cg-gold)',
              },
            })
          ),
          h(
            'span',
            { style: { fontSize: '12px', color: 'var(--cg-text-muted)' } },
            Math.round(n) + '%'
          )
        );
      }
      if (c.display === 'mono')
        return h(
          'span',
          {
            style: {
              fontFamily: 'var(--cg-font-mono)',
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
              fontSize: '12px',
            },
          },
          shown
        );
      if (c.format === 'money')
        return h(
          'span',
          {
            style: {
              fontFamily: 'var(--cg-font-mono)',
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap' as const,
            },
          },
          shown
        );
      return icon
        ? h(
            'span',
            { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
            icon,
            shown
          )
        : shown;
    };
    const LOGIC_VALUES: Record<string, { value: string; label?: string }[]> = {};
    const valueLabel = (key: string, raw: string) =>
      (COLUMNS.find((c) => c.key === key)?.values ?? LOGIC_VALUES[key] ?? []).find(
        (v: any) => v.value === raw
      )?.label ?? raw;
    const ROW_ACTIONS = [
      {
        label: 'Eliminar',
        variant: 'destructive' as const,
        onClick: (row: any) => {
          void removeRow(row);
        },
        hidden: () => !access.canRun('purchases.suppliers.delete'),
      },
    ];
    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const renderTable = () =>
      h(
        'div',
        {
          style: {
            background: 'var(--cg-card)',
            boxShadow: 'var(--shadow-card)',
            borderRadius: '18px',
            overflow: 'hidden',
          },
        },
        h(UI.DataTable, {
          countLabel: (n: number) => (n === 1 ? '1 resultado' : n + ' ' + 'resultados'),
          inset: true,
          data: pagedRows,
          rowKey: (row: any) => String(row.id ?? JSON.stringify(row)),
          loading,
          error: loadError,
          onRetry: () => {
            void load();
          },
          columns: COLUMNS.map((c, ci) => ({
            key: c.key,
            header: c.label,
            hideBelow: c.pinned
              ? undefined
              : ci >= 7
                ? ('2xl' as const)
                : ci >= 5
                  ? ('xl' as const)
                  : ci === 4
                    ? ('lg' as const)
                    : ci === 3
                      ? ('md' as const)
                      : ci === 2
                        ? ('sm' as const)
                        : undefined,
            sortable: true,
            render: (row: any) => renderCell(row, c),
          })),
          searchPlaceholder: 'Buscar…',
          searchValue: search,
          onSearchChange: setSearch,
          filterSections: [
            {
              label: 'Estado',
              options: [
                { value: '', label: 'Todos' },
                ...[
                  {
                    value: 'Activo',
                    label: valueLabel('is_active', 'Activo'),
                    count: filterCounts['is_active']?.['Activo'],
                  },
                  {
                    value: 'Inactivo',
                    label: valueLabel('is_active', 'Inactivo'),
                    count: filterCounts['is_active']?.['Inactivo'],
                  },
                ],
              ],
              value: filters['is_active'] ?? '',
              onChange: (v: string) => setFilters((ff: any) => ({ ...ff, ['is_active']: v })),
            },
          ].filter((s) => s.options.length > 1),
          sortKey: sort?.k ?? null,
          sortDirection: sort ? (sort.d > 0 ? 'asc' : 'desc') : null,
          onSortChange,
          pagination: { page, pageSize: 20, total: visibleRows.length },
          onPageChange: setPage,
          onRowClick: access.canOpen('purchases.nuevo-proveedor.open')
            ? (row: any) => {
                void views.open(
                  'purchases.nuevo-proveedor.open',
                  { record: row },
                  { mode: 'dialog' }
                );
              }
            : undefined,
          actions: ROW_ACTIONS,
          mobileRender: (row: any) => {
            return h(
              'div',
              {
                style: {
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: '6px',
                  minWidth: 0,
                },
              },
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexWrap: 'wrap' as const,
                    alignItems: 'center',
                    gap: '6px 12px',
                    minWidth: 0,
                  },
                },
                h(
                  'div',
                  {
                    style: {
                      minWidth: 0,
                      flex: '1 1 55%',
                      display: 'flex',
                      flexDirection: 'column' as const,
                      gap: '2px',
                    },
                  },
                  h(
                    'div',
                    { style: { fontSize: '14px', fontWeight: 600, color: 'var(--cg-text)' } },
                    renderCell(row, COLUMNS[0])
                  ),
                  COLUMNS.length > 1
                    ? h(
                        'div',
                        {
                          style: {
                            fontSize: '12.5px',
                            color: 'var(--cg-text-muted)',
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' as const,
                          },
                        },
                        renderCell(row, COLUMNS[1])
                      )
                    : null
                ),
                h(
                  'div',
                  {
                    style: {
                      flex: '0 0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '12.5px',
                      whiteSpace: 'nowrap' as const,
                    },
                  },
                  renderCell(row, COLUMNS[4])
                )
              ),
              HOST_STACK_ACTIONS ||
                (access.canOpen('purchases.nuevo-proveedor.open')
                  ? (row: any) => {
                      void views.open(
                        'purchases.nuevo-proveedor.open',
                        { record: row },
                        { mode: 'dialog' }
                      );
                    }
                  : undefined)
                ? null
                : h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        gap: '4px',
                        justifyContent: 'flex-end',
                        borderTop: '1px solid var(--cg-border-light)',
                        paddingTop: '8px',
                        marginTop: '2px',
                      },
                    },
                    ...ROW_ACTIONS.filter((a2: any) => !a2.hidden?.(row)).map((a2: any) =>
                      h(
                        UI.Button,
                        {
                          key: a2.label,
                          size: 'sm' as const,
                          variant:
                            a2.variant === 'destructive'
                              ? ('destructive' as const)
                              : ('ghost' as const),
                          onClick: (e: any) => {
                            e.stopPropagation();
                            a2.onClick(row);
                          },
                        },
                        a2.label
                      )
                    )
                  )
            );
          },
          onClearFilters: () => {
            clearFilters();
          },
          emptyState: {
            title: 'Todavía no hay registros',
            description: 'Cargá el primero para empezar.',
            filteredTitle: 'Sin resultados',
            filteredDescription: 'Probá con otros términos o ajustá los filtros.',
          },
        })
      );
    return renderTable;
  })();

  return h(
    'div',
    {
      style: {
        minHeight: '100%',
        backgroundColor: 'var(--cg-bg-secondary)',
        padding: isMobile ? '16px' : '24px',
      },
    },
    withLayoutWidth(
      layoutWidth,
      h(
        'div',
        {
          ref: layoutBox,
          style: {
            width: '100%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '18px',
          },
        },
        h(
          'div',
          { 'data-cg-block-id': 'hdr', style: { display: 'contents' } },
          h(UI.PageHeader, {
            title: 'Proveedores',
            subtitle: 'A quién le comprás. Se reutilizan en cada compra.',
            action: access.canOpen('purchases.nuevo-proveedor.open')
              ? h(
                  UI.Button,
                  {
                    variant: 'default',
                    onClick: () => {
                      void views.open('purchases.nuevo-proveedor.open', undefined, {
                        mode: 'dialog',
                      });
                    },
                  },
                  'Nuevo proveedor'
                )
              : null,
          })
        ),
        h('div', { 'data-cg-block-id': 'tabla', style: { display: 'contents' } }, renderTable1())
      )
    ),
    h(UI.ConfirmDialog, {
      open: !!t1.pendingDelete,
      onOpenChange: (o: boolean) => {
        if (!o) t1.cancelDelete();
      },
      title:
        (t1.pendingDelete?.ids?.length ?? 1) > 1
          ? 'Eliminar ' + (t1.pendingDelete?.ids?.length ?? 1) + ' registros'
          : 'Eliminar registro',
      description:
        (t1.pendingDelete?.ids?.length ?? 1) > 1
          ? '¿Seguro que querés eliminar estos ' +
            (t1.pendingDelete?.ids?.length ?? 1) +
            ' registros? No se puede deshacer.'
          : '¿Seguro que querés eliminar este registro? No se puede deshacer.',
      confirmLabel: 'Eliminar',
      loading: t1.deleting,
      onConfirm: () => {
        void t1.confirmDelete();
      },
    })
  );
}
