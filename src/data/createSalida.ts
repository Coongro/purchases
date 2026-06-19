import { actions } from '@coongro/plugin-sdk';

export interface SalidaItemInput {
  productId: string | null;
  description: string;
  quantity: number;
  unitCost: number;
  /** N° de lote (opcional). Si viene, la mercadería entra como lote en products.batches. */
  lote?: string | null;
  /** Vencimiento del lote (ISO o YYYY-MM-DD, opcional). */
  expiration?: string | null;
}

/** Alimenta el stock genérico (products) por un ítem de compra. Blando: si products no está. */
async function feedStock(accountId: string, it: SalidaItemInput): Promise<void> {
  if (!it.productId) return;
  try {
    await actions.execute('products.stock.create', {
      data: {
        product_id: it.productId,
        type: 'in',
        quantity: String(it.quantity),
        unit_cost: String(it.unitCost),
        reference_type: 'salida',
        reference_id: accountId,
      },
    });
  } catch {
    /* products no disponible: la salida igual queda registrada */
  }
}

/**
 * Si el ítem trae lote, lo registra en el stock genérico de lotes (products.batches, COONG-217)
 * — el mismo que leen Farmacia y la dispensación de recetas. Así comprar por Salidas hace
 * aparecer el lote/vencimiento como stock disponible. Blando: si products no está.
 */
async function feedBatch(it: SalidaItemInput): Promise<void> {
  if (!it.productId || !it.lote?.trim()) return;
  try {
    await actions.execute('products.batches.create', {
      data: {
        product_id: it.productId,
        batch_number: it.lote.trim(),
        expiration_date: it.expiration?.trim() || null,
        quantity: String(it.quantity),
        purchase_price: String(it.unitCost),
        status: 'active',
      },
    });
  } catch {
    /* products no disponible: la salida igual queda registrada */
  }
}

export interface CreateSalidaInput {
  mode: 'gasto' | 'compra';
  medio: string;
  /** true = pagada (registra pago por el total) | false = queda a pagar (sin pago). */
  pagada: boolean;
  // Gasto
  gastoCategory?: string;
  concept?: string;
  amount?: number;
  // Compra
  supplierId?: string | null;
  items?: SalidaItemInput[];
}

/**
 * Registra una SALIDA reusando el ledger de billing como cuenta POR PAGAR (direction:
 * 'payable') — el mismo motor de Cobros, sin tabla nueva (ver memoria
 * salidas_entity_spec_coong212). Una salida = una cuenta payable + líneas + (si está
 * pagada) un pago. El estado pagada/parcial/a-pagar lo deriva billing de pagos vs total.
 *
 * - `contactId` de la cuenta = proveedor (Salidas resuelve nombres contra purchases.suppliers;
 *   Cobros nunca ve estas cuentas porque filtra receivable).
 * - `source` = 'gasto' | 'compra' → el tipo de la salida.
 * - Compra: además alimenta el stock genérico (products.stock 'in') y, si el ítem trae lote,
 *   lo registra en products.batches (lote/vencimiento genérico, COONG-217).
 * - billing/products son blandos (try/catch): si faltan, la salida no se pierde a medias.
 */
export async function createSalida(input: CreateSalidaInput): Promise<string> {
  const isCompra = input.mode === 'compra';
  const items = (input.items ?? []).filter(
    (i) => (Number(i.quantity) || 0) > 0 && (Number(i.unitCost) || 0) >= 0
  );
  const total = isCompra
    ? items.reduce((s, i) => s + i.quantity * i.unitCost, 0)
    : Number(input.amount) || 0;

  // 1) Abrir la cuenta por pagar.
  const account = await actions.execute<{ id: string }>('billing.accounts.openForVisit', {
    direction: 'payable',
    source: input.mode,
    contactId: isCompra ? (input.supplierId ?? null) : null,
  });
  const accountId = account?.id;
  if (!accountId) throw new Error('No se pudo abrir la cuenta de la salida');

  // Concepto a nivel cuenta (para mostrarlo en la lista sin leer líneas): en gasto = el
  // concepto/categoría; en compra el "quién" sale del proveedor (contact_id).
  const conceptNote = isCompra ? null : input.concept?.trim() || input.gastoCategory || null;
  if (conceptNote) {
    try {
      await actions.execute('billing.accounts.update', {
        id: accountId,
        data: { notes: conceptNote },
      });
    } catch {
      /* no crítico: la línea igual tiene la descripción */
    }
  }

  // 2) Líneas.
  if (isCompra) {
    for (const it of items) {
      await actions.execute('billing.lines.add', {
        accountId,
        productId: it.productId,
        description: it.description.trim() || 'Ítem',
        quantity: String(it.quantity),
        unitPrice: String(it.unitCost),
        subtotal: String(it.quantity * it.unitCost),
        sourceType: 'compra',
      });
      // Alimentar stock genérico (solo si la línea está atada a un producto).
      await feedStock(accountId, it);
      // Si trae lote, registrarlo en products.batches (stock con lote/vencimiento).
      await feedBatch(it);
    }
  } else {
    await actions.execute('billing.lines.add', {
      accountId,
      description: input.concept?.trim() || input.gastoCategory || 'Gasto',
      quantity: '1',
      unitPrice: String(total),
      subtotal: String(total),
      sourceType: 'gasto',
    });
  }

  // 3) Pago (solo si está pagada). Sin pago → la cuenta queda "a pagar" (balance = total).
  if (input.pagada && total > 0) {
    await actions.execute('billing.payments.record', {
      accountId,
      amount: String(total),
      method: input.medio,
    });
  }

  return accountId;
}
