---
'@coongro/purchases': minor
---

feat(salidas): vínculo compra↔lote + deep-link + drop de tablas legacy

- El alta de lote desde una compra (`feedBatch`) guarda el vínculo a la Salida de
  origen (`metadata.sourceAccountId`), para saltar desde la trazabilidad del lote a
  la compra que lo trajo.
- `SalidasView` acepta `accountId` y abre esa salida puntual (deep-link desde el
  "Ver salida" del detalle de lote).
- Drop de las tablas/repos/comandos legacy de compras (`purchase`, `purchase_line`,
  `createPurchase`, `usePurchases`) — la salida usa el ledger de billing. Migración 0001.
