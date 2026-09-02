/**
 * Capa de acceso al backend para el módulo de Usuarios.
 * Backend: Express en http://localhost:3000
 */

import { headersDeAuth, manejarNoAutorizado } from './sesion';

const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Error de la API. Guarda a qué campo del formulario corresponde el mensaje,
 * para poder mostrarlo debajo del input que lo causó.
 */
export class ErrorDeApi extends Error {
  constructor(mensaje, campo = null, estado = 0) {
    super(mensaje);
    this.name = 'ErrorDeApi';
    this.campo = campo;
    this.estado = estado;
  }
}

/**
 * El backend responde 400 con un único texto: { "message": "..." }.
 * No manda un objeto de errores por campo, así que deducimos el campo
 * a partir del mensaje para ubicarlo en el lugar correcto del formulario.
 *
 * Mensajes observados en el backend real:
 *   "El campo 'nombre' es obligatorio"
 *   "El campo 'ubicacion' es obligatorio para el rol camionero"
 *   "El email ya está registrado"
 *   "El DNI ya está registrado"
 */
export function campoDelMensaje(mensaje) {
  if (typeof mensaje !== 'string') return null;

  // "El campo 'X' es obligatorio [para el rol camionero]"
  const coincidencia = /el campo '([a-zA-Z_]+)'/i.exec(mensaje);
  if (coincidencia) return coincidencia[1];

  // Mensajes de duplicado, que no nombran el campo entre comillas.
  if (/email/i.test(mensaje)) return 'email';
  if (/\bdni\b/i.test(mensaje)) return 'dni';
  if (/contrase(ñ|n)a|password/i.test(mensaje)) return 'password';
  if (/\brol\b/i.test(mensaje)) return 'rol';

  // Sin campo identificable: se muestra como error general del formulario.
  return null;
}

/**
 * POST /usuarios — da de alta un usuario.
 * @param {object} datos payload ya armado (sin campos de camionero si el rol no lo es)
 * @returns {Promise<object>} el usuario creado que devuelve el backend (201)
 * @throws {ErrorDeApi}
 */
export async function crearUsuario(datos) {
  let respuesta;

  try {
    respuesta = await fetch(`${URL_API}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  // Algunas respuestas de error pueden no traer JSON válido.
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
    throw new ErrorDeApi(mensaje, campoDelMensaje(mensaje), respuesta.status);
  }

  return cuerpo;
}

/**
 * GET /usuarios (HU 1.2) — lista los usuarios registrados.
 *
 * Los cuatro filtros son opcionales y combinables entre sí. El que llega vacío
 * no se manda como query param.
 *
 * @param {object} [filtros]
 * @param {string} [filtros.nombre] - texto a buscar dentro del nombre.
 * @param {string} [filtros.dni]    - texto a buscar dentro del DNI.
 * @param {string} [filtros.rol]    - `'administrador'` o `'camionero'`.
 * @param {string} [filtros.estado] - `'activo'` o `'inactivo'`.
 * @param {object} [opciones]
 * @param {AbortSignal} [opciones.signal] - para cancelar el pedido si se dispara otro antes.
 * @returns {Promise<object[]>} los usuarios que cumplen los filtros; `[]` si ninguno coincide.
 * @throws {DOMException} `AbortError` si se canceló el pedido (se deja propagar tal cual).
 * @throws {ErrorDeApi} si el backend rechaza un filtro (400) o falla (500, sin conexión).
 */
export async function listarUsuarios(filtros = {}, opciones = {}) {
  const params = new URLSearchParams();
  for (const clave of ['nombre', 'dni', 'rol', 'estado']) {
    const valor = String(filtros[clave] ?? '').trim();
    if (valor) params.set(clave, valor);
  }
  const consulta = params.toString();

  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}/usuarios${consulta ? `?${consulta}` : ''}`, {
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
    // Un 401 significa que el token falta, vencio o dejo de servir:
    // se limpia la sesion y se vuelve al login.
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
 * PUT /usuarios/:id (HU 1.2) — edita nombre, apellido, email y estado de un
 * usuario existente (y, si es camionero, sus datos de vehículo).
 *
 * El backend rechaza con 400 si el payload incluye `dni`, `rol` o `contraseña`:
 * esos campos no se pueden tocar desde este endpoint.
 *
 * @param {number} idUsuario - id del usuario a editar.
 * @param {object} datos - `{ nombre, apellido, email, estado, ubicacion?, tipo_vehiculo?, capacidad_kg? }`.
 * @returns {Promise<object>} el usuario actualizado que devuelve el backend (200).
 * @throws {ErrorDeApi} por validación (400), usuario inexistente (404) o error inesperado.
 */
export async function editarUsuario(idUsuario, datos) {
  let respuesta;

  try {
    respuesta = await fetch(`${URL_API}/usuarios/${idUsuario}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headersDeAuth() },
      body: JSON.stringify(datos),
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
    // Un 401 significa que el token falta, vencio o dejo de servir:
    // se limpia la sesion y se vuelve al login.
    manejarNoAutorizado(respuesta.status);
    const mensaje =
      cuerpo?.message ??
      cuerpo?.error ??
      `Ocurrió un error inesperado (código ${respuesta.status}).`;
    throw new ErrorDeApi(mensaje, campoDelMensaje(mensaje), respuesta.status);
  }

  return cuerpo;
}
