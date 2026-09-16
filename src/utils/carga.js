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
 * Pasa una marca de tiempo ISO 8601 ("2026-08-31T01:44:08.552Z", lo que
 * devuelve `GET /cargas/:id/historial`) a "31/08/2026, 01:44" en hora local
 * del navegador. A diferencia de `formatearFecha`, acá sí conviene construir
 * un `Date`: el valor trae hora y zona horaria, así que la conversión a local
 * es justamente lo que se quiere mostrar.
 *
 * @param {string} marcaTiempoIso - timestamp ISO con Z (UTC).
 * @returns {string} fecha y hora listas para mostrar, o el valor original si no es una fecha válida.
 */
export function formatearFechaHora(marcaTiempoIso) {
  const fecha = new Date(marcaTiempoIso);
  if (Number.isNaN(fecha.getTime())) return marcaTiempoIso ?? '';

  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  const diaMesAnio = `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
  const horaMinuto = `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
  return `${diaMesAnio}, ${horaMinuto}`;
}

/** Meses abreviados para las marcas del recorrido: minúscula y sin punto. */
const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** Meses completos, para la fecha larga del panel de carga cancelada. */
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Hora en formato de 24 horas con cero adelante ("09:05").
 *
 * @param {Date} fecha - fecha ya construida y válida.
 * @returns {string}
 */
function horaDe(fecha) {
  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

/**
 * Indica si una fecha cae en el día de hoy, en hora local del navegador.
 *
 * @param {Date} fecha - fecha ya construida y válida.
 * @returns {boolean}
 */
function esDeHoy(fecha) {
  return fecha.toDateString() === new Date().toDateString();
}

/**
 * Marca de tiempo corta para cada paso del recorrido de la carga (HU 7):
 * "Hoy, 15:20" si es del día, o "14 sep, 10:32" si no.
 *
 * Se usa debajo de cada paso del recorrido, donde entra poco texto y lo que
 * importa es ubicar el cambio en el tiempo de un vistazo. Para la bitácora
 * completa está `formatearFechaHora`, que sí muestra el año.
 *
 * @param {string} marcaTiempoIso - timestamp ISO con Z (UTC), como lo devuelve el historial.
 * @returns {string} la marca lista para mostrar, o cadena vacía si no es una fecha válida.
 */
export function formatearMarcaCorta(marcaTiempoIso) {
  const fecha = new Date(marcaTiempoIso);
  if (Number.isNaN(fecha.getTime())) return '';
  const dia = esDeHoy(fecha) ? 'Hoy' : `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
  return `${dia}, ${horaDe(fecha)}`;
}

/**
 * Fecha larga para redactarla dentro de una oración: "hoy a las 15:45" o
 * "el 14 de septiembre a las 15:45". Se usa en el panel de una carga
 * cancelada, que cuenta cuándo pasó en vez de mostrar una etiqueta suelta.
 *
 * @param {string} marcaTiempoIso - timestamp ISO con Z (UTC).
 * @returns {string} la fecha lista para intercalar, o cadena vacía si no es válida.
 */
export function formatearFechaLarga(marcaTiempoIso) {
  const fecha = new Date(marcaTiempoIso);
  if (Number.isNaN(fecha.getTime())) return '';
  const dia = esDeHoy(fecha)
    ? 'hoy'
    : `el ${fecha.getDate()} de ${MESES_LARGOS[fecha.getMonth()]}`;
  return `${dia} a las ${horaDe(fecha)}`;
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

/**
 * Estados desde los que ya no se puede editar una carga (HU 2.2), mismo
 * criterio que `ESTADOS_BLOQUEADOS_EDICION` en el backend
 * (`src/controllers/cargaControllers.js`): una vez en viaje o entregada, sus
 * datos pasan a ser el registro de lo que efectivamente pasó, no un borrador.
 * Usado tanto por `DetalleCarga.jsx` (para deshabilitar el botón "Editar")
 * como por `EditarCarga.jsx` (para bloquear el formulario si se entra por
 * URL directa a una carga que ya no admite edición).
 */
export const ESTADOS_BLOQUEADOS_EDICION = ['en_viaje', 'entregada'];
