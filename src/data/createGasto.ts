import { actions } from '@coongro/plugin-sdk';

export interface CreateGastoInput {
  /** Categoría del gasto (retiro / fijos / otro). */
  category: string;
  amount: number;
  notes?: string | null;
}

/**
 * Registra un GASTO simple como egreso de caja (billing.expenses). billing.expenses es el
 * ledger de salidas de EFECTIVO del cajón, así que un gasto registrado acá cuenta para el
 * arqueo. El soporte de gasto por otros medios (transferencia/débito/crédito) + estado
 * pagada/a-pagar necesita una tabla `salida` propia con medio/estado — diferido (ver memoria
 * salidas_entity_spec_coong212). billing es blando: si no está, el gasto no se persiste.
 */
export async function createGasto(input: CreateGastoInput): Promise<void> {
  await actions.execute('billing.expenses.record', {
    amount: String(input.amount),
    category: input.category,
    notes: input.notes?.trim() || null,
  });
}
