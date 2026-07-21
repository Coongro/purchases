---
'@coongro/purchases': minor
---

feat(salidas): deep-link para abrir Salidas directo en modo Compra (COONG-254)

`SalidasView` acepta un parámetro para abrir el drawer de registro directamente en
modo "Compra", y `RegistrarDrawer` acepta el modo inicial. Lo usa el aviso de
"Ingreso manual" del kit veterinario para encauzar las compras al lugar que registra
el gasto y el costo del lote.
