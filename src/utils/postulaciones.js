/**
 * Cómo se agrupan las postulaciones del camionero. Lo usan "Mis viajes" (HU 4
 * y HU 6) y el panel de inicio del camionero (HU 17): con la regla en un solo
 * lugar, los números del panel coinciden siempre con lo que muestra la lista.
 */

import { ESTADOS, ESTADOS_ABIERTOS } from './estadosCarga';

/**
 * En qué grupo cae cada postulación:
 * - asignado: se la eligió (HU 6) y es un viaje suyo, en el estado que esté;
 * - espera: sigue esperando a que el administrador elija, con la carga abierta;
 * - cerrada: no lo eligieron, o la carga se canceló mientras esperaba.
 *
 * @param {object} postulacion - fila de `GET /postulaciones/mis-postulaciones`.
 * @returns {'asignado'|'espera'|'cerrada'}
 */
export function grupoDePostulacion(postulacion) {
  if (postulacion.estado === 'aceptada') return 'asignado';
  if (postulacion.estado === 'pendiente' && ESTADOS_ABIERTOS.includes(postulacion.estado_actual)) {
    return 'espera';
  }
  return 'cerrada';
}

/**
 * Estados de un viaje asignado que todavía no terminó (HU 17): ya confirmado
 * o en camino. Los entregados quedan en "Mis viajes" pero no están "en curso".
 */
const ESTADOS_EN_CURSO = Object.freeze([ESTADOS.ACEPTADA, ESTADOS.EN_VIAJE]);

/**
 * Indica si la postulación es un viaje del camionero que todavía está en curso.
 *
 * @param {object} postulacion - fila de `GET /postulaciones/mis-postulaciones`.
 * @returns {boolean}
 */
export function esViajeEnCurso(postulacion) {
  return (
    grupoDePostulacion(postulacion) === 'asignado' &&
    ESTADOS_EN_CURSO.includes(postulacion.estado_actual)
  );
}
