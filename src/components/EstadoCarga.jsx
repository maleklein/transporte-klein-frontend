import { capitalizarEstado } from '../utils/carga';

/**
 * Sufijo de color por estado ("en viaje" -> "en-viaje"). Los estados no
 * contemplados caen en "neutro", así un estado nuevo del backend no rompe la
 * pantalla. Se exporta para que otras pantallas (p. ej. el historial de
 * estados, HU 8) puedan pintar con la misma paleta sin duplicar el mapeo.
 */
const SUFIJOS = {
  disponible: 'disponible',
  publicada: 'publicada',
  'en viaje': 'en-viaje',
  entregada: 'entregada',
  cancelada: 'cancelada',
};

/**
 * @param {string} estado - valor de `estado_actual` / `estado_nuevo`.
 * @returns {string} sufijo de clase ("disponible", "en-viaje", ..., "neutro").
 */
export function sufijoEstadoCarga(estado) {
  return SUFIJOS[estado] ?? 'neutro';
}

/**
 * Badge con el estado de una carga (`estado_actual`). Mismo formato en el
 * listado de cargas y en el detalle. Los estilos viven en `index.css`.
 *
 * @param {object} props
 * @param {string} props.estado - valor de `estado_actual`.
 * @returns {JSX.Element}
 */
export default function EstadoCarga({ estado }) {
  return (
    <span className={`ds-estado-carga ds-estado-carga--${sufijoEstadoCarga(estado)}`}>
      {capitalizarEstado(estado)}
    </span>
  );
}
