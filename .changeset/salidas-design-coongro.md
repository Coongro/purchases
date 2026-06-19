---
"@coongro/purchases": minor
---

Salidas: rediseño fiel al diseño aprobado (Claude Design) adaptado a Coongro.

- **Lista** con componentes core: `UI.DataTable` (responsive — cards en mobile vía `mobileRender`), summary cards y panel colapsable "A pagar — por proveedor".
- **Drawer "Registrar salida"** (modos Gasto/Compra): selectores de categoría dinámicos (solo las que tienen productos — Medicamentos/Vacunas), item card con stepper de cantidad + lote/vencimiento, typeahead de proveedor (crear al vuelo), medio/estado y preview de caja.
- **Drawer de detalle** con total/pagado/saldo, pagos y acción "Pagar" para saldar las cuentas a-pagar.
- Estilo via CSS scopeado en `.sal` sobre tokens `cg-*` (dark mode + theming del host); solo CSS custom para las piezas que el core no tiene (stepper, grilla de opciones, typeahead, item card).
- La compra con lote escribe a `products.batches` (stock genérico compartido con Farmacia/dispensación).
