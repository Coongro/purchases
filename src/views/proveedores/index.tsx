import { getHostReact, getHostUI, usePlugin, actions } from '@coongro/plugin-sdk';

const UI = getHostUI();
import { useSuppliers } from '../../data/useSuppliers.js';
import type { Supplier } from '../../data/useSuppliers.js';

const React = getHostReact();
const { useState } = React;
const h = React.createElement;

export function ProveedoresView() {
  const { rows, loading, error, reload } = useSuppliers();
  const { toast } = usePlugin();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const openForm = () => {
    setName('');
    setContact('');
    setNotes('');
    setShowForm(true);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.warning('Falta el nombre', 'Ingresá el nombre del proveedor.');
      return;
    }
    setBusy(true);
    try {
      await actions.execute('purchases.suppliers.create', {
        data: { name: name.trim(), contact: contact.trim() || null, notes: notes.trim() || null },
      });
      toast.success('Proveedor agregado', name.trim());
      setShowForm(false);
      await reload();
    } catch {
      toast.error('No se pudo guardar', 'Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await actions.execute('purchases.suppliers.delete', { id });
      await reload();
    } catch {
      toast.error('No se pudo eliminar', 'Intentá de nuevo.');
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
          h('h1', { className: 'text-2xl font-bold text-cg-text' }, 'Proveedores'),
          h(
            'p',
            { className: 'text-sm text-cg-text-muted mt-1' },
            'A quién le comprás. Reutilizables en cada compra.'
          )
        ),
        !showForm &&
          h(
            UI.Button,
            { variant: 'brand', size: 'sm', onClick: openForm } as any,
            h(UI.DynamicIcon, { icon: 'Plus', size: 14 } as any),
            ' Nuevo proveedor'
          )
      ),

      // Form inline
      showForm &&
        h(
          'div',
          {
            className:
              'bg-cg-bg rounded-xl border border-cg-border p-5 shadow-sm flex flex-col gap-3',
          },
          h(
            'div',
            { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            h(
              'div',
              null,
              h(
                'label',
                { className: 'block text-xs font-semibold text-cg-text-muted mb-1' },
                'Nombre'
              ),
              h(UI.Input, {
                size: 'sm',
                value: name,
                onChange: (e: any) => setName(e.target.value),
                placeholder: 'Ej: Distribuidora X',
              } as any)
            ),
            h(
              'div',
              null,
              h(
                'label',
                { className: 'block text-xs font-semibold text-cg-text-muted mb-1' },
                'Contacto (opcional)'
              ),
              h(UI.Input, {
                size: 'sm',
                value: contact,
                onChange: (e: any) => setContact(e.target.value),
                placeholder: 'Tel / email',
              } as any)
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
            } as any)
          ),
          h(
            'div',
            { className: 'flex gap-2 justify-end' },
            h(
              UI.Button,
              {
                variant: 'ghost',
                size: 'sm',
                disabled: busy,
                onClick: () => setShowForm(false),
              } as any,
              'Cancelar'
            ),
            h(
              UI.Button,
              { variant: 'brand', size: 'sm', disabled: busy, onClick: () => void save() } as any,
              'Guardar'
            )
          )
        ),

      // Lista
      loading
        ? h(UI.LoadingOverlay, { variant: 'skeleton', rows: 4 } as any)
        : error
          ? h(UI.ErrorDisplay, { message: error, onRetry: () => void reload() } as any)
          : rows.length === 0
            ? h(UI.EmptyState, {
                title: 'Sin proveedores',
                description: 'Agregá tu primer proveedor para usarlo en las compras.',
                icon: h(UI.DynamicIcon, { icon: 'Truck', size: 32 } as any),
              } as any)
            : h(
                'div',
                { className: 'flex flex-col gap-2' },
                ...rows.map((s: Supplier) =>
                  h(
                    'div',
                    {
                      key: s.id,
                      className:
                        'bg-cg-bg rounded-xl border border-cg-border px-4 py-3 shadow-sm flex items-center justify-between gap-3',
                    },
                    h(
                      'div',
                      { className: 'min-w-0 flex flex-col gap-0.5' },
                      h('div', { className: 'text-sm font-semibold text-cg-text' }, s.name),
                      s.contact &&
                        h('div', { className: 'text-xs text-cg-text-muted truncate' }, s.contact),
                      s.notes &&
                        h(
                          'div',
                          { className: 'text-xs text-cg-text-muted italic truncate' },
                          s.notes
                        )
                    ),
                    h(
                      UI.IconButton,
                      {
                        variant: 'danger',
                        size: 'sm',
                        'aria-label': 'Eliminar',
                        disabled: busy,
                        onClick: () => void remove(s.id),
                      } as any,
                      h(UI.DynamicIcon, { icon: 'Trash2', size: 14 } as any)
                    )
                  )
                )
              )
    )
  );
}
