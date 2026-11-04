/**
 * Capa de acceso al backend para la asignación de cargas (HU 6).
 */

import { ErrorDeApi } from './usuarios';
import { headersDeAuth, manejarNoAutorizado } from './sesion';

/** URL base del backend. Se puede pisar con la variable de entorno VITE_API_URL. */
const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * POST /cargas/:id/asignar (HU 6) — asigna una carga a uno de sus camioneros
 * postulados.
 *
 * El backend la pasa a "aceptada", marca la postulación elegida como aceptada y
 * las demás como rechazadas, y avisa a todos (HU 12). Devuelve la carga ya
 * actualizada, así el detalle se redibuja sin volver a pedirla.
 *
 * @param {number|string} idCarga - `id_carga` de la carga.
 * @param {number} idCamionero - id del camionero elegido entre los postulados.
 * @returns {Promise<object>} la carga asignada.
 * @throws {ErrorDeApi} si la carga no existe (404), si no se puede asignar
 *   (409: no está pendiente, ya tiene camionero, o el elegido no está postulado
 *   o tiene la cuenta inactiva), o para el resto de los errores (400, 401, 403,
 *   500, sin conexión).
 */
export async function asignarCargaACamionero(idCarga, idCamionero) {
  let respuesta;

  try {
    respuesta = await fetch(`${URL_API}/cargas/${encodeURIComponent(idCarga)}/asignar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headersDeAuth() },
      body: JSON.stringify({ id_camionero: idCamionero }),
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
    // Un 401 significa que el token falta, venció o dejó de servir:
    // se limpia la sesión y se vuelve al login.
    manejarNoAutorizado(respuesta.status);
    const mensaje =
      cuerpo?.message ??
      cuerpo?.error ??
      `Ocurrió un error inesperado (código ${respuesta.status}).`;
    throw new ErrorDeApi(mensaje, null, respuesta.status);
  }

  return cuerpo;
}
