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
 * Bucket por nombre de categoría: "vacunas" → vacc; sin categoría o medicamento/fármaco →
 * med; el resto → insumo. Pragmático para el seed actual (vacunas + 2 meds sin categoría);
 * si products gana una taxonomía propia, esto se reemplaza por el campo real.
 */
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
        const [list, cats] = await Promise.all([
          actions.execute<RawProduct[]>('products.items.list'),
          actions
            .execute<RawCategory[]>('products.categories.list')
            .catch(() => [] as RawCategory[]),
        ]);
        const serviceIds = serviceCategoryIds(cats ?? []);
        const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
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
              bucket: bucketOf(p.category_id ? (catName.get(p.category_id) ?? null) : null),
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
