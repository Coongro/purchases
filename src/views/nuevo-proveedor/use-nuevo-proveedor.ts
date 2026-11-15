/**
 * Proveedor — datos y estado (generado por el Builder de Vistas).
 *
 * ⚠️ ARCHIVO REGENERABLE: se reescribe al guardar el diseño en el Builder.
 * La lógica custom va en `handlers.ts` (nunca se pisa). Diseño: `spec.json`.
 */
import { actions, useAction, useFormat, usePlugin, useViewQuery } from '@coongro/plugin-sdk';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { customHandlers } from './handlers.js';

export function useNuevoProveedorView() {
  // Formato con la zona del negocio: lo reciben los handlers en su ctx.
  const fmt = useFormat();
  // Params de ESTA vista (su instancia), no los del overlay que esté encima.
  const viewParams = usePlugin().views.params as any;
  const {
    toast,
    views: { closeDialog },
  } = usePlugin();
  const mounted = useRef(true);
  // reset en el mount (no solo cleanup): StrictMode desmonta y REMONTA
  // conservando refs — con cleanup solo, el remonte quedaría muerto
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [values, setValues] = useState<Record<string, any>>({
    name: null,
    contact: null,
    notes: null,
    is_active: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(0);
  // ids del DOM de los campos, únicos por instancia: con un formulario abierto
  // encima de otro con campos del mismo nombre, el rótulo, el mensaje y el foco
  // apuntaban al de abajo.
  const fieldIdBase = useId();
  const fieldDomId = useCallback((name: string) => fieldIdBase + name, [fieldIdBase]);
  const setField = useCallback((k: string, v: any) => {
    setValues((prev: any) => ({ ...prev, [k]: v }));
  }, []);
  const blurField = useCallback((k: string) => {
    setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
  }, []);
  useEffect(() => {
    const init = customHandlers.onInit;
    if (!init) return;
    const ctx = {
      execute: function exec<T = unknown>(id: string, args?: unknown): Promise<T> {
        return actions.execute<T>(id, args);
      },
      editingId,
      record: initialRecord,
      parentRecord,
      fmt,
      timeZone: fmt.timeZone,
      params: viewParams,
    };
    void init(ctx)
      .then((initial) => {
        if (!initial || !mounted.current) return;
        setValues((prev: any) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(initial)) {
            if (next[k] === undefined || next[k] === '' || next[k] === null) next[k] = v;
          }
          return next;
        });
      })
      .catch(() => {});
    // sin deps a propósito: corre una sola vez, al montar
  }, []);

  // record con el que se abrió la vista (views.open(id, { record })), si hubo — lo
  // reciben los handlers en onSubmit (ej. una acción de fila que necesita el id).
  const initialRecord = (viewParams?.record ?? null) as Record<string, any> | null;
  // Contexto padre (views.open(id, { parentRecord })): el registro DESDE el que
  // se abrió — «Nueva unidad» desde la ficha del edificio. A diferencia de
  // { record }, NUNCA activa el modo edición ni el prefill general de campos.
  const parentRecord = (viewParams?.parentRecord ?? null) as Record<string, any> | null;
  // Abierta con { record } → modo edición: guardar actualiza, no crea
  const [editingId, setEditingId] = useState<string | null>(
    initialRecord?.id !== null && initialRecord?.id !== undefined ? String(initialRecord.id) : null
  );
  // Editando, los campos salen del registro guardado (no del de los params, que
  // puede ser solo { id } o una fila de lista sin todos los campos); hasta que
  // llega, el formulario espera y no guarda. Si la lectura falla, queda el de los params.
  const editRecordQuery = useViewQuery<Record<string, any> | null>(
    'purchases.suppliers.getById',
    { id: editingId },
    { enabled: editingId !== null }
  );
  const recordLoading =
    editingId !== null && editRecordQuery.data === undefined && editRecordQuery.status !== 'error';
  const editSource =
    editingId === null
      ? initialRecord
      : (editRecordQuery.data ?? (editRecordQuery.status === 'error' ? initialRecord : null));
  // una sola vez: una relectura posterior no pisa lo que se está escribiendo
  const prefilled = useRef(false);
  // lo cargado, para mandar solo lo que cambió (lo que el servidor no muestra —una
  // contraseña— viaja vacío y pisaría lo guardado, igual que un dato que cambió otro)
  const loadedValues = useRef<Record<string, any> | null>(null);
  useEffect(() => {
    if (prefilled.current || !editSource) return;
    prefilled.current = true;
    const loose = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    setValues((prev: any) => {
      const next = { ...prev };
      const rks = Object.keys(editSource);
      for (const k of Object.keys(next)) {
        const rk = rks.find((x) => loose(x) === loose(k));
        if (rk) next[k] = editSource[rk];
      }
      loadedValues.current = next;
      return next;
    });
  }, [editSource]);
  // valores iniciales de un alta (views.open(id, { prefill }))
  useEffect(() => {
    const prefill = viewParams?.prefill as Record<string, unknown> | null | undefined;
    if (!prefill || typeof prefill !== 'object') return;
    setValues((prev: any) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (
          prefill[k] !== undefined &&
          (next[k] === null || next[k] === undefined || next[k] === '')
        )
          next[k] = prefill[k];
      }
      return next;
    });
    // sin deps a propósito: corre una sola vez, al montar
  }, []);

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (
      values['name'] === null ||
      values['name'] === undefined ||
      values['name'] === '' ||
      values['name'] === false
    )
      errs['name'] = 'Completá «Nombre».';
    return errs;
  }, [values]);
  // lo que ya se tocó (o todo, después de intentar guardar) se revisa en vivo
  useEffect(() => {
    const keys = tried > 0 ? null : Object.keys(touched).filter((k) => touched[k]);
    if (keys && keys.length === 0) return;
    const all = validate();
    setErrors((prev) => {
      const next: Record<string, string> = {};
      for (const k of keys ?? Object.keys({ ...prev, ...all })) {
        if (all[k]) next[k] = all[k];
      }
      for (const k of Object.keys(prev)) {
        if (keys && !keys.includes(k) && prev[k]) next[k] = prev[k];
      }
      return next;
    });
  }, [validate, touched, tried]);

  const { run: updateRecord } = useAction<unknown, { id: string; data: Record<string, any> }>(
    'purchases.suppliers.update'
  );
  const { run: createRecord } = useAction<unknown, { data: Record<string, any> }>(
    'purchases.suppliers.create'
  );
  const submit = useCallback(async (): Promise<boolean | null> => {
    if (recordLoading) return null;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTried((n) => n + 1);
      const first = Object.keys(errs)[0];
      if (first)
        requestAnimationFrame(() => {
          const box = document.getElementById(fieldDomId(first) + '-field');
          const el =
            box?.querySelector<HTMLElement>(
              'input:not([type=hidden]), textarea, button, [tabindex]:not([tabindex="-1"])'
            ) ?? document.getElementById(fieldDomId(first));
          el?.focus();
        });
      return null;
    }
    try {
      let created: unknown;
      if (customHandlers.onSubmit) {
        const ctx = {
          execute: function exec<T = unknown>(id: string, args?: unknown): Promise<T> {
            return actions.execute<T>(id, args);
          },
          toast,
          editingId,
          record: initialRecord,
          parentRecord,
          fmt,
          timeZone: fmt.timeZone,
          params: viewParams,
        };
        created = await customHandlers.onSubmit(values, ctx);
        if ((created === undefined || created === null) && viewParams?.prefill)
          toast.info('Se creó', 'Elegilo de la lista.');
      } else if (editingId) {
        const base = loadedValues.current;
        const data = base
          ? Object.fromEntries(
              Object.entries(values).filter(
                ([k, v]) => JSON.stringify(v) !== JSON.stringify(base[k])
              )
            )
          : values;
        const res =
          Object.keys(data).length > 0 ? await updateRecord({ id: editingId, data }) : null;
        if (res && !res.success) throw new Error(res.error ?? 'No se pudo guardar');
      } else {
        const res = await createRecord({ data: values });
        if (!res.success) throw new Error(res.error ?? 'No se pudo guardar');
        created = res.data;
      }
      toast.success(editingId ? 'Actualizado' : 'Guardado', 'El registro se guardó correctamente');
      setEditingId(null);
      setValues({ name: null, contact: null, notes: null, is_active: false });
      setTouched({});
      setTried(0);
      closeDialog(created);
      return true;
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo guardar');
      return false;
    }
    // lo que da el host (avisos, cerrar el diálogo) es estable
  }, [values, validate, fieldDomId, editingId, recordLoading, updateRecord, createRecord, fmt]);

  const { run: removeRecord } = useAction<unknown, { id: string }>('purchases.suppliers.delete');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const removeEditing = useCallback(async () => {
    if (!editingId) return;
    setRemoving(true);
    try {
      const res = await removeRecord({ id: editingId });
      if (!res.success) throw new Error(res.error ?? 'No se pudo eliminar');
      toast.success('Eliminado', 'El registro se eliminó correctamente');
      setConfirmRemove(false);
      closeDialog();
    } catch (err) {
      toast.error('No se pudo eliminar', err instanceof Error ? err.message : '');
      setConfirmRemove(false);
    } finally {
      setRemoving(false);
    }
    // lo que da el host (avisos, cerrar el diálogo) es estable
  }, [editingId, removeRecord]);

  return {
    values,
    errors,
    setField,
    touched,
    tried,
    blurField,
    fieldDomId,
    editingId,
    recordLoading,
    submit,
    confirmRemove,
    setConfirmRemove,
    removing,
    removeEditing,
  };
}
