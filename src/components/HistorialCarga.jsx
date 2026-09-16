import { useEffect, useState } from 'react';
import EstadoCarga, { sufijoEstadoCarga } from './EstadoCarga';
import { IconoAlerta } from './Iconos';
import { obtenerHistorialCarga } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import { formatearFechaHora } from '../utils/carga';

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
 * Con `colapsable` se muestra plegado, con el total de cambios en el
 * encabezado. Sirve para que no domine la pantalla cuando la carga acumuló
 * muchos movimientos: la bitácora es información de consulta, no lo primero
 * que se mira. Se usa el `<details>` nativo, que ya trae el plegado accesible
 * y el foco por teclado sin JavaScript.
 *
 * @param {object} props
 * @param {number|string} props.idCarga - `id_carga` de la carga.
 * @param {boolean} [props.colapsable=false] - si se muestra plegado tras un encabezado desplegable.
 * @returns {JSX.Element}
 */
export default function HistorialCarga({ idCarga, colapsable = false }) {
  const [eventos, setEventos] = useState([]);
  // 'cargando' | 'ok' | 'error'
  const [estadoPedido, setEstadoPedido] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPedido('cargando');
    setMensajeError('');

    obtenerHistorialCarga(idCarga, { signal: controlador.signal })
      .then((datos) => {
        setEventos(datos);
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
          {eventos.map((evento) => (
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
    </>
  );

  if (!colapsable) {
    return (
      <section className="dc-card">
        <h2 className="dc-card__titulo">Historial de estados</h2>
        {cuerpo}
      </section>
    );
  }

  return (
    <details className="dc-card hc-plegable">
      <summary className="hc-resumen">
        <span className="dc-card__titulo">Historial de estados</span>
        {estadoPedido === 'ok' && eventos.length > 0 && (
          <span className="hc-contador">
            {eventos.length} {eventos.length === 1 ? 'cambio' : 'cambios'}
          </span>
        )}
      </summary>
      <div className="hc-cuerpo">{cuerpo}</div>
    </details>
  );
}
