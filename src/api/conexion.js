/**
 * Pedidos al backend cuando puede faltar la conexión.
 *
 * - `leerConReintentos` reemplaza a `fetch` en las lecturas (GET): si el
 *   pedido no sale, lo reintenta en silencio un par de veces antes de darlo
 *   por perdido. Las acciones (POST, PUT, PATCH) no se reintentan solas: si el
 *   pedido llegó pero se perdió la respuesta, repetirlo podría, por ejemplo,
 *   registrar la carga dos veces.
 * - `errorSinConexion` arma el error que lanzan todas las funciones de
 *   `src/api/` cuando el `fetch` falla.
 * - `servidorDisponible` consulta `GET /health`, que usa `ControlConexion`
 *   para saber cuándo volvió la conexión.
 */

import { ErrorDeApi } from './errores';
import { ESPERAS_SILENCIOSAS_MS, ESTADOS_SIN_RESPUESTA } from '../utils/conexion';

/** URL base del backend. Se puede pisar con la variable de entorno VITE_API_URL. */
const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Mensaje de las funciones de la API cuando no hay conexión. */
export const MENSAJE_SIN_CONEXION = 'No hay conexión con el sistema. Revisá tu conexión y volvé a intentar.';

/**
 * Error que lanzan las funciones de `src/api/` cuando el pedido no llegó al
 * servidor (apagado, sin red, CORS bloqueado).
 *
 * @returns {ErrorDeApi} con `estado` 0 y `sinConexion` en true.
 */
export function errorSinConexion() {
  const error = new ErrorDeApi(MENSAJE_SIN_CONEXION, null, 0);
  error.sinConexion = true;
  return error;
}

/**
 * Espera `ms` milisegundos, o hasta que se cancele el pedido.
 *
 * @param {number} ms
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 * @throws {DOMException} `AbortError` si se canceló mientras esperaba.
 */
function esperar(ms, signal) {
  return new Promise((resolver, rechazar) => {
    if (signal?.aborted) {
      rechazar(signal.reason ?? new DOMException('Pedido cancelado', 'AbortError'));
      return;
    }
    const temporizador = setTimeout(() => {
      signal?.removeEventListener('abort', alCancelar);
      resolver();
    }, ms);
    function alCancelar() {
      clearTimeout(temporizador);
      rechazar(signal.reason ?? new DOMException('Pedido cancelado', 'AbortError'));
    }
    signal?.addEventListener('abort', alCancelar, { once: true });
  });
}

/**
 * `fetch` para lecturas, con reintentos silenciosos: si el pedido falla por
 * red, o Railway responde que el backend no contesta (502, 503, 504), espera
 * y lo repite, con las esperas de `ESPERAS_SILENCIOSAS_MS`.
 *
 * Se usa igual que `fetch`, y quien llama maneja la respuesta y los errores
 * como siempre.
 *
 * @param {string} url
 * @param {RequestInit} [opciones] - las de `fetch`; `signal` también corta las esperas.
 * @returns {Promise<Response>} la última respuesta, aunque sea un 502-504.
 * @throws {TypeError} si el último intento tampoco llegó al servidor.
 * @throws {DOMException} `AbortError` si se canceló el pedido.
 */
export async function leerConReintentos(url, opciones = {}) {
  for (let intento = 0; ; intento += 1) {
    const ultimo = intento >= ESPERAS_SILENCIOSAS_MS.length;
    try {
      const respuesta = await fetch(url, opciones);
      if (ultimo || !ESTADOS_SIN_RESPUESTA.includes(respuesta.status)) return respuesta;
    } catch (error) {
      if (error?.name === 'AbortError' || ultimo) throw error;
    }
    await esperar(ESPERAS_SILENCIOSAS_MS[intento], opciones.signal);
  }
}

/**
 * Pregunta si el backend volvió a responder (`GET /health`, que es público y
 * contesta 200 solo si también responde la base).
 *
 * @returns {Promise<boolean>}
 */
export async function servidorDisponible() {
  try {
    const respuesta = await fetch(`${URL_API}/health`, { cache: 'no-store' });
    return respuesta.ok;
  } catch {
    return false;
  }
}
