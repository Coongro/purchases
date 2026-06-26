import { actions } from '@coongro/plugin-sdk';

export interface SalidaItemInput {
  productId: string | null;
  description: string;
  quantity: number;
  unitCost: number;
  /** N° de lote (opcional). Si viene, la mercadería entra como lote en products.batches. */
  lote?: string | null;
  /** Vencimiento del lote (formato "MM/AAAA" del drawer, o ISO). Opcional. */
  expiration?: string | null;
}

/**
 * Normaliza el vencimiento a fecha ISO para products.batches. El drawer ahora manda el campo de
 * fecha de Coongro (`type="date"` → "AAAA-MM-DD"); se conserva el parseo de "MM/AAAA" para datos
 * legacy.
 */
function vencToISO(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  const mm = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (mm) return `${mm[2]}-${mm[1].padStart(2, '0')}-01`;
  return null;
}

/**
 * Formatea el vencimiento para el detalle del lote a "DD/MM/AAAA". Cubre el ISO del campo de
 * fecha ("AAAA-MM-DD") y el "MM/AAAA" legacy (día 01); cualquier otro formato se deja igual.
 */
function fmtVenc(v: string | null | undefined): string {
  const s = (v ?? '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const mmYyyy = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (mmYyyy) return `01/${mmYyyy[1].padStart(2, '0')}/${mmYyyy[2]}`;
  return s;
}

/**
 * Stock de un ítem de compra SIN lote (insumo suelto, no loteable): movimiento `in`
 * directo en products.stock. Solo se usa cuando el ítem NO trae lote — los loteables
 * van por `feedBatch`. Así cada ítem alimenta el stock por una sola vía. Blando.
 */
async function feedStockNoBatch(accountId: string, it: SalidaItemInput): Promise<void> {
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
 * Registra la mercadería comprada como LOTE en products.batches (COONG-217/220) — el motor
 * de lotes unificado que leen Farmacia, Vacunación y la dispensación de recetas. El alta del
 * lote es la ÚNICA fuente de stock (products.batches.create ya suma a product.stock_current
 * vía su movimiento `in`), por eso ya no se alimenta products.stock por separado: eso duplicaba
 * el stock. Guarda el proveedor de la compra en el lote para trazar su origen. Blando: si
 * products no está, la salida igual queda registrada.
 */
async function feedBatch(
  it: SalidaItemInput,
  supplierId: string | null,
  accountId: string
): Promise<void> {
  if (!it.productId || !it.lote?.trim()) return;
  try {
    await actions.execute('products.batches.create', {
      data: {
        product_id: it.productId,
        batch_number: it.lote.trim(),
        expiration_date: vencToISO(it.expiration),
        quantity: String(it.quantity),
        purchase_price: String(it.unitCost),
        supplier_id: supplierId,
        // Origen del lote = la salida (cuenta payable) que lo dio de alta. Permite saltar
        // desde la trazabilidad del lote a la compra de donde vino. Genérico: products no
        // sabe qué es una "salida", solo guarda el id + un tipo opaco.
        metadata: { sourceAccountId: accountId, sourceType: 'salida' },
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
      // Lote como texto de display, guardado en source_ref para mostrarlo en el detalle
      // ("L-4471 · vence 15/12/2026"). El venc llega como ISO ("AAAA-MM-DD") del campo de fecha.
      const venc = it.expiration?.trim() || '';
      const vencSuffix = venc ? ` · vence ${fmtVenc(venc)}` : '';
      const loteRef = it.lote?.trim() ? `${it.lote.trim()}${vencSuffix}` : null;
      await actions.execute('billing.lines.add', {
        accountId,
        productId: it.productId,
        description: it.description.trim() || 'Ítem',
        quantity: String(it.quantity),
        unitPrice: String(it.unitCost),
        subtotal: String(it.quantity * it.unitCost),
        sourceType: 'compra',
        sourceRef: loteRef,
      });
      // Stock por UNA sola vía (sin doble contabilidad): si el ítem trae lote
      // (medicamento/vacuna) entra como lote en products.batches —que ya suma a
      // stock_current—; si no trae lote (insumo suelto) se registra un movimiento
      // 'in' directo. Antes corrían las dos y el stock se contaba dos veces.
      if (it.lote?.trim()) {
        await feedBatch(it, input.supplierId ?? null, accountId);
      } else if (it.productId) {
        await feedStockNoBatch(accountId, it);
      }
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
