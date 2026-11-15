/**
 * Proveedor — composición y render (generado por el Builder de Vistas).
 *
 * ⚠️ ARCHIVO REGENERABLE: se reescribe al guardar el diseño en el Builder.
 * La lógica custom va en `handlers.ts` (nunca se pisa). Diseño: `spec.json`.
 */
import { useAccess, usePlugin } from '@coongro/plugin-sdk';
import * as UI from '@coongro/ui-components';
import { createElement as h } from 'react';

import { useNuevoProveedorView } from './use-nuevo-proveedor.js';

export function NuevoProveedorView() {
  const access = useAccess();
  const {
    views: { closeDialog },
  } = usePlugin();
  const {
    values,
    errors,
    setField,
    fieldDomId,
    touched,
    tried,
    blurField,
    submit,
    recordLoading,
    editingId,
    confirmRemove,
    setConfirmRemove,
    removing,
    removeEditing,
  } = useNuevoProveedorView();

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
                flexDirection: 'column' as const,
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
                h(UI.FormField, {
                  id: fieldDomId('name'),
                  label: 'Nombre',
                  error: errors['name'],
                  ok:
                    (touched['name'] || tried > 0) &&
                    !errors['name'] &&
                    String(values['name'] ?? '') !== '',
                  reserve: true,
                  index: 0,
                  shake: tried,
                  children: h(UI.Input, {
                    id: fieldDomId('name'),
                    'aria-invalid': errors['name'] ? true : undefined,
                    'aria-describedby': fieldDomId('name') + '-msg',
                    onBlur: () => blurField('name'),
                    type: 'text',
                    value: String(values['name'] ?? ''),
                    placeholder: 'Ej: Distribuidora del Sur',
                    onChange: (e: any) => setField('name', e.target.value),
                  }),
                })
              )
            ),
            h(
              'div',
              { 'data-cg-block-id': 'f_contact', style: { display: 'contents' } },
              h(
                'div',
                { style: { flex: '1 1 100%', minWidth: 0 } },
                h(UI.FormField, {
                  id: fieldDomId('contact'),
                  label: 'Contacto',
                  optional: true,
                  error: errors['contact'],
                  ok:
                    (touched['contact'] || tried > 0) &&
                    !errors['contact'] &&
                    String(values['contact'] ?? '') !== '',
                  index: 1,
                  shake: tried,
                  children: h(UI.Input, {
                    id: fieldDomId('contact'),
                    'aria-invalid': errors['contact'] ? true : undefined,
                    'aria-describedby': fieldDomId('contact') + '-msg',
                    onBlur: () => blurField('contact'),
                    type: 'text',
                    value: String(values['contact'] ?? ''),
                    placeholder: 'Teléfono o email',
                    onChange: (e: any) => setField('contact', e.target.value),
                  }),
                })
              )
            ),
            h(
              'div',
              { 'data-cg-block-id': 'f_notes', style: { display: 'contents' } },
              h(
                'div',
                { style: { flex: '1 1 100%', minWidth: 0 } },
                h(UI.FormField, {
                  id: fieldDomId('notes'),
                  label: 'Nota',
                  optional: true,
                  error: errors['notes'],
                  ok:
                    (touched['notes'] || tried > 0) &&
                    !errors['notes'] &&
                    String(values['notes'] ?? '') !== '',
                  index: 2,
                  shake: tried,
                  children: h(UI.Input, {
                    id: fieldDomId('notes'),
                    'aria-invalid': errors['notes'] ? true : undefined,
                    'aria-describedby': fieldDomId('notes') + '-msg',
                    onBlur: () => blurField('notes'),
                    type: 'text',
                    value: String(values['notes'] ?? ''),
                    placeholder: 'Ej: entrega los martes, pago a 30 días',
                    onChange: (e: any) => setField('notes', e.target.value),
                  }),
                })
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
                    {
                      htmlFor: fieldDomId('is_active'),
                      style: { display: 'block', marginBottom: '6px' },
                    },
                    'Activo'
                  ),
                  h(UI.Switch, {
                    id: fieldDomId('is_active'),
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
      'div',
      { style: { padding: '0 24px' } },
      h(UI.FormErrorSummary, {
        show: tried > 0,
        errors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [fieldDomId(k), v])),
        labels: Object.fromEntries(
          Object.entries({
            name: 'Nombre',
            contact: 'Contacto',
            notes: 'Nota',
            is_active: 'Activo',
          }).map(([k, v]) => [fieldDomId(k), v])
        ),
      })
    ),
    h(
      UI.DialogFooter,
      null,
      editingId && access.canRun('purchases.suppliers.delete')
        ? h(
            UI.Button,
            {
              variant: 'ghost',
              className: 'mr-auto text-cg-danger hover:bg-cg-danger-bg hover:text-cg-danger',
              onClick: () => {
                setConfirmRemove(true);
              },
            },
            'Eliminar'
          )
        : null,
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
          disabled: recordLoading,
          pendingLabel: 'Guardando…',
          successLabel: editingId ? 'Actualizado' : 'Guardado',
          errorLabel: 'No se guardó',
          onClick: () => submit(),
        },
        editingId ? 'Actualizar' : 'Guardar'
      )
    ),
    h(UI.ConfirmDialog, {
      open: confirmRemove,
      onOpenChange: (o: boolean) => {
        if (!o && !removing) setConfirmRemove(false);
      },
      title: '¿Eliminar este registro?',
      description: 'Se elimina para siempre: no se puede deshacer.',
      confirmLabel: 'Eliminar',
      loadingLabel: 'Eliminando…',
      loading: removing,
      onConfirm: () => {
        void removeEditing();
      },
    })
  );
}
