/**
 * Validación de los campos del formulario de usuario (DNI, email, contraseña,
 * y los propios del camionero: ubicación, tipo de vehículo, capacidad),
 * compartida entre el alta (AltaUsuario.jsx, HU 1.1) y la edición
 * (EditarUsuario.jsx, HU 1.2). Nombre y apellido se validan por separado en
 * `validarNombreApellido.js`.
 *
 * El backend (`usuarioControllers.js`) sólo exige que estos campos no estén
 * vacíos (y que `capacidad_kg` sea numérica); no valida formato de DNI/email
 * ni largos máximos. Estas reglas son del lado del cliente, pensadas para
 * avisar antes de enviar; los largos de email/ubicación/tipo_vehiculo siguen
 * el tamaño real de la columna en la base (`email VARCHAR(100)`,
 * `ubicacion VARCHAR(150)`, `tipo_vehiculo VARCHAR(100)`, confirmado contra
 * la base viva). El de contraseña (72) es el límite práctico de bcrypt, no
 * una columna: `contraseña_hash` guarda el hash, no el texto.
 */

/** DNI argentino sin puntos ni espacios: 7 u 8 dígitos. */
const PATRON_DNI = /^\d{7,8}$/;

/**
 * @param {string} valor - lo que escribió el usuario en el campo DNI.
 * @returns {string|undefined} el mensaje de error, o `undefined` si es válido.
 */
export function validarDni(valor) {
  const limpio = valor.trim();

  if (!limpio) {
    return 'Ingresá el DNI.';
  }

  if (!PATRON_DNI.test(limpio)) {
    return 'El DNI debe tener 7 u 8 números, sin puntos ni espacios.';
  }

  return undefined;
}

export const LARGO_MAXIMO_EMAIL = 100;

/** nombre@dominio.ext: sin espacios, una sola arroba, extensión de 2+ letras. */
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * @param {string} valor - lo que escribió el usuario en el campo email.
 * @returns {string|undefined} el mensaje de error, o `undefined` si es válido.
 */
export function validarEmail(valor) {
  const limpio = valor.trim();

  if (!limpio) {
    return 'Ingresá el email.';
  }

  if (limpio.length > LARGO_MAXIMO_EMAIL) {
    return `El email no puede superar los ${LARGO_MAXIMO_EMAIL} caracteres.`;
  }

  if (!PATRON_EMAIL.test(limpio)) {
    return 'Escribí un email válido. Ejemplo: nombre@mail.com';
  }

  return undefined;
}

export const LARGO_MINIMO_PASSWORD = 8;
export const LARGO_MAXIMO_PASSWORD = 72;

/**
 * Sólo se usa en el alta: la edición no permite tocar la contraseña.
 * No se le aplica `trim`: los espacios cuentan como parte de la contraseña.
 *
 * @param {string} valor - lo que escribió el usuario en el campo contraseña.
 * @returns {string|undefined} el mensaje de error, o `undefined` si es válido.
 */
export function validarPassword(valor) {
  if (!valor) {
    return 'Ingresá una contraseña.';
  }

  if (valor.length < LARGO_MINIMO_PASSWORD) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres.`;
  }

  if (valor.length > LARGO_MAXIMO_PASSWORD) {
    return `La contraseña no puede superar los ${LARGO_MAXIMO_PASSWORD} caracteres.`;
  }

  return undefined;
}

export const LARGO_MAXIMO_UBICACION = 150;

/**
 * @param {string} valor - lo que escribió el usuario en el campo ubicación.
 * @returns {string|undefined} el mensaje de error, o `undefined` si es válido.
 */
export function validarUbicacion(valor) {
  const limpio = valor.trim();

  if (!limpio) {
    return 'Ingresá la ubicación del camionero.';
  }

  if (limpio.length > LARGO_MAXIMO_UBICACION) {
    return `La ubicación no puede superar los ${LARGO_MAXIMO_UBICACION} caracteres.`;
  }

  return undefined;
}

export const LARGO_MAXIMO_TIPO_VEHICULO = 100;

/**
 * @param {string} valor - lo que escribió el usuario en el campo tipo de vehículo.
 * @returns {string|undefined} el mensaje de error, o `undefined` si es válido.
 */
export function validarTipoVehiculo(valor) {
  const limpio = valor.trim();

  if (!limpio) {
    return 'Ingresá el tipo de vehículo.';
  }

  if (limpio.length > LARGO_MAXIMO_TIPO_VEHICULO) {
    return `El tipo de vehículo no puede superar los ${LARGO_MAXIMO_TIPO_VEHICULO} caracteres.`;
  }

  return undefined;
}

/**
 * A diferencia de ubicación/tipo_vehiculo, acá no hay un "vacío" vs. "con
 * formato inválido": un valor no numérico (p. ej. "2500kg") se trata como
 * error de formato, no de largo ni de obligatoriedad.
 *
 * @param {string|number} valor - lo que escribió el usuario en el campo capacidad.
 * @returns {string|undefined} el mensaje de error, o `undefined` si es válido.
 */
export function validarCapacidadKg(valor) {
  const limpio = String(valor).trim();

  if (!limpio) {
    return 'Ingresá la capacidad en kilos.';
  }

  const numero = Number(limpio);
  if (!Number.isFinite(numero)) {
    return 'La capacidad debe ser numérica.';
  }

  if (!(numero > 0)) {
    return 'La capacidad debe ser un número mayor a cero.';
  }

  return undefined;
}
