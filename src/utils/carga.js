/**
 * Helpers de presentación de cargas, compartidos entre el listado (Cargas.jsx)
 * y el detalle (DetalleCarga.jsx). No tocan el backend: sólo dan formato.
 */

import { hoyEnArgentina } from './validarCarga';
import { ESTADOS_ABIERTOS } from './estadosCarga';

/**
 * Una carga sin asignar cuya fecha de retiro ya pasó. Al camionero el backend
 * ya no se la muestra; el administrador la ve marcada para cambiarle la fecha
 * o cancelarla.
 *
 * @param {object} carga - con `fecha` (AAAA-MM-DD) y `estado_actual`.
 * @returns {boolean}
 */
export function retiroVencido(carga) {
  return ESTADOS_ABIERTOS.includes(carga.estado_actual) && carga.fecha < hoyEnArgentina();
}

/**
 * Por qué el camionero no puede llevar esta carga, según la capacidad de su
 * vehículo. Es la misma regla con la que el backend rechaza la postulación
 * (HU 4): sirve para no ofrecerle postularse y que recién ahí se entere.
 *
 * @param {object} carga - con `peso_kg` y `capacidad_camionero_kg`, que el backend sólo manda al camionero.
 * @returns {'sin-capacidad'|'supera'|null} null si la puede llevar (o si no es camionero).
 */
export function motivoSinCapacidad(carga) {
  if (!('capacidad_camionero_kg' in carga)) return null;
  if (carga.capacidad_camionero_kg === null) return 'sin-capacidad';
  return Number(carga.peso_kg) > Number(carga.capacidad_camionero_kg) ? 'supera' : null;
}

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
 * Formatea los kilómetros estimados (HU 9), que llegan del backend como string
 * decimal ("406.53"), a "407 km". Se redondea a kilómetros enteros a propósito:
 * es una estimación para planificar, y los decimales sugerirían una precisión
 * que no tiene.
 *
 * @param {string|number|null} km - valor de `kilometros_estimados` tal cual lo devuelve la API.
 * @returns {string} la distancia lista para mostrar, o '—' si no hay valor.
 */
export function formatearKm(km) {
  if (km === null || km === undefined || String(km).trim() === '') return '—';
  const numero = Number(km);
  if (!Number.isFinite(numero)) return `${km} km`;
  return `${numero.toLocaleString('es-AR', { maximumFractionDigits: 0 })} km`;
}

/**
 * Formatea un monto en pesos (HU 10), que llega del backend como string
 * decimal ("389415.00") o como número, a "$ 389.415,00". Se muestran los
 * centavos a propósito: la fórmula redondea a centavos, y así el monto coincide
 * con la cuenta hecha a mano.
 *
 * @param {string|number|null} monto
 * @returns {string} el monto listo para mostrar, o '—' si no hay valor.
 */
export function formatearPesos(monto) {
  if (monto === null || monto === undefined || String(monto).trim() === '') return '—';
  const numero = Number(monto);
  if (!Number.isFinite(numero)) return `$ ${monto}`;
  return numero.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

/**
 * Parámetros de la fórmula de costos (HU 10), en el orden en que se muestran,
 * con el nombre que ve el administrador. Las claves son las de la tabla
 * PARAMETRO_OPERATIVO del backend.
 */
export const PARAMETROS_COSTO = [
  { clave: 'costo_por_km', etiqueta: 'Costo por km' },
  { clave: 'peaje_por_km', etiqueta: 'Peaje por km' },
  { clave: 'tarifa_por_km', etiqueta: 'Tarifa por km' },
];

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
 * (`src/controllers/cargaControllers.js`): en viaje o entregada, sus datos
 * pasan a ser el registro de lo que efectivamente pasó, no un borrador; y
 * cancelada, porque ya no tiene sentido modificar los datos de un viaje que
 * no va a salir. Usado tanto por `DetalleCarga.jsx` (para deshabilitar el
 * botón "Editar", con el motivo a la vista) como por `EditarCarga.jsx` (para
 * bloquear el formulario si se entra por URL directa a una carga que ya no
 * admite edición).
 */
export const ESTADOS_BLOQUEADOS_EDICION = ['en_viaje', 'entregada', 'cancelada'];

/**
 * A dónde llevan los accesos a "Pendientes de asignación" (panel del
 * administrador y notificaciones): si hay una sola carga pendiente, directo a
 * su detalle, donde se asigna; si hay varias, al listado filtrado.
 *
 * @param {object[]} cargasPendientes - las cargas en estado pendiente (con `id_carga`).
 * @returns {string} la ruta.
 */
export function rutaPendientesAsignacion(cargasPendientes) {
  return cargasPendientes.length === 1
    ? `/cargas/${cargasPendientes[0].id_carga}`
    : '/cargas?estado=pendiente';
}

/**
 * A dónde lleva cada casilla de "Cargas por estado" del panel del
 * administrador: a Gestión de Cargas filtrada por ese estado y por el mismo
 * período de creación con el que se contó, así el listado muestra exactamente
 * esas cargas.
 *
 * @param {string} estado - el estado de la casilla ("disponible", ...).
 * @param {{fecha_desde?: string, fecha_hasta?: string}} [periodo] - el período del conteo (AAAA-MM-DD).
 * @returns {string} la ruta, con la búsqueda.
 */
export function rutaCargasPorEstado(estado, periodo = {}) {
  const params = new URLSearchParams({ estado });
  if (periodo.fecha_desde) params.set('creada_desde', periodo.fecha_desde);
  if (periodo.fecha_hasta) params.set('creada_hasta', periodo.fecha_hasta);
  return `/cargas?${params}`;
}

/**
 * Un `Date` (hora local) como texto AAAA-MM-DD. Con los getters locales y no
 * con `toISOString`, que pasa a UTC y puede correr el día.
 *
 * @param {Date} fecha
 * @returns {string}
 */
export function fechaATexto(fecha) {
  const dos = (numero) => String(numero).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/**
 * Texto AAAA-MM-DD como `Date` a la medianoche local, o `undefined` si no es
 * una fecha con ese formato.
 *
 * @param {string} texto
 * @returns {Date|undefined}
 */
export function textoAFecha(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto ?? '');
  if (!partes) return undefined;
  return new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
}

/**
 * Accesos rápidos del filtro "Creada" de Gestión de Cargas. "Últimos 30 días"
 * es el mismo período que cuentan el panel del administrador y Métricas.
 */
export const PERIODOS_CREACION = [
  { id: 'ultimos-7', texto: 'Últimos 7 días' },
  { id: 'ultimos-30', texto: 'Últimos 30 días' },
  { id: 'este-mes', texto: 'Este mes' },
];

/**
 * Las fechas de un acceso rápido, contadas desde `hoy` (incluido).
 *
 * @param {string} id - uno de `PERIODOS_CREACION`.
 * @param {Date} [hoy]
 * @returns {{desde: string, hasta: string}} fechas AAAA-MM-DD.
 */
export function rangoDePeriodo(id, hoy = new Date()) {
  const hasta = fechaATexto(hoy);
  const haceDias = (dias) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    fecha.setDate(fecha.getDate() - dias);
    return fechaATexto(fecha);
  };
  if (id === 'ultimos-7') return { desde: haceDias(6), hasta };
  if (id === 'ultimos-30') return { desde: haceDias(29), hasta };
  if (id === 'este-mes') return { desde: fechaATexto(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta };
  throw new Error(`Período desconocido: ${id}`);
}

/**
 * Qué muestra el filtro "Creada": el nombre del acceso rápido si las fechas
 * coinciden con uno ("Últimos 30 días"), si no el rango ("01/11/2026 –
 * 15/11/2026"), y '' si no hay período (el filtro muestra "Cualquier fecha").
 *
 * @param {string} desde - AAAA-MM-DD o ''.
 * @param {string} hasta - AAAA-MM-DD o ''.
 * @param {Date} [hoy]
 * @returns {string}
 */
export function nombrePeriodoCreacion(desde, hasta, hoy = new Date()) {
  if (!desde && !hasta) return '';
  const coincide = PERIODOS_CREACION.find(({ id }) => {
    const rango = rangoDePeriodo(id, hoy);
    return rango.desde === desde && rango.hasta === hasta;
  });
  if (coincide) return coincide.texto;
  if (desde && hasta) {
    return desde === hasta ? formatearFecha(desde) : `${formatearFecha(desde)} – ${formatearFecha(hasta)}`;
  }
  return desde ? `Desde el ${formatearFecha(desde)}` : `Hasta el ${formatearFecha(hasta)}`;
}
