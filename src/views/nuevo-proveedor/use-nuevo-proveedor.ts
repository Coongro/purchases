/**
 * Proveedor — datos y estado (generado por el Builder de Vistas).
 *
 * ⚠️ ARCHIVO REGENERABLE: se reescribe al guardar el diseño en el Builder.
 * La lógica custom va en `handlers.ts` (nunca se pisa). Diseño: `spec.json`.
 */
import { actions, getHostReact, usePlugin, views } from '@coongro/plugin-sdk';

import { customHandlers } from './handlers.js';

const React = getHostReact();
const { useState, useEffect, useCallback } = React;

export function useNuevoProveedorView() {
  const {
    toast,
    views: { closeDialog },
  } = usePlugin();
  const [values, setValues] = useState<Record<string, any>>({
    name: null,
    contact: null,
    notes: null,
    is_active: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setField = useCallback((k: string, v: any) => {
    setValues((prev: any) => ({ ...prev, [k]: v }));
    setErrors((e: any) => ({ ...e, [k]: undefined }));
  }, []);

  // record con el que se abrió la vista (views.open(id, { record })), si hubo — lo
  // reciben los handlers en onSubmit (ej. una acción de fila que necesita el id).
  const initialRecord = ((views.params as any)?.record ?? null) as Record<string, any> | null;
  // Abierta con { record } → modo edición: prefillea y pasa a update
  const [editingId, setEditingId] = useState<string | null>(
    initialRecord?.id !== null && initialRecord?.id !== undefined ? String(initialRecord.id) : null
  );
  useEffect(() => {
    if (!initialRecord) return;
    const loose = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    setValues((prev: any) => {
      const next = { ...prev };
      const rks = Object.keys(initialRecord);
      for (const k of Object.keys(next)) {
        const rk = rks.find((x) => loose(x) === loose(k));
        if (rk) next[k] = initialRecord[rk];
      }
      return next;
    });
    // deps intencionalmente fijas: el efecto corre una sola vez
  }, []);

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (
      values['name'] === null ||
      values['name'] === undefined ||
      values['name'] === '' ||
      values['name'] === false
    )
      errs['name'] = '«Nombre» es requerido';
    return errs;
  }, [values]);

  const submit = useCallback(async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.warning('Revisá el formulario', 'Hay campos con errores.');
      return;
    }
    try {
      if (customHandlers.onSubmit) {
        const ctx = {
          execute: function exec<T = unknown>(id: string, args?: unknown): Promise<T> {
            return actions.execute<T>(id, args);
          },
          toast,
          editingId,
          record: initialRecord,
        };
        await customHandlers.onSubmit(values, ctx);
      } else if (editingId) {
        await actions.execute('purchases.suppliers.update', { id: editingId, ...values });
      } else {
        await actions.execute('purchases.suppliers.create', values);
      }
      toast.success(editingId ? 'Actualizado' : 'Guardado', 'El registro se guardó correctamente');
      setEditingId(null);
      setValues({ name: null, contact: null, notes: null, is_active: false });
      closeDialog();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    }
    // deps intencionalmente fijas: el efecto corre una sola vez
  }, [values, validate, editingId]);

  return { values, errors, setField, editingId, submit };
}
