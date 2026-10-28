import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconoAlerta,
  IconoCalendario,
  IconoEtiqueta,
  IconoFlechaAtras,
  IconoOjo,
  IconoUbicacion,
} from '../components/Iconos';
import BarraSuperior from '../components/BarraSuperior';
import EstadoCarga from '../components/EstadoCarga';
import { obtenerMisPostulaciones } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import { formatearFecha } from '../utils/carga';
import { ESTADOS, ESTADOS_ABIERTOS } from '../utils/estadosCarga';
import './Postulaciones.css';

/**
 * En qué grupo de la pantalla cae cada postulación:
 * - asignado: se la eligió (HU 6) y es un viaje suyo, en el estado que esté;
 * - espera: sigue esperando a que el administrador elija, con la carga abierta;
 * - cerrada: no lo eligieron, o la carga se canceló mientras esperaba.
 *
 * @param {object} postulacion - fila de `GET /postulaciones/mis-postulaciones`.
 * @returns {'asignado'|'espera'|'cerrada'}
 */
function grupoDe(postulacion) {
  if (postulacion.estado === 'aceptada') return 'asignado';
  if (postulacion.estado === 'pendiente' && ESTADOS_ABIERTOS.includes(postulacion.estado_actual)) {
    return 'espera';
  }
  return 'cerrada';
}

/** Títulos y textos de cada grupo, en el orden en que se muestran. */
const GRUPOS = [
  { clave: 'asignado', titulo: 'Viajes asignados', vacio: 'Todavía no te asignaron ninguna carga.' },
  { clave: 'espera', titulo: 'Postulaciones en espera', vacio: 'No tenés postulaciones esperando respuesta.' },
  { clave: 'cerrada', titulo: 'No salieron', vacio: null },
];

/**
 * Mis viajes del camionero (HU 4 y HU 6), en la ruta /mis-viajes.
 *
 * Separa los viajes que le asignaron de las postulaciones que siguen
 * esperando, y abajo deja las que no salieron. Los viajes y las postulaciones
 * en espera llevan al detalle de la carga; las demás no, porque esa carga ya
 * no es suya ni está abierta.
 *
 * @returns {JSX.Element}
 */
export default function Postulaciones() {
  const navigate = useNavigate();
  const [postulaciones, setPostulaciones] = useState([]);
  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    const controlador = new AbortController();

    obtenerMisPostulaciones({ signal: controlador.signal })
      .then((datos) => {
        setPostulaciones(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setMensajeError(
          error instanceof ErrorDeApi ? error.message : 'Hubo un error al cargar tus viajes.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, []);

  return (
    <>
      <BarraSuperior />

      <main className="pos-contenido">
        <button type="button" className="dc-volver" onClick={() => navigate('/cargas')}>
          <IconoFlechaAtras width={20} height={20} />
          Ir a buscar cargas
        </button>

        <h1 className="pos-titulo">Mis viajes</h1>

        {estadoPantalla === 'cargando' && (
          <p className="pos-mensaje">Cargando tus viajes y postulaciones...</p>
        )}

        {estadoPantalla === 'error' && (
          <div className="pos-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            {mensajeError}
          </div>
        )}

        {estadoPantalla === 'ok' && postulaciones.length === 0 && (
          <p className="pos-mensaje">
            Todavía no te postulaste a ninguna carga. Buscá una en el listado y tocá
            “Postularme”.
          </p>
        )}

        {estadoPantalla === 'ok' &&
          postulaciones.length > 0 &&
          GRUPOS.map(({ clave, titulo, vacio }) => {
            const delGrupo = postulaciones.filter((postulacion) => grupoDe(postulacion) === clave);
            if (delGrupo.length === 0 && !vacio) return null;

            return (
              <section key={clave} className="pos-grupo" aria-labelledby={`pos-${clave}`}>
                <h2 className="pos-grupo__titulo" id={`pos-${clave}`}>
                  {titulo}
                  {delGrupo.length > 0 && (
                    <span className="pos-grupo__cantidad">({delGrupo.length})</span>
                  )}
                </h2>

                {delGrupo.length === 0 && <p className="pos-mensaje pos-mensaje--grupo">{vacio}</p>}

                {delGrupo.length > 0 && (
                  <div className="pos-lista">
                    {delGrupo.map((p) => (
                      <article key={p.id_postulacion} className={`pos-card pos-card--${clave}`}>
                        <div className="pos-card-header">
                          <strong className="pos-card-tipo">
                            <IconoEtiqueta width={20} height={20} /> {p.tipo_carga}
                          </strong>
                          {clave === 'asignado' && <EstadoCarga estado={p.estado_actual} />}
                          {clave === 'espera' && (
                            <span className="pos-badge pos-badge--pendiente">En espera</span>
                          )}
                          {clave === 'cerrada' && (
                            <span className="pos-badge pos-badge--rechazada">
                              {p.estado_actual === ESTADOS.CANCELADA && p.estado !== 'rechazada'
                                ? 'Carga cancelada'
                                : 'No elegida'}
                            </span>
                          )}
                        </div>
                        <div className="pos-card-body">
                          <p className="pos-card-dato">
                            <IconoUbicacion width={18} height={18} />
                            <strong>{p.origen}</strong> <span aria-hidden="true">→</span>{' '}
                            <strong>{p.destino}</strong>
                          </p>
                          <p className="pos-card-dato">
                            <IconoCalendario width={18} height={18} />
                            Retiro programado: {formatearFecha(p.fecha_retiro)}
                          </p>
                        </div>
                        {clave !== 'cerrada' && (
                          <button
                            type="button"
                            className="ds-boton ds-boton--secundario pos-card__ver"
                            onClick={() => navigate(`/cargas/${p.id_carga}`)}
                            aria-label={`Ver la carga de ${p.origen} a ${p.destino}`}
                          >
                            <IconoOjo width={18} height={18} />
                            Ver carga
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
      </main>
    </>
  );
}
