/**
 * Reglas del manejo de la falta de conexión con el sistema.
 *
 * Funciones puras: las usan `src/api/conexion.js`, `ControlConexion` y las
 * pantallas, y las prueba `tests/conexion.test.js`.
 */

/**
 * Códigos con los que responde el proxy de Railway cuando el backend no
 * contesta (apagado, reiniciándose o sin base). Para el usuario es lo mismo
 * que no tener conexión, así que se tratan igual que un `fetch` que falla.
 */
export const ESTADOS_SIN_RESPUESTA = [502, 503, 504];

/**
 * Esperas antes de cada reintento silencioso de una lectura (en ms). Cortes
 * de un segundo o dos no llegan a mostrarle nada al usuario: crecen al doble,
 * y con estos dos el pedido se da por perdido a los 3 segundos.
 */
export const ESPERAS_SILENCIOSAS_MS = [1000, 2000];

/** Primera espera de la reconexión automática, ya con el error a la vista. */
const PRIMERA_ESPERA_MS = 5000;

/** Tope de la espera entre intentos de reconexión. */
const ESPERA_MAXIMA_MS = 30000;

/**
 * Indica si un error es por falta de conexión: el pedido no llegó al servidor
 * (`sinConexion`, lo marca `errorSinConexion`) o llegó a Railway pero el
 * backend no respondió.
 *
 * @param {unknown} error - lo que atrapó el `catch`.
 * @returns {boolean}
 */
export function esErrorDeConexion(error) {
  if (!error || typeof error !== 'object') return false;
  return error.sinConexion === true || ESTADOS_SIN_RESPUESTA.includes(error.estado);
}

/**
 * Cuánto esperar antes del intento de reconexión número `intento` (desde 0).
 * Crece al doble en cada intento, con tope: 5 s, 10 s, 20 s y después 30 s.
 *
 * @param {number} intento - cuántos intentos fallaron desde que se perdió la conexión.
 * @returns {number} la espera en milisegundos.
 */
export function esperaDeReconexion(intento) {
  const n = Number.isInteger(intento) && intento > 0 ? intento : 0;
  return Math.min(PRIMERA_ESPERA_MS * 2 ** n, ESPERA_MAXIMA_MS);
}

/**
 * Aviso para una acción que no se pudo hacer por falta de conexión, para
 * mostrarlo al lado del botón que la disparó.
 *
 * @param {string} queNoPaso - lo que no ocurrió, ej. "La carga no se registró".
 * @param {object} [opciones]
 * @param {boolean} [opciones.formulario=false] - si había datos escritos que se conservan.
 * @returns {{titulo: string, detalle: string}}
 */
export function avisoSinConexion(queNoPaso, { formulario = false } = {}) {
  return {
    titulo: `${queNoPaso} porque no hay conexión con el sistema.`,
    detalle: `${formulario ? 'Lo que escribiste sigue acá. ' : ''}Revisá tu conexión y volvé a intentar.`,
  };
}

/**
 * El mismo aviso en un solo texto, para los lugares que muestran un mensaje
 * plano (modales, errores debajo de un botón).
 *
 * @param {string} queNoPaso - lo que no ocurrió, ej. "La carga no se canceló".
 * @param {object} [opciones] - las mismas de `avisoSinConexion`.
 * @returns {string}
 */
export function textoSinConexion(queNoPaso, opciones) {
  const { titulo, detalle } = avisoSinConexion(queNoPaso, opciones);
  return `${titulo} ${detalle}`;
}
