import { ESTADOS, FLUJO, etiquetaEstado } from '../utils/estadosCarga';
import './ProgresoCarga.css';

/**
 * Recorrido del ciclo de vida de una carga (HU 7), como línea de pasos.
 *
 * Existe porque el badge solo dice en qué estado está, pero no dónde queda eso
 * dentro del proceso ni cuánto falta. Acá se ven los cinco pasos del flujo, con
 * los ya cumplidos marcados y el actual resaltado.
 *
 * `cancelada` no es un paso del flujo sino una salida, así que en ese caso no
 * se dibuja el recorrido: se avisa que la carga salió del circuito.
 *
 * @param {object} props
 * @param {string} props.estado - `estado_actual` de la carga.
 * @returns {JSX.Element}
 */
export default function ProgresoCarga({ estado }) {
  if (estado === ESTADOS.CANCELADA) {
    return (
      <p className="pg-cancelada">
        Esta carga fue <strong>cancelada</strong> y salió del circuito. No continúa el recorrido.
      </p>
    );
  }

  const posicionActual = FLUJO.indexOf(estado);

  return (
    <ol className="pg-pasos" aria-label="Progreso de la carga">
      {FLUJO.map((paso, indice) => {
        // Cumplido: ya pasó. Actual: donde está ahora. Pendiente: lo que falta.
        const situacion =
          indice < posicionActual ? 'cumplido' : indice === posicionActual ? 'actual' : 'pendiente';

        return (
          <li
            key={paso}
            className={`pg-paso pg-paso--${situacion}`}
            // Se le dice al lector de pantalla cuál es el paso actual; los
            // demás se leen como parte de la lista sin marca especial.
            aria-current={situacion === 'actual' ? 'step' : undefined}
          >
            <span className="pg-paso__marca" aria-hidden="true">
              {situacion === 'cumplido' ? '✓' : indice + 1}
            </span>
            <span className="pg-paso__nombre">{etiquetaEstado(paso)}</span>
          </li>
        );
      })}
    </ol>
  );
}
