---
'@coongro/purchases': patch
---

fix(compra): clasificar el bucket Insumos por la categoría real (COONG-256)

`useProductOptions` clasifica los insumos por su categoría "Insumos" en vez de por
descarte ("todo lo que no es vacuna ni medicamento"). Acompaña la nueva vista de
Insumos de vet-inventory, que ahora es dueña del concepto vía la categoría.
