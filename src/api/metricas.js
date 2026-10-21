/**
 * Capa de acceso al backend para el panel de métricas (HU 13).
 * Backend: Express en http://localhost:3000
 */

import { ErrorDeApi } from './usuarios';
import { headersDeAuth, manejarNoAutorizado } from './sesion';

/** URL base del backend. Se puede pisar con la variable de entorno VITE_API_URL. */
const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * GET /metricas (HU 13 - solo administrador) — trae las métricas y
 * estadísticas del sistema para un período.
 *
 * Las dos fechas son obligatorias y se mandan siempre explícitas (el llamador
 * no depende del rango por defecto del backend).
 *
 * @param {object} periodo
 * @param {string} periodo.fechaDesde - inicio del período, formato AAAA-MM-DD.
 * @param {string} periodo.fechaHasta - fin del período, formato AAAA-MM-DD.
 * @param {object} [opciones]
 * @param {AbortSignal} [opciones.signal] - para cancelar el pedido si se dispara otro antes.
 * @returns {Promise<object>} el objeto de métricas tal cual lo devuelve el backend.
 * @throws {DOMException} `AbortError` si se canceló el pedido (se deja propagar tal cual).
 * @throws {ErrorDeApi} si el backend rechaza el período (400), no autoriza (401/403) o falla (500, sin conexión).
 */
export async function obtenerMetricas({ fechaDesde, fechaHasta }, opciones = {}) {
  const params = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });

  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}/metricas?${params.toString()}`, {
      headers: { ...headersDeAuth() },
      signal: opciones.signal,
    });
  } catch (error) {
    // Un pedido cancelado no es un error a mostrar: lo maneja quien llamó.
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
    // Un 401 significa que el token falta, vencio o dejo de servir:
    // se limpia la sesion y se vuelve al login.
    manejarNoAutorizado(respuesta.status);
    const mensaje =
      cuerpo?.message ??
      cuerpo?.error ??
      `Ocurrió un error inesperado (código ${respuesta.status}).`;
    throw new ErrorDeApi(mensaje, null, respuesta.status);
  }

  return cuerpo;
}
