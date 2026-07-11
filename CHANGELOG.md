# @coongro/purchases

## 0.2.0

### Minor Changes

- 1ea8950: feat(salidas): use the Coongro DatePicker (@coongro/calendar) for the batch expiration field instead of free text; format expiration as DD/MM/AAAA in the batch detail (COONG-223)
- 8103e3a: Proveedores: la vista pasa a componerse con el View Builder. El ABM ahora es un CRUD completo (listar / crear / editar / eliminar) con el alta y la edición en un diálogo estándar de Coongro (mismo componente que "Nuevo profesional"), reemplazando la vista manual anterior. Nueva vista `purchases.nuevo-proveedor.open` (form) y `purchases.proveedores.open` regenerada; el menú "Proveedores" no cambia.
- 642756a: Salidas: click en una salida abre un drawer de detalle (espejo del checkout de Cobros) con total/pagado/saldo, pagos registrados, y acción "Pagar" para saldar las cuentas a-pagar (registra el pago en el ledger payable de billing y actualiza el estado). Antes la fila no hacía nada.
- aa5a811: Salidas: rediseño fiel al diseño aprobado (Claude Design) adaptado a Coongro.

  - **Lista** con componentes core: `UI.DataTable` (responsive — cards en mobile vía `mobileRender`), summary cards y panel colapsable "A pagar — por proveedor".
  - **Drawer "Registrar salida"** (modos Gasto/Compra): selectores de categoría dinámicos (solo las que tienen productos — Medicamentos/Vacunas), item card con stepper de cantidad + lote/vencimiento, typeahead de proveedor (crear al vuelo), medio/estado y preview de caja.
  - **Drawer de detalle** con total/pagado/saldo, pagos y acción "Pagar" para saldar las cuentas a-pagar.
  - Estilo via CSS scopeado en `.sal` sobre tokens `cg-*` (dark mode + theming del host); solo CSS custom para las piezas que el core no tiene (stepper, grilla de opciones, typeahead, item card).
  - La compra con lote escribe a `products.batches` (stock genérico compartido con Farmacia/dispensación).

- 3e4951a: Salidas: rediseño fiel al diseño aprobado, sobre el ledger POR PAGAR de billing (sin tabla nueva). Tarjetas-resumen A PAGAR / PAGADO / SALIDAS (estado real, derivado de pagos vs total), panel "A pagar — por proveedor", lista con columna Estado (pagada/parcial/a-pagar), y drawer lateral con modos Gasto/Compra + medio + control de estado (pagada/a-pagar). Reusa cuenta+líneas+pagos de billing (mismo motor de Cobros) → el estado pagada/a-pagar es real. Lote por ítem va aparte (COONG-217). Mismo lenguaje visual que Cobros/Caja (componentes y tokens cg).
- f762375: feat(salidas): vínculo compra↔lote + deep-link + drop de tablas legacy

  - El alta de lote desde una compra (`feedBatch`) guarda el vínculo a la Salida de
    origen (`metadata.sourceAccountId`), para saltar desde la trazabilidad del lote a
    la compra que lo trajo.
  - `SalidasView` acepta `accountId` y abre esa salida puntual (deep-link desde el
    "Ver salida" del detalle de lote).
  - Drop de las tablas/repos/comandos legacy de compras (`purchase`, `purchase_line`,
    `createPurchase`, `usePurchases`) — la salida usa el ledger de billing. Migración 0001.

- 62046a9: Salidas · compra: cada ítem puede registrar N° de lote + vencimiento (opcional). Al guardar, la mercadería con lote entra al stock genérico de lotes (products.batches, COONG-217) — el mismo que leen Farmacia y la dispensación de recetas, así comprar por Salidas hace aparecer el lote como stock disponible. Los ítems del drawer se rediseñaron como tarjetas (producto + cantidad + costo + lote/vencimiento + subtotal), más fieles al diseño.
- 1912d41: Salidas: unifica gastos y compras a proveedor en una sola entidad/vista (antes "Compras"). El drawer "Registrar salida" tiene dos modos — Gasto (tipo/monto/concepto → egreso de caja) y Compra (proveedor + ítems + medio → stock + pago) — y la lista muestra ambos tipos ordenados por fecha. Medios: efectivo/transferencia/débito/crédito (sin cheque). El menú pasa de "Compras" a "Salidas". El estado pagada/a-pagar, el lote por ítem y los 3 selectores por categoría quedan diferidos (necesitan una tabla `salida` propia; ver memoria salidas_entity_spec_coong212).

### Patch Changes

- 54655bd: Iconografía consistente: "proveedor" usa siempre el icono `Store` (Truck queda solo para "Compra"). Se corrige el icono del menú Proveedores (era `Building2`) y la fila por-proveedor del panel "A pagar" (usaba `Truck`, que significa Compra) → ambos a `Store`, igual que el header del panel y el selector de proveedor.
- 0ba40fb: Menú: el icono de "Proveedores" pasa a usar el nombre Lucide ("Building2") en vez de un SVG hecho a mano. DynamicIcon lo resuelve directo desde lucide-react (icono oficial, prolijo), igual que otros menús del kit. Se elimina el SVG manual.
- a2bd74d: Menú: "Proveedores" deja de ser submenú de Salidas y pasa a ser un ítem propio (es un maestro/ABM, no un flujo de plata). "Salidas" ahora va directo a Movimientos (sin submenú). El kit lo ubica en la sección de directorio junto a Personal.
