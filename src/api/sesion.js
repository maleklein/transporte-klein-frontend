/**
 * Sesión del usuario logueado.
 *
 * TODO (GIA-39): hoy el backend no verifica el JWT, así que las pantallas mandan
 * el id del usuario en el header `x-usuario-id`. Cuando exista el middleware de
 * autenticación, esto pasa a devolver el header `Authorization: Bearer <token>`
 * y el resto de la app no debería enterarse del cambio.
 *
 * La pantalla de login todavía no guarda nada (hoy es sólo un test de conexión),
 * así que por ahora la sesión se escribe a mano desde la consola del navegador:
 *   localStorage.setItem('sesion', JSON.stringify({ id: 1, rol: 'administrador' }))
 */

const CLAVE = 'sesion';

/**
 * Lee la sesión guardada.
 *
 * @returns {{id: number, rol: string}|null} datos del usuario, o null si no hay sesión.
 */
export function obtenerSesion() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;

    const sesion = JSON.parse(crudo);
    return Number.isInteger(sesion?.id) ? sesion : null;
  } catch {
    // localStorage con contenido corrupto: se trata como si no hubiera sesión.
    return null;
  }
}

/**
 * Headers de autenticación para las llamadas al backend.
 *
 * @returns {object} headers a mezclar en el fetch (vacío si no hay sesión).
 */
export function headersDeAuth() {
  const sesion = obtenerSesion();
  return sesion ? { 'x-usuario-id': String(sesion.id) } : {};
}
