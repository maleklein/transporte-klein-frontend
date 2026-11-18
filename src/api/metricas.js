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
 * Con las dos fechas pide ese período. Sin ninguna pide todos los tiempos
 * (`periodo=todo`): no se deja al rango por defecto del backend, que son los
 * últimos 30 días. El período que se usó vuelve en `periodo` de la respuesta.
 *
 * @param {object} periodo
 * @param {string} periodo.fechaDesde - inicio del período (AAAA-MM-DD), o '' para todos los tiempos.
 * @param {string} periodo.fechaHasta - fin del período (AAAA-MM-DD), o '' para todos los tiempos.
 * @param {object} [opciones]
 * @param {AbortSignal} [opciones.signal] - para cancelar el pedido si se dispara otro antes.
 * @returns {Promise<object>} el objeto de métricas tal cual lo devuelve el backend.
 * @throws {DOMException} `AbortError` si se canceló el pedido (se deja propagar tal cual).
 * @throws {ErrorDeApi} si el backend rechaza el período (400), no autoriza (401/403) o falla (500, sin conexión).
 */
export async function obtenerMetricas({ fechaDesde, fechaHasta }, opciones = {}) {
  const params = new URLSearchParams(
    fechaDesde || fechaHasta ? { fecha_desde: fechaDesde, fecha_hasta: fechaHasta } : { periodo: 'todo' },
  );

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
    // Si el token dejó de servir o la cuenta está dada de baja,
    // se limpia la sesión y se vuelve al login.
    manejarNoAutorizado(respuesta.status, cuerpo);
    const mensaje =
      cuerpo?.message ??
      cuerpo?.error ??
      `Ocurrió un error inesperado (código ${respuesta.status}).`;
    throw new ErrorDeApi(mensaje, null, respuesta.status);
  }

  return cuerpo;
}
