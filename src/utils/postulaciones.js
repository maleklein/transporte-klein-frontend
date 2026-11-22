/**
 * Cómo se agrupan las postulaciones del camionero. Lo usan "Mis viajes" (HU 4
 * y HU 6) y el panel de inicio del camionero (HU 17): con la regla en un solo
 * lugar, los números del panel coinciden siempre con lo que muestra la lista.
 */

import { ESTADOS, ESTADOS_ABIERTOS } from './estadosCarga';

/**
 * En qué grupo cae cada postulación:
 * - asignado: se la eligió (HU 6) y es un viaje suyo que todavía no terminó
 *   (aceptada o en viaje);
 * - entregado: un viaje suyo que ya se entregó. Va aparte de los asignados,
 *   para que esos sean sólo lo que todavía tiene que hacer (corrección del
 *   profesor del 17/11, punto 8);
 * - espera: sigue esperando a que el administrador elija, con la carga abierta;
 * - cerrada: no lo eligieron, o la carga se canceló mientras esperaba.
 *
 * @param {object} postulacion - fila de `GET /postulaciones/mis-postulaciones`.
 * @returns {'asignado'|'entregado'|'espera'|'cerrada'}
 */
export function grupoDePostulacion(postulacion) {
  if (postulacion.estado === 'aceptada') {
    return postulacion.estado_actual === ESTADOS.ENTREGADA ? 'entregado' : 'asignado';
  }
  if (postulacion.estado === 'pendiente' && ESTADOS_ABIERTOS.includes(postulacion.estado_actual)) {
    return 'espera';
  }
  return 'cerrada';
}

/**
 * Indica si la postulación es un viaje del camionero que todavía está en curso
 * (HU 17): ya confirmado o en camino. Es justo el grupo "asignado": los
 * entregados tienen su propio grupo.
 *
 * @param {object} postulacion - fila de `GET /postulaciones/mis-postulaciones`.
 * @returns {boolean}
 */
export function esViajeEnCurso(postulacion) {
  return grupoDePostulacion(postulacion) === 'asignado';
}

/**
 * Qué dice la etiqueta de una postulación del grupo "No salieron" (HU 4):
 * "Carga cancelada" si la carga se canceló y "No elegida" si se asignó a otro
 * camionero.
 *
 * Alcanza con el estado de la carga. Desde que al cancelar las postulaciones
 * en espera pasan a "rechazada" (backend, PR 68), el estado de la postulación
 * ya no distingue los dos casos. Y no hace falta: se cancela sólo desde
 * "disponible" o "pendiente", y en los dos todas las postulaciones están en
 * espera (volver de "aceptada" a "pendiente" las devuelve a todas a
 * "pendiente"). Ningún camionero de una carga cancelada había quedado sin
 * asignar antes de la cancelación.
 *
 * @param {object} postulacion - fila de `GET /postulaciones/mis-postulaciones`.
 * @returns {'Carga cancelada'|'No elegida'}
 */
export function etiquetaNoSalio(postulacion) {
  return postulacion.estado_actual === ESTADOS.CANCELADA ? 'Carga cancelada' : 'No elegida';
}
