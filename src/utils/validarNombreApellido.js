/**
 * Validación de nombre y apellido, compartida entre el alta (AltaUsuario.jsx,
 * HU 1.1) y la edición (EditarUsuario.jsx, HU 1.2) de usuarios.
 *
 * El backend (`usuarioControllers.js`) sólo exige que no estén vacíos, y la
 * columna es `VARCHAR(50)`; esto agrega en el cliente lo que falta para
 * avisar antes de enviar: el largo máximo y que sean nombres de persona
 * (letras —incluidas tildes y ñ—, espacios, guion y apóstrofe).
 */

/** Mismo largo que la columna `nombre`/`apellido` en la tabla USUARIO. */
export const LARGO_MAXIMO_NOMBRE_APELLIDO = 50;

/**
 * Letras (cualquier idioma, vía `\p{L}` con la flag `u`) separadas por a lo
 * sumo un espacio, guion o apóstrofe entre ellas; siempre empieza con una
 * letra. No hay largo mínimo: una sola letra ya cumple.
 */
const PATRON_NOMBRE_APELLIDO = /^[\p{L}][\p{L} '-]*$/u;

/**
 * Valida un campo de nombre o apellido con las mismas reglas para los dos.
 *
 * @param {string} valor - lo que escribió el usuario en el campo.
 * @param {string} etiqueta - "nombre" o "apellido", para armar el mensaje.
 * @returns {string|undefined} el mensaje de error, o `undefined` si es válido.
 */
export function validarNombreApellido(valor, etiqueta) {
  const limpio = valor.trim();

  if (!limpio) {
    return `Ingresá el ${etiqueta}.`;
  }

  if (limpio.length > LARGO_MAXIMO_NOMBRE_APELLIDO) {
    return `El ${etiqueta} no puede superar los ${LARGO_MAXIMO_NOMBRE_APELLIDO} caracteres.`;
  }

  if (!PATRON_NOMBRE_APELLIDO.test(limpio)) {
    return `El ${etiqueta} solo puede contener letras, espacios, guiones y apóstrofes.`;
  }

  return undefined;
}
