import { rutaInicio } from '../api/sesion';

/**
 * Las migas de pan de una pantalla (y, en el celular, la flecha ‹ de la barra)
 * llevan a la pantalla desde la que se entró.
 *
 * La pantalla de origen lo pasa en el `state` del router al navegar
 * (`navigate(ruta, { state: volverA(...) })` o `<Link state={volverA(...)}>`), y
 * la de destino lo lee con `destinoVolver`. Si se entró directo (con la URL o
 * recargando), no hay `state` y se usa el destino por defecto de esa pantalla.
 *
 * `estado` es el `state` con el que se había entrado a la pantalla de origen:
 * al volver se le devuelve, así esa pantalla también sabe a dónde volver
 * (inicio → Mis viajes → detalle → Mis viajes sigue diciendo "Volver al inicio").
 *
 * @param {string} ruta - a dónde vuelve, con la búsqueda si hacía falta (`/cargas?estado=pendiente`).
 * @param {string} texto - el texto del botón ("Volver al inicio").
 * @param {object|null} [estado] - el `state` de la pantalla de origen (`location.state`).
 * @param {string} [miga] - el nombre de la pantalla de origen en las migas, si no alcanza con
 *   sacarlo del texto ("Carga #45" en lugar de "La carga").
 * @returns {{ volverA: { ruta: string, texto: string, estado: object|null, miga?: string } }} el `state` para el router.
 */
export function volverA(ruta, texto, estado = null, miga = undefined) {
  return { volverA: { ruta, texto, estado, ...(miga ? { miga } : {}) } };
}

/**
 * Lee a dónde vuelve la pantalla actual.
 *
 * @param {import('react-router-dom').Location} location - de `useLocation()`.
 * @param {{ ruta: string, texto: string }} porDefecto - si no llegó desde otra pantalla.
 * @returns {{ ruta: string, texto: string, estado?: object|null }}
 */
export function destinoVolver(location, porDefecto) {
  return location.state?.volverA ?? porDefecto;
}

/** Hasta cuántas pantallas para atrás se sigue la cadena (corta un `state` mal armado). */
const MAXIMO_MIGAS = 6;

/**
 * El nombre de una pantalla a partir del texto para volver a ella:
 * "Volver a Cargas" → "Cargas", "Volver al inicio" → "Inicio".
 *
 * @param {string} texto
 * @returns {string}
 */
function nombrePantalla(texto = '') {
  const nombre = texto.replace(/^volver (a la |al |a )/i, '');
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

/**
 * Las migas de pan de la pantalla actual, de la más lejana a la más cercana.
 *
 * Sigue la misma cadena que el botón de volver: cada `volverA` guarda en
 * `estado` el `state` de la pantalla de origen, que a su vez tiene su propio
 * `volverA`. Así, si a una carga se entró desde Mis viajes, las migas son
 * Inicio › Mis viajes, y la de Mis viajes devuelve sus filtros. Si la cadena
 * no arranca en el panel de inicio, se agrega adelante.
 *
 * @param {{ ruta: string, texto: string, estado?: object|null, miga?: string } | null} volver - lo que devuelve `destinoVolver`.
 * @param {string} rol - 'administrador' o 'camionero'.
 * @returns {{ ruta: string, nombre: string, estado: object|null }[]}
 */
export function migasDesde(volver, rol) {
  const migas = [];
  let actual = volver;
  while (actual && migas.length < MAXIMO_MIGAS) {
    migas.unshift({ ruta: actual.ruta, nombre: actual.miga ?? nombrePantalla(actual.texto), estado: actual.estado ?? null });
    actual = actual.estado?.volverA ?? null;
  }

  const inicio = rutaInicio(rol);
  if (migas[0]?.ruta.split('?')[0] !== inicio) {
    migas.unshift({ ruta: inicio, nombre: 'Inicio', estado: null });
  }
  return migas;
}

/**
 * La primera pantalla de la cadena después del inicio (sin la búsqueda), o
 * `null` si se llegó directo desde el inicio o sin `state`.
 *
 * La barra superior la usa para resaltar la sección desde la que se llegó y no
 * sólo la de la dirección: una carga abierta desde Mis viajes es `/cargas/1`,
 * pero el usuario está dentro de Mis viajes (Inicio › Mis viajes › Carga #1).
 *
 * @param {{ ruta: string, texto: string, estado?: object|null, miga?: string } | null} volver - lo que devuelve `destinoVolver`.
 * @param {string} rol - 'administrador' o 'camionero'.
 * @returns {string|null} la ruta, por ejemplo `/mis-viajes`.
 */
export function seccionDeOrigen(volver, rol) {
  const [, primera] = migasDesde(volver, rol);
  return primera ? primera.ruta.split('?')[0] : null;
}

/**
 * Para los accesos de los paneles de inicio: el botón de volver lleva de nuevo al panel.
 *
 * @param {string} rol - 'administrador' o 'camionero'.
 * @returns {{ volverA: { ruta: string, texto: string, estado: null } }}
 */
export function desdeInicio(rol) {
  return volverA(rutaInicio(rol), 'Volver al inicio');
}
