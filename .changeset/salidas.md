---
"@coongro/purchases": minor
---

Salidas: unifica gastos y compras a proveedor en una sola entidad/vista (antes "Compras"). El drawer "Registrar salida" tiene dos modos — Gasto (tipo/monto/concepto → egreso de caja) y Compra (proveedor + ítems + medio → stock + pago) — y la lista muestra ambos tipos ordenados por fecha. Medios: efectivo/transferencia/débito/crédito (sin cheque). El menú pasa de "Compras" a "Salidas". El estado pagada/a-pagar, el lote por ítem y los 3 selectores por categoría quedan diferidos (necesitan una tabla `salida` propia; ver memoria salidas_entity_spec_coong212).
