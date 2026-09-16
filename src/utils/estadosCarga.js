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
 * Orden natural del ciclo de vida, para distinguir avanzar de corregir.
 * `cancelada` queda afuera: no es un paso del flujo, es una salida.
 */
const FLUJO = Object.freeze([
  ESTADOS.DISPONIBLE,
  ESTADOS.PENDIENTE,
  ESTADOS.ACEPTADA,
  ESTADOS.EN_VIAJE,
  ESTADOS.ENTREGADA,
]);

/**
 * Transiciones permitidas desde cada estado. Igual que en el backend: además
 * de avanzar se puede retroceder un paso, para corregir un clic equivocado.
 * `entregada` es terminal por RN-01 y `cancelada` por decisión del equipo.
 */
export const TRANSICIONES = Object.freeze({
  [ESTADOS.DISPONIBLE]: [ESTADOS.PENDIENTE, ESTADOS.CANCELADA],
  [ESTADOS.PENDIENTE]: [ESTADOS.ACEPTADA, ESTADOS.DISPONIBLE, ESTADOS.CANCELADA],
  [ESTADOS.ACEPTADA]: [ESTADOS.EN_VIAJE, ESTADOS.PENDIENTE],
  [ESTADOS.EN_VIAJE]: [ESTADOS.ENTREGADA, ESTADOS.ACEPTADA],
  [ESTADOS.ENTREGADA]: [],
  [ESTADOS.CANCELADA]: [],
});

/**
 * Estados de los que ya no se vuelve. Pasar a uno de ellos es irreversible,
 * así que la pantalla pide confirmación antes (HU 2.4 lo exige para cancelar).
 */
export const ESTADOS_FINALES = Object.freeze([ESTADOS.ENTREGADA, ESTADOS.CANCELADA]);

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

/**
 * Indica si la transición retrocede en el flujo, o sea, si corrige un cambio
 * anterior en vez de avanzar el ciclo de vida. La pantalla las separa para que
 * se vea claro que "Pendiente" desde "Aceptada" es volver atrás, no seguir.
 *
 * @param {string} estadoActual - estado en el que está la carga.
 * @param {string} estadoNuevo - estado al que se la quiere llevar.
 * @returns {boolean} true si el destino está antes en el flujo.
 */
export function esCorreccion(estadoActual, estadoNuevo) {
  const desde = FLUJO.indexOf(estadoActual);
  const hasta = FLUJO.indexOf(estadoNuevo);
  return desde !== -1 && hasta !== -1 && hasta < desde;
}

/**
 * Indica si pasar a este estado es irreversible y hay que confirmarlo antes.
 *
 * @param {string} estadoNuevo - estado destino.
 * @returns {boolean} true si el destino es un estado final.
 */
export function requiereConfirmacion(estadoNuevo) {
  return ESTADOS_FINALES.includes(estadoNuevo);
}
