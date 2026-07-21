/**
 * Proveedor — composición y render (generado por el Builder de Vistas).
 *
 * ⚠️ ARCHIVO REGENERABLE: se reescribe al guardar el diseño en el Builder.
 * La lógica custom va en `handlers.ts` (nunca se pisa). Diseño: `spec.json`.
 */
import { getHostReact, getHostUI, usePlugin } from '@coongro/plugin-sdk';

import { useNuevoProveedorView } from './use-nuevo-proveedor.js';

const React = getHostReact();
const h = React.createElement;
// Componentes del HOST: el diseño vive en core — una actualización de
// ui-components se refleja acá sin regenerar esta vista.
const UI = getHostUI() as any;

export function NuevoProveedorView() {
  const {
    views: { closeDialog },
  } = usePlugin();
  const { values, errors, setField, submit, editingId } = useNuevoProveedorView();

  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column' as const } },
    h(
      'div',
      {
        style: { padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '16px' },
      },
      h(
        'div',
        { 'data-cg-block-id': 'card', style: { display: 'contents' } },
        h(
          UI.FormSection,
          { icon: 'Truck', title: 'Datos del proveedor' },
          h(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '24px',
                alignItems: 'stretch',
              },
            },
            h(
              'div',
              { 'data-cg-block-id': 'f_name', style: { display: 'contents' } },
              h(
                'div',
                { style: { flex: '1 1 100%', minWidth: 0 } },
                h(
                  UI.Label,
                  { htmlFor: 'name', style: { display: 'block', marginBottom: '6px' } },
                  'Nombre',
                  h('span', { style: { color: 'var(--cg-danger)' } }, ' *')
                ),
                h(UI.Input, {
                  id: 'name',
                  type: 'text',
                  value: String(values['name'] ?? ''),
                  placeholder: 'Ej: Distribuidora del Sur',
                  onChange: (e: any) => setField('name', e.target.value),
                }),
                errors['name']
                  ? h(
                      'div',
                      { style: { fontSize: '12px', color: 'var(--cg-danger)', marginTop: '4px' } },
                      errors['name']
                    )
                  : null
              )
            ),
            h(
              'div',
              { 'data-cg-block-id': 'f_contact', style: { display: 'contents' } },
              h(
                'div',
                { style: { flex: '1 1 100%', minWidth: 0 } },
                h(
                  UI.Label,
                  { htmlFor: 'contact', style: { display: 'block', marginBottom: '6px' } },
                  'Contacto'
                ),
                h(UI.Input, {
                  id: 'contact',
                  type: 'text',
                  value: String(values['contact'] ?? ''),
                  placeholder: 'Teléfono o email',
                  onChange: (e: any) => setField('contact', e.target.value),
                }),
                errors['contact']
                  ? h(
                      'div',
                      { style: { fontSize: '12px', color: 'var(--cg-danger)', marginTop: '4px' } },
                      errors['contact']
                    )
                  : null
              )
            ),
            h(
              'div',
              { 'data-cg-block-id': 'f_notes', style: { display: 'contents' } },
              h(
                'div',
                { style: { flex: '1 1 100%', minWidth: 0 } },
                h(
                  UI.Label,
                  { htmlFor: 'notes', style: { display: 'block', marginBottom: '6px' } },
                  'Nota'
                ),
                h(UI.Input, {
                  id: 'notes',
                  type: 'text',
                  value: String(values['notes'] ?? ''),
                  placeholder: 'Ej: entrega los martes, pago a 30 días',
                  onChange: (e: any) => setField('notes', e.target.value),
                }),
                errors['notes']
                  ? h(
                      'div',
                      { style: { fontSize: '12px', color: 'var(--cg-danger)', marginTop: '4px' } },
                      errors['notes']
                    )
                  : null
              )
            ),
            h(
              'div',
              { 'data-cg-block-id': 'f_is_active', style: { display: 'contents' } },
              h(
                'div',
                { style: { flex: '1 1 100%', minWidth: 0 } },
                h(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    },
                  },
                  h(
                    UI.Label,
                    { htmlFor: 'is_active', style: { display: 'block', marginBottom: '6px' } },
                    'Activo'
                  ),
                  h(UI.Switch, {
                    id: 'is_active',
                    checked: Boolean(values['is_active']),
                    onCheckedChange: (v: boolean) => setField('is_active', v),
                  })
                ),
                errors['is_active']
                  ? h(
                      'div',
                      { style: { fontSize: '12px', color: 'var(--cg-danger)', marginTop: '4px' } },
                      errors['is_active']
                    )
                  : null
              )
            )
          )
        )
      )
    ),
    h(
      UI.DialogFooter,
      null,
      h(
        UI.Button,
        {
          variant: 'ghost',
          onClick: () => {
            closeDialog();
          },
        },
        'Cancelar'
      ),
      h(
        UI.Button,
        {
          onClick: () => {
            void submit();
          },
        },
        editingId ? 'Actualizar' : 'Guardar'
      )
    )
  );
}
