/**
 * @coongro/purchases — Plugin lifecycle entry point.
 *
 * activate() se invoca al cargar el plugin en un tenant. Las acciones (suppliers / records /
 * lines) se auto-registran desde el manifest, y la orquestación compra → stock/caja vive en
 * el frontend (data/createPurchase). Por ahora no hace falta inicialización adicional.
 */
export function activate(): void {
  // no-op
}
