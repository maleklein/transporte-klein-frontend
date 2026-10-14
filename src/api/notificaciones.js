/**
 * Capa de acceso al backend para las notificaciones (HU 12).
 *
 * Los avisos los genera el backend solo, ante cada evento (carga nueva,
 * asignación, cambio de estado): desde acá únicamente se consultan y se
 * marcan como leídos.
 */

import { ErrorDeApi } from './usuarios';
import { headersDeAuth, manejarNoAutorizado } from './sesion';

/** URL base del backend. Se puede pisar con la variable de entorno VITE_API_URL. */
const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Nombre del evento de ventana que avisa que cambió alguna notificación.
 *
 * Lo dispara `marcarNotificacionLeida` después de marcar una, y lo escucha el
 * contador de la barra superior para bajar en el momento en vez de esperar a
 * la próxima consulta.
 */
export const EVENTO_NOTIFICACIONES_CAMBIARON = 'notificaciones-cambiaron';

/**
 * GET /notificaciones — las notificaciones del usuario logueado, la más
 * reciente primero. El backend devuelve 100 como máximo.
 *
 * @param {object} [filtros]
 * @param {boolean} [filtros.soloNoLeidas] - true para traer sólo las que faltan leer.
 * @param {object} [opciones]
 * @param {AbortSignal} [opciones.signal] - para cancelar el pedido.
 * @returns {Promise<object[]>} las notificaciones; `[]` si no tiene ninguna.
 * @throws {DOMException} `AbortError` si se canceló el pedido (se deja propagar).
 * @throws {ErrorDeApi} si el backend falla (400, 500, sin conexión).
 */
export async function listarNotificaciones(filtros = {}, opciones = {}) {
  const consulta = filtros.soloNoLeidas ? '?solo_no_leidas=true' : '';

  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}/notificaciones${consulta}`, {
      headers: { ...headersDeAuth() },
      signal: opciones.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ErrorDeApi(
      'No se pudo conectar con el servidor. Verificá que el sistema esté encendido e intentá de nuevo.',
      null,
      0,
    );
  }

  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }

  if (!respuesta.ok) {
    // Un 401 significa que el token falta, venció o dejó de servir:
    // se limpia la sesión y se vuelve al login.
    manejarNoAutorizado(respuesta.status);
    const mensaje =
      cuerpo?.message ??
      cuerpo?.error ??
      `Ocurrió un error inesperado (código ${respuesta.status}).`;
    throw new ErrorDeApi(mensaje, null, respuesta.status);
  }

  return Array.isArray(cuerpo) ? cuerpo : [];
}

/**
 * PUT /notificaciones/:id/leida — marca una notificación como leída.
 *
 * Marcar una que ya estaba leída no es un error. Si la notificación es de
 * otro usuario, el backend responde 404, igual que si no existiera.
 *
 * @param {number|string} id - `id_notificacion`.
 * @returns {Promise<object>} la notificación ya marcada.
 * @throws {ErrorDeApi} si no existe (404) o el backend falla (400, 500, sin conexión).
 */
export async function marcarNotificacionLeida(id) {
  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}/notificaciones/${encodeURIComponent(id)}/leida`, {
      method: 'PUT',
      headers: { ...headersDeAuth() },
    });
  } catch {
    throw new ErrorDeApi(
      'No se pudo conectar con el servidor. Verificá que el sistema esté encendido e intentá de nuevo.',
      null,
      0,
    );
  }

  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }

  if (!respuesta.ok) {
    manejarNoAutorizado(respuesta.status);
    const mensaje =
      cuerpo?.message ??
      cuerpo?.error ??
      `Ocurrió un error inesperado (código ${respuesta.status}).`;
    throw new ErrorDeApi(mensaje, null, respuesta.status);
  }

  window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES_CAMBIARON));
  return cuerpo;
}
