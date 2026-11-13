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
 *   200 → { token, user: { id, email, rol, nombre, apellido } }
 *   400 → falta el email o la contraseña
 *   401 → credenciales incorrectas
 *   403 → la cuenta no está activa
 * Todos los errores vienen como { message: "..." }.
 *
 * @param {string} email
 * @param {string} contrasena - la contraseña tal cual la tipeó el usuario.
 * @returns {Promise<{id: number, email: string, rol: string, nombre: string, apellido: string}>} el usuario logueado.
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
 * @param {{id: number, rol: string, nombre?: string}} usuario - los datos del usuario logueado.
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
 * Datos del usuario logueado, para las pantallas que necesitan saber el rol
 * o saludarlo por su nombre. Las sesiones iniciadas antes de que el login
 * devolviera el nombre no lo tienen: quien lo use necesita un texto de respaldo.
 *
 * @returns {{id: number, rol: string, nombre?: string, apellido?: string}|null} el usuario, o null si no hay sesión.
 */
export function usuarioActual() {
  return obtenerSesion()?.usuario ?? null;
}

/**
 * Pantalla de inicio de un rol (HU 15/16/17): a donde manda el login y a
 * donde vuelve cualquier pantalla que necesite "el inicio de este usuario".
 *
 * @param {string} rol - 'administrador' o 'camionero'.
 * @returns {string} la ruta del panel de inicio de ese rol.
 */
export function rutaInicio(rol) {
  return rol === 'administrador' ? '/panel-administrador' : '/panel-camionero';
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

/** Clave donde queda el aviso que el login muestra cuando la sesión se cerró sola. */
const CLAVE_AVISO = 'aviso_sesion';

/**
 * Lee el aviso que dejó el cierre de sesión automático y lo borra, para que
 * aparezca una sola vez.
 *
 * @returns {string} el aviso, o cadena vacía si no había ninguno.
 */
export function tomarAvisoDeSesion() {
  try {
    const aviso = sessionStorage.getItem(CLAVE_AVISO) ?? '';
    sessionStorage.removeItem(CLAVE_AVISO);
    return aviso;
  } catch {
    // Sin sessionStorage no se muestra el aviso, pero la sesión igual se cerró.
    return '';
  }
}

/**
 * Reacciona a una respuesta que deja la sesión sin valor: un 401 (el token
 * falta, venció o dejó de ser válido) o el 403 de una cuenta dada de baja.
 *
 * Borra la sesión y manda al login. Se hace acá y no en cada pantalla para que
 * el manejo sea uno solo y no haya que acordarse de repetirlo en cada fetch.
 *
 * El 403 por falta de permisos no entra acá: la sesión sigue sirviendo y lo
 * único que pasa es que esa pantalla no le corresponde a ese rol. Por eso se
 * mira el `codigo` que manda el backend y no el código HTTP solo.
 *
 * @param {number} estado - código HTTP de la respuesta.
 * @param {object|null} [cuerpo] - cuerpo ya parseado de la respuesta, si lo hubo.
 * @returns {void}
 */
export function manejarNoAutorizado(estado, cuerpo = null) {
  const cuentaDeBaja = estado === 403 && cuerpo?.codigo === 'cuenta_inactiva';
  if (estado !== 401 && !cuentaDeBaja) return;

  if (cuentaDeBaja) {
    try {
      sessionStorage.setItem(CLAVE_AVISO, 'Tu cuenta fue dada de baja. Pedile a un administrador que la active.');
    } catch {
      // El aviso es opcional: lo importante es cerrar la sesión.
    }
  }

  cerrarSesion();

  // Se compara antes de navegar para no entrar en un bucle de redirecciones
  // si el 401 vino justamente de una llamada hecha desde el login.
  if (window.location.pathname !== '/') {
    window.location.assign('/');
  }
}
