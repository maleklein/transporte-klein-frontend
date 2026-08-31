/**
 * Helpers de presentación de cargas, compartidos entre el listado (Cargas.jsx)
 * y el detalle (DetalleCarga.jsx). No tocan el backend: sólo dan formato.
 */

/**
 * Formatea el peso que llega del backend como string decimal ("12500.00") al
 * formato local con separador de miles ("12.500 kg").
 *
 * @param {string|number} pesoKg - valor de `peso_kg` tal cual lo devuelve la API.
 * @returns {string} el peso listo para mostrar.
 */
export function formatearPeso(pesoKg) {
  if (pesoKg === null || pesoKg === undefined || String(pesoKg).trim() === '') return '—';
  const numero = Number(pesoKg);
  if (!Number.isFinite(numero)) return `${pesoKg} kg`;
  return `${numero.toLocaleString('es-AR')} kg`;
}

/**
 * Pasa una fecha ISO ("2026-09-15") a "15/09/2026". No construye un `Date` a
 * propósito: hacerlo la correría un día según la zona horaria del navegador.
 *
 * @param {string} fechaIso - fecha en formato AAAA-MM-DD (lo que devuelve la API).
 * @returns {string} la fecha en formato día/mes/año, o el valor original si no matchea.
 */
export function formatearFecha(fechaIso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaIso ?? '');
  if (!partes) return fechaIso ?? '';
  const [, anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

/**
 * Primera letra en mayúscula, para mostrar el estado de la carga
 * ("disponible" -> "Disponible"). El resto del texto queda como viene.
 *
 * @param {string} estado - valor de `estado_actual`.
 * @returns {string}
 */
export function capitalizarEstado(estado) {
  return estado ? estado[0].toUpperCase() + estado.slice(1) : (estado ?? '');
}
