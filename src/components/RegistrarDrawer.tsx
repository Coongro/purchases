/* eslint-disable @typescript-eslint/no-explicit-any */
import { DatePicker } from '@coongro/calendar';
import { getHostReact } from '@coongro/plugin-sdk';

import { fmt, MEDIOS, MEDIO_BY_ID, GASTOS, PROD_CATS, PROD_CAT_BY_ID } from '../data/salidasUi.js';

import { SalidasIcon as Icon } from './SalidasIcon.js';

type Bucket = 'med' | 'vacc' | 'insumo';
interface ProductPick {
  id: string;
  name: string;
  purchasePrice: string | null;
  bucket: Bucket;
}

const React = getHostReact();
const { useState, useEffect, useRef } = React;
const h = React.createElement as (type: any, props?: any, ...children: any[]) => any;

type Mode = 'gasto' | 'compra';

interface PickOption {
  id: string | null;
  name: string;
  meta?: string;
  icon?: string;
  price?: number | null;
}
interface CompraItem {
  id: string;
  productId: string | null;
  producto: string;
  bucket: Bucket;
  cant: number;
  costo: number;
  lote: string;
  venc: string;
}

// ── 3 selectores por categoría (solo las que tienen productos) — espejo de CategoryAdder ──
function CategoryAdder(props: {
  products: ProductPick[];
  onAdd: (bucket: Bucket, productId: string | null, name: string, price: number) => void;
}) {
  const { products, onAdd } = props;
  const [open, setOpen] = useState<Bucket | null>(null);
  const [q, setQ] = useState('');
  const wrap = useRef<any>(null);
  const close = () => {
    setOpen(null);
    setQ('');
  };
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: any) => {
      if (wrap.current && !wrap.current.contains(e.target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  // Siempre mostramos las 3 categorías fijas (Med. / Vacunas / Insumos). Aunque el catálogo
  // no tenga productos de una, el usuario igual puede cargar el ítem a mano — antes se ocultaba
  // la pestaña vacía y quedaba sin forma de sumar, p. ej., un medicamento (COONG-254).
  const cats = PROD_CATS;
  const cat = open ? PROD_CAT_BY_ID[open] : null;
  const norm = (s: string) => (s || '').toLowerCase();
  const results = open
    ? products.filter((p) => p.bucket === open && (!q || norm(p.name).includes(norm(q))))
    : [];
  const exact = open
    ? products.some((p) => p.bucket === open && norm(p.name) === norm(q.trim()))
    : false;
  return h(
    'div',
    { className: 'sa-add-wrap', ref: wrap },
    h(
      'div',
      { className: 'sa-add-tabs', style: { gridTemplateColumns: `repeat(${cats.length}, 1fr)` } },
      ...cats.map((c) =>
        h(
          'button',
          {
            key: c.id,
            type: 'button',
            className: `sa-add-tab ${c.id} ${open === c.id ? 'on' : ''}`,
            onClick: () => (open === c.id ? close() : (setOpen(c.id as Bucket), setQ(''))),
          },
          h(Icon, { name: c.icon, size: 15 }),
          ` ${c.label}`,
          h('span', { className: 'pl' }, h(Icon, { name: open === c.id ? 'x' : 'plus', size: 14 }))
        )
      )
    ),
    open &&
      cat &&
      h(
        'div',
        { className: 'sa-menu' },
        h(
          'div',
          { className: 'sa-menu-search' },
          h(
            'span',
            { className: `sa-type ${open}` },
            h(Icon, { name: cat.icon, size: 12 }),
            ` ${cat.tag}`
          ),
          h(Icon, { name: 'search', size: 15 }),
          h('input', {
            value: q,
            placeholder: `Buscar ${cat.noun}…`,
            autoFocus: true,
            onChange: (e: any) => setQ(e.target.value),
          })
        ),
        h(
          'div',
          { className: 'sa-menu-list' },
          ...results.map((p, i) =>
            h(
              'div',
              {
                key: i,
                className: 'sa-result',
                onClick: () => {
                  onAdd(open, p.id, p.name, Number(p.purchasePrice) || 0);
                  close();
                },
              },
              h('span', { className: 'sa-result-ic' }, h(Icon, { name: cat.icon, size: 15 })),
              h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { className: 'nm' }, p.name)),
              Number(p.purchasePrice) > 0 &&
                h('span', { className: 'price' }, fmt(Number(p.purchasePrice)))
            )
          ),
          results.length === 0 &&
            h('div', { className: 'sa-menu-empty' }, 'Nada del catálogo coincide.')
        ),
        q.trim() &&
          !exact &&
          h(
            'div',
            { className: 'sa-menu-foot' },
            h('span', { className: 'lbl' }, `“${q.trim()}” no está en catálogo:`),
            h(
              'button',
              {
                type: 'button',
                className: 'sa-free-chip',
                onClick: () => {
                  onAdd(open, null, q.trim(), 0);
                  close();
                },
              },
              h(Icon, { name: 'plus', size: 12 }),
              ` Cargar ${cat.noun} a mano`
            )
          )
      )
  );
}

export interface SubmitPayload {
  mode: Mode;
  medio: string;
  pagada: boolean;
  gastoCategory: string;
  concept: string;
  amount: number;
  supplierId: string | null;
  supplierName: string;
  total: number;
  items: {
    productId: string | null;
    description: string;
    quantity: number;
    unitCost: number;
    lote: string;
    expiration: string;
  }[];
}

// ── Buscador-menú tipado (proveedor · producto) — formato del diseño, tokens cg-* ──
function SearchMenu(props: {
  value: string;
  placeholder: string;
  icon: string;
  options: PickOption[];
  onPick: (o: PickOption) => void;
  onFree?: (text: string) => void;
  showPrice?: boolean;
  freeNoun?: string;
}) {
  const { value, placeholder, icon, options, onPick, onFree, showPrice, freeNoun } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<any>(null);
  const close = () => {
    setOpen(false);
    setQ('');
  };
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: any) => {
      if (wrap.current && !wrap.current.contains(e.target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const norm = (s: string) => (s || '').toLowerCase();
  const results = options.filter(
    (o) => !q || norm(o.name).includes(norm(q)) || norm(o.meta ?? '').includes(norm(q))
  );
  const exact = options.some((o) => norm(o.name) === norm(q.trim()));
  return h(
    'div',
    { className: `sa-pick ${open ? 'open' : ''}`, ref: wrap },
    h(
      'button',
      { type: 'button', className: 'sa-pick-btn', onClick: () => (open ? close() : setOpen(true)) },
      h('span', { className: 'sa-pick-ic' }, h(Icon, { name: icon, size: 15 })),
      h('span', { className: `nm ${value ? '' : 'ph'}` }, value || placeholder),
      h('span', { className: 'chev' }, h(Icon, { name: 'chev-d', size: 15 }))
    ),
    open &&
      h(
        'div',
        { className: 'sa-menu' },
        h(
          'div',
          { className: 'sa-menu-search' },
          h(Icon, { name: 'search', size: 15 }),
          h('input', {
            value: q,
            placeholder,
            autoFocus: true,
            onChange: (e: any) => setQ(e.target.value),
          })
        ),
        h(
          'div',
          { className: 'sa-menu-list' },
          ...results.map((o, i) =>
            h(
              'div',
              {
                key: i,
                className: 'sa-result',
                onClick: () => {
                  onPick(o);
                  close();
                },
              },
              h('span', { className: 'sa-result-ic' }, h(Icon, { name: o.icon || icon, size: 15 })),
              h(
                'div',
                { style: { minWidth: 0, flex: 1 } },
                h('div', { className: 'nm' }, o.name),
                o.meta && h('div', { className: 'meta' }, o.meta)
              ),
              showPrice &&
                typeof o.price === 'number' &&
                h('span', { className: 'price' }, fmt(o.price))
            )
          ),
          results.length === 0 &&
            h('div', { className: 'sa-menu-empty' }, 'Nada del catálogo coincide.')
        ),
        onFree &&
          q.trim() &&
          !exact &&
          h(
            'div',
            { className: 'sa-menu-foot' },
            h('span', { className: 'lbl' }, `“${q.trim()}” no está en catálogo:`),
            h(
              'button',
              {
                type: 'button',
                className: 'sa-free-chip',
                onClick: () => {
                  onFree(q.trim());
                  close();
                },
              },
              h(Icon, { name: 'plus', size: 12 }),
              ` Cargar ${freeNoun} libre`
            )
          )
      )
  );
}

// ── Una línea de ítem de compra (stepper + lote/venc + cálculo) ──
function ItemRow(props: {
  item: CompraItem;
  onChange: (it: CompraItem) => void;
  onRemove: () => void;
}) {
  const { item, onChange, onRemove } = props;
  const sub = (item.cant || 0) * (item.costo || 0);
  const setCant = (n: number) => onChange({ ...item, cant: Math.max(0, n) });
  return h(
    'div',
    { className: 'sa-item on' },
    h(
      'div',
      { className: 'sa-item-head' },
      h(
        'span',
        { className: `sa-type ${item.bucket}` },
        h(Icon, { name: PROD_CAT_BY_ID[item.bucket]?.icon ?? 'box', size: 12 }),
        ` ${PROD_CAT_BY_ID[item.bucket]?.tag ?? ''}`
      ),
      h('span', { className: 'sa-item-pname' }, item.producto),
      h(
        'button',
        { className: 'sa-item-del', onClick: onRemove, title: 'Quitar ítem' },
        h(Icon, { name: 'trash', size: 14 })
      )
    ),
    h(
      'div',
      { className: 'sa-item-grid two' },
      h(
        'label',
        { className: 'sa-mini' },
        h('span', null, 'Cantidad'),
        h(
          'div',
          { className: 'sa-step' },
          h(
            'button',
            {
              type: 'button',
              onClick: () => setCant((item.cant || 0) - 1),
              disabled: (item.cant || 0) <= 0,
              'aria-label': 'Menos',
            },
            '–'
          ),
          h('input', {
            inputMode: 'numeric',
            value: item.cant ? Number(item.cant).toLocaleString('es-AR') : '0',
            onChange: (e: any) => setCant(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0),
          }),
          h(
            'button',
            { type: 'button', onClick: () => setCant((item.cant || 0) + 1), 'aria-label': 'Más' },
            '+'
          )
        )
      ),
      h(
        'label',
        { className: 'sa-mini' },
        h('span', null, 'Costo unit.'),
        h(
          'div',
          { className: 'sa-num-pre' },
          h('span', null, '$'),
          h('input', {
            className: 'input sa-num',
            inputMode: 'numeric',
            placeholder: '0',
            value: item.costo ? Number(item.costo).toLocaleString('es-AR') : '',
            onChange: (e: any) =>
              onChange({ ...item, costo: parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 }),
          })
        )
      )
    ),
    h(
      'div',
      { className: 'sa-lote-head' },
      h(Icon, { name: 'info', size: 12 }),
      ' Datos del lote',
      h('span', { className: 'sa-lote-opt' }, ' · para el stock de Farmacia')
    ),
    h(
      'div',
      { className: 'sa-item-grid two' },
      h(
        'label',
        { className: 'sa-mini' },
        h('span', null, 'N° de lote'),
        h('input', {
          className: 'input sa-num',
          placeholder: 'L-0000',
          value: item.lote || '',
          onChange: (e: any) => onChange({ ...item, lote: e.target.value }),
        })
      ),
      h(
        'label',
        { className: 'sa-mini' },
        h('span', null, 'Vencimiento'),
        h(DatePicker, {
          value: item.venc || '',
          onChange: (d: string) => onChange({ ...item, venc: d }),
          placeholder: 'Vencimiento',
        })
      )
    ),
    h(
      'div',
      { className: 'sa-item-calc' },
      h(
        'span',
        { className: 'sa-calc-formula' },
        h('strong', null, (item.cant || 0).toLocaleString('es-AR')),
        ' × ',
        h('strong', null, fmt(item.costo || 0))
      ),
      h('span', { className: 'sa-calc-sub' }, fmt(sub))
    )
  );
}

function OptRow(props: {
  options: { id: string; label: string; icon?: string }[];
  value: string;
  onChange: (id: string) => void;
  cols?: number;
  variant?: string;
}) {
  const { options, value, onChange, cols, variant } = props;
  return h(
    'div',
    {
      className: 'sa-opt-grid',
      style: { gridTemplateColumns: `repeat(${cols || options.length}, 1fr)` },
    },
    ...options.map((o) =>
      h(
        'button',
        {
          key: o.id,
          className: `sa-opt sa-opt-${variant || 'tipo'} ${value === o.id ? 'sel' : ''}`,
          onClick: () => onChange(o.id),
        },
        o.icon && h(Icon, { name: o.icon, size: 16 }),
        h('span', null, o.label)
      )
    )
  );
}

function EstadoControl(props: { pagada: boolean; onChange: (v: boolean) => void; modo: Mode }) {
  const { pagada, onChange, modo } = props;
  return h(
    'div',
    { className: 'sa-estado-grid' },
    h(
      'button',
      { className: `sa-estado ${pagada ? 'sel ok' : ''}`, onClick: () => onChange(true) },
      h(Icon, { name: 'check', size: 16 }),
      h('span', null, modo === 'compra' ? 'Ya pagué' : 'Pagada')
    ),
    h(
      'button',
      { className: `sa-estado ${!pagada ? 'sel warn' : ''}`, onClick: () => onChange(false) },
      h(Icon, { name: 'clock', size: 16 }),
      h('span', null, modo === 'compra' ? 'Queda a pagar' : 'A pagar')
    )
  );
}

function Field(props: { label: string; opt?: boolean; req?: boolean; children: any }) {
  return h(
    'div',
    { className: 'sa-fld' },
    h(
      'span',
      { className: 'sa-fld-label' },
      props.label,
      props.req && h('span', { style: { color: 'var(--cg-danger)', fontWeight: 700 } }, ' *'),
      props.opt && h('span', { className: 'sa-opt-tag' }, ' · opcional')
    ),
    props.children
  );
}

/**
 * Drawer "Registrar salida" — formato visual del diseño (proveedor typeahead, picker de
 * producto, item card con stepper + lote/venc, medio/estado, preview) sobre CSS scopeado en
 * `.sal` con tokens cg-* (dark mode + theming del host). Recolecta el form y delega en
 * onSubmit; el caller hace createSalida + toast + reload.
 */
export function RegistrarDrawer(props: {
  onClose: () => void;
  onSubmit: (p: SubmitPayload) => void;
  suppliers: { id: string; name: string }[];
  products: ProductPick[];
  busy: boolean;
  /** Modo inicial del drawer (ej. abrir directo en 'compra' desde un deep-link). Default: 'gasto'. */
  initialMode?: Mode;
}) {
  const { onClose, onSubmit, suppliers, products, busy, initialMode = 'gasto' } = props;
  const [modo, setModo] = useState<Mode>(initialMode);
  const [medio, setMedio] = useState('efectivo');
  const [pagada, setPagada] = useState(true);
  const [nota, setNota] = useState('');
  const [gastoTipo, setGastoTipo] = useState('fijos');
  const [monto, setMonto] = useState('');
  const [prov, setProv] = useState<{ id: string | null; name: string }>({ id: null, name: '' });
  const [items, setItems] = useState<CompraItem[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const montoNum = parseInt(String(monto).replace(/\D/g, ''), 10) || 0;
  const compraTotal = items.reduce((a, it) => a + (it.cant || 0) * (it.costo || 0), 0);
  const total = modo === 'gasto' ? montoNum : compraTotal;
  const validGasto = montoNum > 0 && !!gastoTipo;
  const validCompra =
    !!prov.name.trim() && items.length > 0 && items.every((it) => it.cant > 0 && it.costo > 0);
  const valid = modo === 'gasto' ? validGasto : validCompra;

  const addItem = (bucket: Bucket, productId: string | null, name: string, price: number) =>
    setItems((prev) => [
      ...prev,
      {
        id: `n${Date.now()}${prev.length}`,
        productId,
        producto: name,
        bucket,
        cant: 1,
        costo: price || 0,
        lote: '',
        venc: '',
      },
    ]);
  const updItem = (id: string, next: CompraItem) =>
    setItems((prev) => prev.map((it) => (it.id === id ? next : it)));
  const delItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const submit = () => {
    if (!valid) return;
    onSubmit({
      mode: modo,
      medio,
      pagada,
      gastoCategory: gastoTipo,
      concept: nota.trim(),
      amount: montoNum,
      supplierId: prov.id,
      supplierName: prov.name.trim(),
      total,
      items: items.map((it) => ({
        productId: it.productId,
        description: it.producto,
        quantity: it.cant,
        unitCost: it.costo,
        lote: it.lote,
        expiration: it.venc,
      })),
    });
  };

  const tocaCaja = medio === 'efectivo' && pagada;

  return h(
    'div',
    { className: 'sal' },
    h('div', { className: 'sa-scrim', onClick: onClose }),
    h(
      'aside',
      { className: 'sa-drawer wide', role: 'dialog', 'aria-label': 'Registrar salida' },
      // Header
      h(
        'div',
        { className: 'sa-drawer-head' },
        h(
          'div',
          { className: 'sa-head-top' },
          h('div', { className: 'sa-head-ic' }, h(Icon, { name: 'out', size: 18 })),
          h(
            'button',
            { className: 'sa-iconbtn', onClick: onClose, 'aria-label': 'Cerrar' },
            h(Icon, { name: 'x', size: 16 })
          )
        ),
        h('h2', { className: 'sa-drawer-title' }, 'Registrar salida'),
        h(
          'div',
          { className: 'sa-drawer-sub' },
          h(Icon, { name: 'out', size: 13 }),
          ' Sale de plata'
        ),
        h(
          'div',
          { className: 'sa-mode' },
          h(
            'button',
            { className: modo === 'gasto' ? 'sel' : '', onClick: () => setModo('gasto') },
            h(Icon, { name: 'tag', size: 15 }),
            ' Gasto'
          ),
          h(
            'button',
            { className: modo === 'compra' ? 'sel' : '', onClick: () => setModo('compra') },
            h(Icon, { name: 'truck', size: 15 }),
            ' Compra'
          )
        )
      ),
      // Body
      h(
        'div',
        { className: 'sa-drawer-body' },
        modo === 'gasto'
          ? h(
              React.Fragment,
              null,
              h(
                Field,
                { label: 'Tipo' },
                h(OptRow, { options: GASTOS, value: gastoTipo, onChange: setGastoTipo, cols: 3 })
              ),
              h(
                Field,
                { label: 'Monto' },
                h(
                  'div',
                  { style: { position: 'relative' } },
                  h('span', { className: 'sa-amt-big-prefix' }, '$'),
                  h('input', {
                    className: 'input sa-amt-big',
                    inputMode: 'numeric',
                    placeholder: '0',
                    autoFocus: true,
                    value: montoNum ? Number(montoNum).toLocaleString('es-AR') : '',
                    onChange: (e: any) => setMonto(e.target.value.replace(/\D/g, '')),
                  })
                )
              )
            )
          : h(
              React.Fragment,
              null,
              h(
                Field,
                { label: 'Proveedor', req: true },
                h(SearchMenu, {
                  value: prov.name,
                  icon: 'store',
                  placeholder: 'Buscar o crear proveedor',
                  freeNoun: 'proveedor',
                  options: suppliers.map((s) => ({
                    name: s.name,
                    meta: '',
                    icon: 'store',
                    id: s.id,
                  })),
                  onPick: (o: PickOption) => setProv({ id: o.id, name: o.name }),
                  onFree: (text: string) => setProv({ id: null, name: text }),
                })
              ),
              h(
                'div',
                { className: 'sa-fld' },
                h(
                  'span',
                  { className: 'sa-fld-label' },
                  'Ítems de la compra ',
                  h('span', { className: 'sa-opt-tag' }, '· del catálogo o a mano')
                ),
                h(CategoryAdder, { products, onAdd: addItem }),
                items.length > 0
                  ? h(
                      React.Fragment,
                      null,
                      h(
                        'div',
                        { className: 'sa-items', style: { marginTop: 10 } },
                        ...items.map((it) =>
                          h(ItemRow, {
                            key: it.id,
                            item: it,
                            onChange: (next: CompraItem) => updItem(it.id, next),
                            onRemove: () => delItem(it.id),
                          })
                        )
                      ),
                      h(
                        'div',
                        { className: 'sa-compra-total' },
                        h(
                          'span',
                          { className: 'lbl' },
                          'Total de la compra ',
                          h(
                            'span',
                            { className: 'cnt' },
                            `· ${items.length} ${items.length === 1 ? 'ítem' : 'ítems'}`
                          )
                        ),
                        h('span', { className: 'amt' }, fmt(compraTotal))
                      )
                    )
                  : h(
                      'div',
                      { className: 'sa-items-empty' },
                      'Todavía no agregaste ítems. Sumá productos del catálogo con los botones de arriba; si alguno no está, podés cargarlo a mano.'
                    )
              )
            ),
        h(
          Field,
          { label: 'Medio' },
          h(OptRow, {
            options: MEDIOS,
            value: medio,
            onChange: setMedio,
            cols: 2,
            variant: 'medio',
          })
        ),
        h(Field, { label: 'Estado' }, h(EstadoControl, { pagada, onChange: setPagada, modo })),
        h(
          Field,
          { label: 'Nota', opt: true },
          h('input', {
            className: 'input',
            placeholder: modo === 'compra' ? 'Ej. Pedido a 30 días' : 'Ej. Factura de mayo',
            value: nota,
            onChange: (e: any) => setNota(e.target.value),
          })
        )
      ),
      // Footer
      h(
        'div',
        { className: 'sa-drawer-foot' },
        h(
          'div',
          { className: 'sa-foot-preview' },
          !pagada
            ? h(
                React.Fragment,
                null,
                h('span', { className: 'sa-foot-label' }, 'Queda a pagar'),
                h(
                  'span',
                  { className: 'sa-foot-nums' },
                  h('span', { className: 'sa-foot-next danger' }, fmt(total))
                )
              )
            : tocaCaja
              ? h(
                  React.Fragment,
                  null,
                  h('span', { className: 'sa-foot-label' }, 'Sale de la caja'),
                  h(
                    'span',
                    { className: 'sa-foot-nums' },
                    h('span', { className: 'sa-foot-next' }, fmt(total))
                  )
                )
              : h(
                  React.Fragment,
                  null,
                  h(
                    'span',
                    { className: 'sa-foot-label' },
                    `Pagado por ${MEDIO_BY_ID[medio].label}`
                  ),
                  h('span', { className: 'sa-foot-hint' }, 'No toca la caja')
                )
        ),
        !pagada &&
          h(
            'div',
            { className: 'sa-foot-sub' },
            modo === 'compra'
              ? h(
                  'span',
                  null,
                  'Queda a pagar a ',
                  h('strong', null, prov.name.trim() || 'el proveedor'),
                  '. La mercadería igual entra al stock.'
                )
              : h('span', null, 'Suma a las salidas pendientes. No toca la caja hoy.')
          ),
        h(
          'div',
          { className: 'sa-foot-actions' },
          h('button', { className: 'btn btn-secondary btn-lg', onClick: onClose }, 'Cancelar'),
          h(
            'button',
            {
              className: 'btn btn-dark btn-lg',
              disabled: !valid || busy,
              onClick: submit,
              style: { flex: 1 },
            },
            h(Icon, { name: 'out', size: 14 }),
            ' Registrar salida'
          )
        )
      )
    )
  );
}
