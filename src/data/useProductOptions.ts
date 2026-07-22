import { getHostReact, actions } from '@coongro/plugin-sdk';

const React = getHostReact();
const { useState, useEffect } = React;

/** Categoría funcional para los 3 selectores del drawer de compra. */
export type ProductBucket = 'med' | 'vacc' | 'insumo';

export interface ProductOption {
  id: string;
  name: string;
  /** Precio de compra del catálogo — pre-rellena el costo de la línea. */
  purchasePrice: string | null;
  /** Med / Vacuna / Insumo — derivado del nombre de la categoría (heurístico). */
  bucket: ProductBucket;
}

/**
 * Fallback por nombre de categoría cuando el producto no está clasificado por los plugins
 * autoritativos (vaccination / vet-pharmacy no instalados, o un insumo genérico): "vacunas" →
 * vacc; sin categoría o medicamento/fármaco → med; el resto → insumo.
 */
/** Categoría (genérica de products) que es la FUENTE DE VERDAD de un insumo — igual que vet-inventory. */
const INSUMOS_CATEGORY = 'insumos';

function bucketOf(name: string | null): ProductBucket {
  const n = (name ?? '').toLowerCase();
  if (n.includes('vacun')) return 'vacc';
  if (
    !n ||
    n.includes('medic') ||
    n.includes('fármac') ||
    n.includes('farmac') ||
    n.includes('antibi')
  )
    return 'med';
  return 'insumo';
}

interface RawProduct {
  id: string;
  name: string;
  purchase_price: string | null;
  category_id: string | null;
}

interface RawCategory {
  id: string;
  name: string;
  parent_id: string | null;
}

/** Nombre del nodo padre que agrupa las categorías de SERVICIOS (no son inventario comprable). */
const SERVICE_PARENT = 'Servicios Veterinarios';

/**
 * IDs de categorías que son SERVICIOS: el nodo "Servicios Veterinarios" y todos sus hijos
 * (Consultas, Cirugías, Diagnóstico, etc.). Un vet no le "compra" una Castración a la droguería.
 */
function serviceCategoryIds(cats: RawCategory[]): Set<string> {
  const parents = new Set(cats.filter((c) => c.name === SERVICE_PARENT).map((c) => c.id));
  const ids = new Set<string>(parents);
  for (const c of cats) {
    if (c.parent_id && parents.has(c.parent_id)) ids.add(c.id);
  }
  return ids;
}

/**
 * Productos del catálogo (products.items.list) para elegir en las líneas de COMPRA. Excluye los
 * servicios (no se compran) y deduplica por nombre (el seed quedó duplicado). Blando: si products
 * no está, devuelve [] y las líneas se cargan como ítem suelto.
 */
export function useProductOptions(): ProductOption[] {
  const [options, setOptions] = useState<ProductOption[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        // Clasificación autoritativa: qué product_ids son vacuna / medicamento la definen los
        // plugins del kit (igual que la vista de Lotes), no una heurística por nombre. Ambos son
        // acoplamiento BLANDO: si el plugin no está, el set queda vacío y se cae al fallback.
        const [list, cats, vaccs, meds] = await Promise.all([
          actions.execute<RawProduct[]>('products.items.list'),
          actions
            .execute<RawCategory[]>('products.categories.list')
            .catch(() => [] as RawCategory[]),
          actions
            .execute<Array<{ product_id: string }>>('vaccination.catalog.list')
            .catch(() => [] as Array<{ product_id: string }>),
          actions
            .execute<Array<{ product_id: string }>>('vet-pharmacy.medications.list')
            .catch(() => [] as Array<{ product_id: string }>),
        ]);
        const serviceIds = serviceCategoryIds(cats ?? []);
        const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
        const vaccIds = new Set((vaccs ?? []).map((v) => v.product_id));
        const medIds = new Set((meds ?? []).map((m) => m.product_id));
        const seen = new Set<string>();
        const filtered = (list ?? []).filter((p) => {
          if (p.category_id && serviceIds.has(p.category_id)) return false; // servicio
          const key = p.name.trim().toLowerCase();
          if (seen.has(key)) return false; // duplicado
          seen.add(key);
          return true;
        });
        if (active) {
          setOptions(
            filtered.map((p) => ({
              id: p.id,
              name: p.name,
              purchasePrice: p.purchase_price,
              // Fuente de verdad por tipo: vacuna/med por los plugins del kit; insumo por la
              // categoría "Insumos" (igual que la vista de vet-inventory). El heurístico por
              // nombre queda solo de fallback para catálogos legacy sin clasificar.
              bucket: vaccIds.has(p.id)
                ? ('vacc' as ProductBucket)
                : medIds.has(p.id)
                  ? ('med' as ProductBucket)
                  : (p.category_id ? (catName.get(p.category_id) ?? '') : '')
                        .trim()
                        .toLowerCase() === INSUMOS_CATEGORY
                    ? ('insumo' as ProductBucket)
                    : bucketOf(p.category_id ? (catName.get(p.category_id) ?? null) : null),
            }))
          );
        }
      } catch {
        if (active) setOptions([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return options;
}
