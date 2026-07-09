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
  const { toast } = usePlugin();
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

  // Si la vista se abrió con views.open(id, { record }) → modo edición
  const initialRecord = ((views.params as any)?.record ?? null) as Record<string, any> | null;
  const [editingId, setEditingId] = useState<string | null>(
    initialRecord?.id != null ? String(initialRecord.id) : null
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (values['name'] == null || values['name'] === '' || values['name'] === false)
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
        const ctx = { execute: actions.execute, toast, editingId };
        await customHandlers.onSubmit(values, ctx);
      } else if (editingId) {
        await actions.execute('purchases.suppliers.update', { id: editingId, ...values });
      } else {
        await actions.execute('purchases.suppliers.create', values);
      }
      toast.success(editingId ? 'Actualizado' : 'Guardado', 'El registro se guardó correctamente');
      setEditingId(null);
      setValues({ name: null, contact: null, notes: null, is_active: false });
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, validate, editingId]);

  return { values, errors, setField, editingId, submit };
}
