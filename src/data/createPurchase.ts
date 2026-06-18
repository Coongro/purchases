import { actions } from '@coongro/plugin-sdk';

export interface PurchaseLineInput {
  productId: string | null;
  description: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseInput {
  supplierId: string | null;
  paymentMethod: string;
  notes?: string | null;
  lines: PurchaseLineInput[];
}

/**
 * Crea una compra + sus líneas, alimenta el STOCK de products (decisión: products.stock es el
 * sistema canónico, por compatibilidad) y, si se pagó en EFECTIVO del cajón, genera el egreso
 * de caja (billing). Orquestación frontend en secuencia, igual que vaccination/src/data/billing.ts.
 *
 * products y billing son BLANDOS (try/catch): si el plugin no está, la compra igual queda
 * registrada — el plugin de compras no debe romperse por sus dependencias.
 *
 * Caveat conocido: para medicamentos, el stock real al dispensar vive en los `batches` de
 * vet-pharmacy (no en products.stock) → escribir products.stock acá no se sincroniza con eso.
 * Es un gap separado (ver memoria proveedores_compras_a_pagar), no se resuelve en Nivel 1.
 */
export async function createPurchase(input: CreatePurchaseInput): Promise<string> {
  const created = await actions.execute<Array<{ id: string }>>('purchases.records.create', {
    data: {
      supplier_id: input.supplierId,
      payment_method: input.paymentMethod,
      notes: input.notes ?? null,
    },
  });
  const purchaseId = created?.[0]?.id;
  if (!purchaseId) throw new Error('No se pudo crear la compra');

  let total = 0;
  for (const line of input.lines) {
    const subtotal = line.quantity * line.unitCost;
    total += subtotal;
    await actions.execute('purchases.lines.create', {
      data: {
        purchase_id: purchaseId,
        product_id: line.productId,
        description: line.description,
        quantity: String(line.quantity),
        unit_cost: String(line.unitCost),
        subtotal: String(subtotal),
      },
    });
    // Alimentar el stock del catálogo (solo si la línea está atada a un producto).
    if (line.productId) {
      try {
        await actions.execute('products.stock.create', {
          data: {
            product_id: line.productId,
            type: 'in',
            quantity: String(line.quantity),
            unit_cost: String(line.unitCost),
            reference_type: 'purchase',
            reference_id: purchaseId,
          },
        });
      } catch {
        /* products no disponible: la compra igual queda registrada */
      }
    }
  }

  // Pago en efectivo del cajón → egreso de caja (solo el efectivo toca la caja física).
  if (input.paymentMethod === 'efectivo' && total > 0) {
    try {
      await actions.execute('billing.expenses.record', {
        amount: String(total),
        category: 'proveedor',
        notes: input.notes ?? 'Compra a proveedor',
      });
    } catch {
      /* billing no disponible */
    }
  }

  return purchaseId;
}
