/**
 * Sesión del usuario logueado.
 *
 * Guarda el token que devuelve `POST /auth/login` y lo manda en el header
 * `Authorization: Bearer <token>` de cada llamada autenticada, que es lo que
 * espera el middleware `verifyToken` del backend (GIA-39).
 *
 * NOTA (GIA-32): la pantalla de login todavía no está hecha, así que por ahora
 * la sesión se arma a mano. Pedí un token desde la terminal:
 *
 *   curl -s -X POST http://localhost:3000/auth/login \
 *     -H 'Content-Type: application/json' \
 *     -d '{"email":"TU_EMAIL","contraseña":"TU_CLAVE"}'
 *
 * y pegá la respuesta en la consola del navegador:
 *
 *   localStorage.setItem('sesion', JSON.stringify({ token: 'eyJ...', usuario: { id: 1, rol: 'administrador' } }))
 *
 * Cuando el login exista, sólo tiene que llamar a `guardarSesion(token, usuario)`
 * con lo que devuelve el endpoint y el resto de la app no se entera del cambio.
 */

/** Clave con la que se guarda la sesión en `localStorage`. */
const CLAVE = 'sesion';

/**
 * Lee la sesión guardada.
 *
 * @returns {{token: string, usuario: {id: number, rol: string}}|null}
 *   la sesión, o null si no hay ninguna guardada o el contenido no sirve.
 */
export function obtenerSesion() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;

    const sesion = JSON.parse(crudo);
    return typeof sesion?.token === 'string' && sesion.token ? sesion : null;
  } catch {
    // localStorage con contenido corrupto: se trata como si no hubiera sesión.
    return null;
  }
}

/**
 * Guarda la sesión después de un login exitoso.
 *
 * @param {string} token - el JWT que devolvió `POST /auth/login`.
 * @param {{id: number, rol: string}} usuario - los datos del usuario logueado.
 * @returns {void}
 */
export function guardarSesion(token, usuario) {
  localStorage.setItem(CLAVE, JSON.stringify({ token, usuario }));
}

/**
 * Borra la sesión guardada. Se usa al cerrar sesión y cuando el backend
 * responde 401, porque en ese punto el token que tenemos ya no sirve.
 *
 * @returns {void}
 */
export function cerrarSesion() {
  localStorage.removeItem(CLAVE);
}

/**
 * Datos del usuario logueado, para las pantallas que necesitan saber el rol.
 *
 * @returns {{id: number, rol: string}|null} el usuario, o null si no hay sesión.
 */
export function usuarioActual() {
  return obtenerSesion()?.usuario ?? null;
}

/**
 * Headers de autenticación para las llamadas al backend.
 *
 * @returns {object} el header `Authorization`, o un objeto vacío si no hay sesión.
 */
export function headersDeAuth() {
  const sesion = obtenerSesion();
  return sesion ? { Authorization: `Bearer ${sesion.token}` } : {};
}

/**
 * Reacciona a un 401 del backend: el token falta, venció o dejó de ser válido.
 *
 * Borra la sesión y manda al login. Se hace acá y no en cada pantalla para que
 * el manejo sea uno solo y no haya que acordarse de repetirlo en cada fetch.
 *
 * @param {number} estado - código HTTP de la respuesta.
 * @returns {void}
 */
export function manejarNoAutorizado(estado) {
  if (estado !== 401) return;

  cerrarSesion();

  // Se compara antes de navegar para no entrar en un bucle de redirecciones
  // si el 401 vino justamente de una llamada hecha desde el login.
  if (window.location.pathname !== '/') {
    window.location.assign('/');
  }
}
