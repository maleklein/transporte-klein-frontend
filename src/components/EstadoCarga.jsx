import { etiquetaEstado, sufijoEstado } from '../utils/estadosCarga';

/**
 * Sufijo de color por estado. Se reexporta desde `utils/estadosCarga` para no
 * duplicar el mapeo: otras pantallas (el historial de estados, HU 8) pintan
 * con la misma paleta.
 *
 * @param {string} estado - valor de `estado_actual` / `estado_nuevo`.
 * @returns {string} sufijo de clase ("disponible", "en-viaje", ..., "neutro").
 */
export function sufijoEstadoCarga(estado) {
  return sufijoEstado(estado);
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
    <span className={`ds-estado-carga ds-estado-carga--${sufijoEstado(estado)}`}>
      {etiquetaEstado(estado)}
    </span>
  );
}
