import { capitalizarEstado } from '../utils/carga';

/**
 * Clase de color por estado. Los estados no contemplados caen en el neutro, así
 * un estado nuevo del backend no rompe la pantalla.
 */
const CLASES = {
  disponible: 'ds-estado-carga--disponible',
  publicada: 'ds-estado-carga--publicada',
  'en viaje': 'ds-estado-carga--en-viaje',
  entregada: 'ds-estado-carga--entregada',
  cancelada: 'ds-estado-carga--cancelada',
};

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
    <span className={`ds-estado-carga ${CLASES[estado] ?? 'ds-estado-carga--neutro'}`}>
      {capitalizarEstado(estado)}
    </span>
  );
}
