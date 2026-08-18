/**
 * Capa de acceso al backend para el módulo de Usuarios.
 * Backend: Express en http://localhost:3000
 */

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
    const mensaje =
      cuerpo?.message ??
      cuerpo?.error ??
      `Ocurrió un error inesperado (código ${respuesta.status}).`;
    throw new ErrorDeApi(mensaje, campoDelMensaje(mensaje), respuesta.status);
  }

  return cuerpo;
}
