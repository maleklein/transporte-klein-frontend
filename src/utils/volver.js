import { rutaInicio } from '../api/sesion';

/**
 * El botón de volver de una pantalla lleva a la pantalla desde la que se entró.
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
 * @returns {{ volverA: { ruta: string, texto: string, estado: object|null } }} el `state` para el router.
 */
export function volverA(ruta, texto, estado = null) {
  return { volverA: { ruta, texto, estado } };
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

/**
 * Para los accesos de los paneles de inicio: el botón de volver lleva de nuevo al panel.
 *
 * @param {string} rol - 'administrador' o 'camionero'.
 * @returns {{ volverA: { ruta: string, texto: string, estado: null } }}
 */
export function desdeInicio(rol) {
  return volverA(rutaInicio(rol), 'Volver al inicio');
}
