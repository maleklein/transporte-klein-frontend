/**
 * Capa de acceso al backend para el módulo de Cargas.
 * Backend: Express en http://localhost:3000
 */

import { ErrorDeApi } from './usuarios';
import { headersDeAuth } from './sesion';

/** URL base del backend. Se puede pisar con la variable de entorno VITE_API_URL. */
const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Error de validación de `POST /cargas`.
 *
 * A diferencia del módulo de usuarios, este endpoint devuelve los errores ya
 * agrupados por campo: `{ message, errores: { campo: mensaje } }`. No hace falta
 * deducir el campo a partir del texto.
 */
export class ErrorDeValidacion extends ErrorDeApi {
  constructor(mensaje, errores, estado) {
    super(mensaje, null, estado);
    this.name = 'ErrorDeValidacion';
    this.errores = errores;
  }
}

/**
 * POST /cargas — da de alta una carga en estado "disponible".
 *
 * @param {object} datos payload del formulario ya normalizado.
 * @returns {Promise<object>} la carga creada que devuelve el backend (201).
 * @throws {ErrorDeValidacion} si el backend rechazó campos puntuales (400).
 * @throws {ErrorDeApi} para el resto de los errores (401, 403, 500, sin conexión).
 */
export async function crearCarga(datos) {
  let respuesta;

  try {
    respuesta = await fetch(`${URL_API}/cargas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headersDeAuth() },
      body: JSON.stringify(datos),
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
 * GET /cargas (HU 2.5) — lista las cargas registradas.
 *
 * Los tres filtros son opcionales y combinables entre sí. El que llega vacío no
 * se manda como query param. El backend interpreta `destino` como coincidencia
 * parcial (no hace falta el nombre exacto).
 *
 * @param {object} [filtros]
 * @param {string} [filtros.estado]  - `estado_actual` exacto ("disponible", "publicada", ...).
 * @param {string} [filtros.fecha]   - fecha exacta en formato AAAA-MM-DD.
 * @param {string} [filtros.destino] - texto a buscar dentro del destino.
 * @param {object} [opciones]
 * @param {AbortSignal} [opciones.signal] - para cancelar el pedido si se dispara otro antes.
 * @returns {Promise<object[]>} las cargas que cumplen los filtros; `[]` si ninguna coincide.
 * @throws {DOMException} `AbortError` si se canceló el pedido (se deja propagar tal cual).
 * @throws {ErrorDeApi} si el backend rechaza un filtro (400) o falla (500, sin conexión).
 */
export async function listarCargas(filtros = {}, opciones = {}) {
  const params = new URLSearchParams();
  for (const clave of ['estado', 'fecha', 'destino']) {
    const valor = String(filtros[clave] ?? '').trim();
    if (valor) params.set(clave, valor);
  }
  const consulta = params.toString();

  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}/cargas${consulta ? `?${consulta}` : ''}`, {
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
    const mensaje =
      cuerpo?.message ??
      cuerpo?.error ??
      `Ocurrió un error inesperado (código ${respuesta.status}).`;
    throw new ErrorDeApi(mensaje, null, respuesta.status);
  }

  return Array.isArray(cuerpo) ? cuerpo : [];
}
