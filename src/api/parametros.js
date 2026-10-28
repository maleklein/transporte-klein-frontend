/**
 * Capa de acceso al backend para los parámetros operativos (HU 10).
 * Backend: Express en http://localhost:3000
 */

import { ErrorDeApi } from './usuarios';
import { ErrorDeValidacion } from './cargas';
import { headersDeAuth, manejarNoAutorizado } from './sesion';

/** URL base del backend. Se puede pisar con la variable de entorno VITE_API_URL. */
const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Hace el pedido a `/parametros-operativos` y traduce la respuesta. Los dos
 * endpoints responden lo mismo (la lista de parámetros), así que comparten
 * todo menos el método y el body.
 *
 * @param {object} [opciones] - método y body de `fetch`.
 * @returns {Promise<Array<object>>} los parámetros tal cual los devuelve el backend.
 * @throws {ErrorDeValidacion} si el backend rechazó valores puntuales (400).
 * @throws {ErrorDeApi} para el resto de los errores (401, 403, 500, sin conexión).
 */
async function pedirParametros(opciones = {}) {
  let respuesta;

  try {
    respuesta = await fetch(`${URL_API}/parametros-operativos`, {
      ...opciones,
      headers: { 'Content-Type': 'application/json', ...headersDeAuth() },
    });
  } catch {
    // El servidor no respondió (apagado, sin red, CORS bloqueado).
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

    if (cuerpo?.errores && typeof cuerpo.errores === 'object') {
      throw new ErrorDeValidacion(mensaje, cuerpo.errores, respuesta.status);
    }

    throw new ErrorDeApi(mensaje, null, respuesta.status);
  }

  return cuerpo;
}

/**
 * GET /parametros-operativos (HU 10 - solo administrador) — los valores
 * vigentes de la fórmula de costos, con descripción y fecha de modificación.
 *
 * @returns {Promise<Array<{clave: string, valor: number, descripcion: string|null, actualizado_en: string}>>}
 * @throws {ErrorDeApi} si el backend no autoriza (401/403) o falla (500, sin conexión).
 */
export function obtenerParametros() {
  return pedirParametros();
}

/**
 * PUT /parametros-operativos (HU 10 - solo administrador) — reemplaza los
 * tres valores. No recalcula las cargas que ya tienen su estimación.
 *
 * @param {{costo_por_km: number, peaje_por_km: number, tarifa_por_km: number}} valores
 * @returns {Promise<Array<object>>} los parámetros ya actualizados.
 * @throws {ErrorDeValidacion} si el backend rechazó valores puntuales (400).
 * @throws {ErrorDeApi} para el resto de los errores.
 */
export function actualizarParametros(valores) {
  return pedirParametros({ method: 'PUT', body: JSON.stringify(valores) });
}
