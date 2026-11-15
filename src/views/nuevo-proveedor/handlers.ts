/**
 * Lógica custom de «Proveedor» (NuevoProveedorView).
 *
 * Este archivo es TUYO: el Builder lo crea una sola vez y NUNCA lo pisa al
 * regenerar. Los archivos regenerables (`nuevo-proveedor.view.ts`,
 * `use-nuevo-proveedor.ts`, `index.ts`) invocan estos puntos de extensión si
 * existen — acá va lo que el diseño no puede expresar.
 * Cada punto que implementes debe clasificarse en `spec.json > headless.handlers`
 * como query, command, presentation o uiOnly. Builder lo muestra durante el
 * desarrollo y evita que la funcionalidad desaparezca de Copilot/MCP.
 *
 * Las cargas (`loadData`, `loadDataFor`, `loadLiveValues`, `loadChartFor`)
 * corren dentro de una consulta de la caché del host (Core ≥ 0.68): pedí todo por
 * el `execute` del ctx — así la vista sabe qué leyó y se refresca sola cuando eso
 * cambia. Una carga solo lee; no hace falta `reload()` después de escribir.
 *
 * Las acciones responden en su forma canónica: un registro suelto (o `null`) en
 * `getById`, `create`, `update` y demás; `{ items, total }` en una lista
 * paginada; un arreglo en las otras listas.
 *
 * `onSubmit` de un alta devuelve el registro creado (`{ id, … }`, la forma
 * canónica de `create`): el formulario se lo entrega a quien lo abrió
 * (`closeDialog(creado)`), y un Selector que ofreció «Crear…» lo deja elegido.
 * Si lo abrió un «Crear…» y no devuelve nada, se avisa «Elegilo de la lista».
 *
 * Todo ctx trae `fmt` (el formato del SDK atado a la zona del negocio) y
 * `timeZone` (esa zona, IANA): meses y días se cuentan en ella, no en la del
 * navegador.
 *
 * Y `params`: los params con los que se abrió ESTA vista (`ctx.params?.parentEntity`).
 * No leas el global `views.params`: con un diálogo encima de otro responde por el
 * de arriba, no por esta vista.
 *
 * El contrato completo (con la documentación de cada punto) está en
 * `CustomHandlers` de `@coongro/plugin-sdk`. De ahí salen también
 * `formatMoney`, `formatDateKey`, `periodLabel` y `plural`. Las cargas
 * de los bloques ya se comparten solas (misma consulta, una sola carga).
 */
import type { CustomHandlers } from '@coongro/plugin-sdk';

export const customHandlers: CustomHandlers = {
  // onSubmit: async (values, { execute, toast }) => { ... },
};
