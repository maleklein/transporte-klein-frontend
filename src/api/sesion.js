/**
 * Sesión del usuario logueado.
 *
 * Guarda el token que devuelve `POST /auth/login` y lo manda en el header
 * `Authorization: Bearer <token>` de cada llamada autenticada, que es lo que
 * espera el middleware `verifyToken` del backend (GIA-39).
 *
 * La pantalla de login (`login.jsx`, HU 1.4) llama a `iniciarSesion(email, clave)`
 * de este módulo, que pega a `POST /auth/login` y guarda lo que devuelve con
 * `guardarSesion(token, usuario)`. El resto de la app sólo lee la sesión con
 * `obtenerSesion` / `headersDeAuth` y no se entera de cómo se creó.
 */

/** Clave con la que se guarda la sesión en `localStorage`. */
const CLAVE = 'sesion';

/** URL base del backend. Se puede pisar con la variable de entorno VITE_API_URL. */
const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * `POST /auth/login` — valida las credenciales contra el backend y, si son
 * correctas, deja la sesión guardada para el resto de la app.
 *
 * El backend espera el body en español con ñ: `{ email, contraseña }` (no
 * "password"). `JSON.stringify` serializa esa clave como UTF-8, que es lo que
 * el backend destructura.
 *
 * Respuestas del backend:
 *   200 → { token, user: { id, email, rol } }
 *   400 → falta el email o la contraseña
 *   401 → credenciales incorrectas
 *   403 → la cuenta no está activa
 * Todos los errores vienen como { message: "..." }.
 *
 * @param {string} email
 * @param {string} contrasena - la contraseña tal cual la tipeó el usuario.
 * @returns {Promise<{id: number, email: string, rol: string}>} el usuario logueado.
 * @throws {Error} con un `.message` mostrable si el backend rechaza o no responde.
 */
export async function iniciarSesion(email, contrasena) {
  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, contraseña: contrasena }),
    });
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verificá que el sistema esté encendido e intentá de nuevo.',
    );
  }

  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }

  if (!respuesta.ok) {
    throw new Error(cuerpo?.message ?? `No se pudo iniciar sesión (código ${respuesta.status}).`);
  }

  guardarSesion(cuerpo.token, cuerpo.user);
  return cuerpo.user;
}

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
