import { getHostReact } from '@coongro/plugin-sdk';

const React = getHostReact();
// createElement con tipado laxo: el set de íconos arma SVGs con children variádicos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const h = React.createElement as (type: any, props?: any, ...children: any[]) => any;

/**
 * Set de íconos del módulo Salidas — portado 1:1 de icons.jsx del diseño (línea fina,
 * shibui). Se usa en vez de DynamicIcon para clavar exactamente los trazos del diseño.
 */
export function SalidasIcon({
  name,
  size = 16,
  stroke = 1.4,
}: {
  name: string;
  size?: number;
  stroke?: number;
}) {
  const P: Record<string, unknown> = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  const svg = (props: Record<string, unknown>, ...children: unknown[]) =>
    h('svg', { ...P, ...props }, ...children);
  const path = (d: string, extra?: Record<string, unknown>) => h('path', { d, ...extra });
  const circle = (cx: number, cy: number, r: number, extra?: Record<string, unknown>) =>
    h('circle', { cx, cy, r, ...extra });
  const rect = (x: number, y: number, w: number, ht: number, rx: number) =>
    h('rect', { x, y, width: w, height: ht, rx });

  switch (name) {
    /* medios de pago */
    case 'cash':
      return svg(
        {},
        rect(2.5, 6.5, 19, 11, 2),
        circle(12, 12, 2.4),
        path('M6 9.5v.01M18 14.5v.01')
      );
    case 'transfer':
      return svg({}, path('M4 9h13M14 6l3 3-3 3'), path('M20 15H7M10 18l-3-3 3-3'));
    case 'card':
      return svg({}, rect(2.5, 5.5, 19, 13, 2), path('M2.5 9.5h19M6 14.5h4'));
    case 'syringe':
      return svg(
        {},
        path('M17 3l4 4M14 6l4 4M8 12l4 4M5 15l-2 6 6-2 11-11-4-4z'),
        path('M12 9l3 3')
      );
    /* modo / tipo */
    case 'out':
      return svg(
        { strokeWidth: 1.5 },
        path('M12 19V8M7 13l5-5 5 5'),
        path('M5 4h14', { opacity: 0.45 })
      );
    case 'truck':
      return svg(
        {},
        path('M3 7.5h11v8H3z'),
        path('M14 10.5h3.6L21 14v1.5h-7z'),
        circle(7, 17, 1.5),
        circle(17.5, 17, 1.5)
      );
    case 'cashout':
      return svg({}, rect(3, 7.5, 11, 9, 2), path('M15 12h6M18 9l3 3-3 3'));
    case 'box':
      return svg({}, path('M4 8l8-4 8 4v8l-8 4-8-4z'), path('M4 8l8 4 8-4M12 12v8'));
    case 'bolt':
      return svg({}, path('M13 3L5 14h6l-1 7 8-11h-6z'));
    case 'tag':
      return svg(
        {},
        path('M3 11l8-8h7v7l-8 8z'),
        circle(14.3, 6.7, 1.1, { fill: 'currentColor', stroke: 'none' })
      );
    case 'store':
      return svg({}, path('M4 9l1-4h14l1 4M5 9v10h14V9M5 9h14'), path('M9 19v-5h6v5'));
    case 'pill':
      return svg({}, rect(3, 8, 18, 8, 4), path('M12 8v8'));
    /* ui */
    case 'cal':
      return svg({}, rect(3, 5, 18, 16, 1.5), path('M3 10h18M8 3v4M16 3v4'));
    case 'plus':
      return svg({ strokeWidth: 1.7 }, path('M12 5v14M5 12h14'));
    case 'x':
      return svg({ strokeWidth: 1.6 }, path('M6 6l12 12M18 6L6 18'));
    case 'trash':
      return svg({}, path('M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12'));
    case 'clock':
      return svg({}, circle(12, 12, 8.5), path('M12 8v4.2l2.8 1.6'));
    case 'arrow-r':
      return svg({ strokeWidth: 1.6 }, path('M5 12h13M12 6l6 6-6 6'));
    case 'search':
      return svg({}, circle(11, 11, 7), path('M21 21l-4.3-4.3'));
    case 'receipt':
      return svg(
        {},
        path('M6 3h12v18l-2.5-1.4L13 21l-2.5-1.4L8 21l-2-1.4z'),
        path('M9 8h6M9 12h4')
      );
    case 'check':
      return svg({ strokeWidth: 1.7 }, path('M5 12.5l4.5 4.5L19 7'));
    case 'info':
      return svg(
        {},
        circle(12, 12, 8.5),
        path('M12 11v5'),
        circle(12, 8, 0.6, { fill: 'currentColor', stroke: 'none' })
      );
    case 'alert':
      return svg({ strokeWidth: 1.7 }, circle(12, 12, 8.5), path('M12 8v4.5'), path('M12 16h.01'));
    case 'half':
      return svg(
        { strokeWidth: 1.6 },
        circle(12, 12, 8.5),
        path('M12 3.5a8.5 8.5 0 010 17z', { fill: 'currentColor', stroke: 'none' })
      );
    case 'chev-d':
      return svg({ strokeWidth: 1.6 }, path('M6 9l6 6 6-6'));
    case 'wallet':
      return svg(
        {},
        path('M3 7.5A1.5 1.5 0 014.5 6H18a1 1 0 011 1v1.5'),
        rect(3, 7.5, 18, 12, 2),
        circle(17, 13.5, 1.3, { fill: 'currentColor', stroke: 'none' })
      );
    default:
      return null;
  }
}
