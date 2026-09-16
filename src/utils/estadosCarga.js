/**
 * Máquina de estados de una carga (HU 7), del lado del frontend.
 *
 * Es el espejo de `src/domain/estadosCarga.js` del backend: las mismas reglas,
 * para decidir qué acciones ofrecer sin tener que preguntarle al servidor en
 * cada render. El backend igual valida todo de nuevo — acá sólo se evita
 * mostrar botones que sabemos que van a dar 409.
 *
 * Si cambian las transiciones, hay que tocar los dos archivos.
 */

/** Los seis estados del ciclo de vida, según el SRS §219 y la HU 7. */
export const ESTADOS = Object.freeze({
  DISPONIBLE: 'disponible',
  PENDIENTE: 'pendiente',
  ACEPTADA: 'aceptada',
  EN_VIAJE: 'en_viaje',
  ENTREGADA: 'entregada',
  CANCELADA: 'cancelada',
});

/**
 * Transiciones permitidas desde cada estado. Igual que en el backend:
 * `entregada` y `cancelada` son terminales, y cancelar sólo se puede desde
 * `disponible` o `pendiente` (HU 2.4).
 */
export const TRANSICIONES = Object.freeze({
  [ESTADOS.DISPONIBLE]: [ESTADOS.PENDIENTE, ESTADOS.CANCELADA],
  [ESTADOS.PENDIENTE]: [ESTADOS.ACEPTADA, ESTADOS.CANCELADA],
  [ESTADOS.ACEPTADA]: [ESTADOS.EN_VIAJE],
  [ESTADOS.EN_VIAJE]: [ESTADOS.ENTREGADA],
  [ESTADOS.ENTREGADA]: [],
  [ESTADOS.CANCELADA]: [],
});

/**
 * Texto para mostrar de cada estado. Hace falta porque en la base se guarda
 * `en_viaje` con guión bajo, y capitalizar sin más daría "En_viaje".
 */
const ETIQUETAS = Object.freeze({
  [ESTADOS.DISPONIBLE]: 'Disponible',
  [ESTADOS.PENDIENTE]: 'Pendiente',
  [ESTADOS.ACEPTADA]: 'Aceptada',
  [ESTADOS.EN_VIAJE]: 'En viaje',
  [ESTADOS.ENTREGADA]: 'Entregada',
  [ESTADOS.CANCELADA]: 'Cancelada',
});

/**
 * Sufijo de clase CSS por estado, para el color del badge.
 * Los estados sin color propio caen en "neutro".
 */
const SUFIJOS_CSS = Object.freeze({
  [ESTADOS.DISPONIBLE]: 'disponible',
  [ESTADOS.EN_VIAJE]: 'en-viaje',
  [ESTADOS.ENTREGADA]: 'entregada',
  [ESTADOS.CANCELADA]: 'cancelada',
});

/**
 * Nombre para mostrar de un estado.
 *
 * @param {string} estado - valor de `estado_actual` / `estado_nuevo`.
 * @returns {string} el texto a mostrar; el valor original si el estado no se conoce.
 */
export function etiquetaEstado(estado) {
  return ETIQUETAS[estado] ?? (estado ?? '');
}

/**
 * Sufijo de clase CSS para pintar el badge de un estado.
 *
 * @param {string} estado - valor de `estado_actual`.
 * @returns {string} sufijo ("disponible", "en-viaje", ..., "neutro").
 */
export function sufijoEstado(estado) {
  return SUFIJOS_CSS[estado] ?? 'neutro';
}

/**
 * Estados a los que se puede llevar una carga desde el estado dado.
 *
 * @param {string} estadoActual - estado en el que está la carga.
 * @returns {string[]} estados alcanzables; vacío si es terminal o desconocido.
 */
export function transicionesDesde(estadoActual) {
  return TRANSICIONES[estadoActual] ?? [];
}

/**
 * Indica si el estado ya no admite más cambios.
 *
 * @param {string} estadoActual - estado en el que está la carga.
 * @returns {boolean} true si es un estado final.
 */
export function esEstadoFinal(estadoActual) {
  return transicionesDesde(estadoActual).length === 0;
}
