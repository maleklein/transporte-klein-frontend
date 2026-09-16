import { useEffect, useState } from 'react';
import EstadoCarga, { sufijoEstadoCarga } from './EstadoCarga';
import { IconoAlerta } from './Iconos';
import { obtenerHistorialCarga } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import { formatearFechaHora } from '../utils/carga';
import { evitarFoco } from '../utils/formulario';

/**
 * Bitácora de cambios de estado de una carga (HU 8), en una línea de tiempo
 * vertical. Se usa dentro de `DetalleCarga.jsx`, debajo de "Información de
 * la carga".
 *
 * Pide `GET /cargas/:id/historial` al montarse (y de nuevo si cambia
 * `idCarga`). Cada evento se pinta con los mismos colores por estado que ya
 * usa el badge de `EstadoCarga` (vía `sufijoEstadoCarga`), para que el punto
 * de la línea de tiempo y el estado se lean como lo mismo. El primer evento
 * de cada carga llega con `estado_anterior: null` (todavía no había estado
 * antes del alta) y se muestra como "Carga creada" en vez de "null → X".
 *
 * Los eventos se muestran del más reciente al más viejo, que es la convención
 * de los seguimientos de envío: lo último que pasó es lo que se quiere ver
 * primero. El endpoint los devuelve en orden cronológico, así que se invierten
 * acá — es una decisión de presentación y no cambia el contrato de la API.
 *
 * Con `maximoVisible` sólo se muestran los primeros N y aparece un "Ver todos"
 * para desplegar el resto. Recortar tiene sentido justamente porque el orden
 * es del más nuevo al más viejo: lo que queda a la vista es lo reciente.
 *
 * @param {object} props
 * @param {number|string} props.idCarga - `id_carga` de la carga.
 * @param {number} [props.maximoVisible] - cuántos eventos mostrar antes de "Ver todos". Sin valor, se muestran todos.
 * @returns {JSX.Element}
 */
export default function HistorialCarga({ idCarga, maximoVisible }) {
  const [eventos, setEventos] = useState([]);
  const [mostrandoTodos, setMostrandoTodos] = useState(false);
  // 'cargando' | 'ok' | 'error'
  const [estadoPedido, setEstadoPedido] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPedido('cargando');
    setMensajeError('');

    obtenerHistorialCarga(idCarga, { signal: controlador.signal })
      .then((datos) => {
        // Del más reciente al más viejo (el endpoint los manda cronológicos).
        setEventos([...datos].reverse());
        setEstadoPedido('ok');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setMensajeError(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudo cargar el historial de la carga. Intentá de nuevo.',
        );
        setEstadoPedido('error');
      });

    return () => controlador.abort();
  }, [idCarga]);

  // Si no se pidió recorte, o ya se desplegó, se muestran todos.
  const recorta = Number.isInteger(maximoVisible) && maximoVisible > 0;
  const visibles = recorta && !mostrandoTodos ? eventos.slice(0, maximoVisible) : eventos;
  const ocultos = eventos.length - visibles.length;

  const cuerpo = (
    <>
      {estadoPedido === 'cargando' && <p className="dc-mensaje">Cargando historial...</p>}

      {estadoPedido === 'error' && (
        <div className="dc-aviso-error" role="alert">
          <IconoAlerta width={22} height={22} />
          {mensajeError}
        </div>
      )}

      {estadoPedido === 'ok' && eventos.length === 0 && (
        <p className="dc-mensaje">Esta carga todavía no tiene cambios de estado registrados.</p>
      )}

      {estadoPedido === 'ok' && eventos.length > 0 && (
        <ol className="dc-historial">
          {visibles.map((evento) => (
            <li key={evento.id_estado_carga} className="dc-historial__item">
              <span
                className={`dc-historial__punto dc-historial__punto--${sufijoEstadoCarga(evento.estado_nuevo)}`}
                aria-hidden="true"
              />
              <div className="dc-historial__contenido">
                <time className="dc-historial__fecha" dateTime={evento.marca_tiempo}>
                  {formatearFechaHora(evento.marca_tiempo)}
                </time>

                <p className="dc-historial__transicion">
                  {evento.estado_anterior === null ? (
                    <span className="dc-historial__creada">Carga creada</span>
                  ) : (
                    <EstadoCarga estado={evento.estado_anterior} />
                  )}
                  <span className="dc-historial__flecha" aria-hidden="true">
                    →
                  </span>
                  <EstadoCarga estado={evento.estado_nuevo} />
                </p>

                <p className="dc-historial__actor">{evento.actor}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {(ocultos > 0 || mostrandoTodos) && (
        <button
          type="button"
          className="hc-ver-mas"
          onClick={() => setMostrandoTodos((previo) => !previo)}
          onMouseDown={evitarFoco}
        >
          {mostrandoTodos
            ? 'Ver menos'
            : `Ver los ${eventos.length} cambios`}
        </button>
      )}
    </>
  );

  return (
    <section className="dc-card">
      <h2 className="dc-card__titulo">
        Historial de estados
        {estadoPedido === 'ok' && eventos.length > 0 && (
          <span className="hc-contador">
            {eventos.length} {eventos.length === 1 ? 'cambio' : 'cambios'}
          </span>
        )}
      </h2>
      {cuerpo}
    </section>
  );
}
