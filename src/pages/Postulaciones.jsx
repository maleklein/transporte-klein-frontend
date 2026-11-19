import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IconoAlerta,
  IconoCalendario,
  IconoCamion,
  IconoEtiqueta,
  IconoOjo,
  IconoUbicacion,
} from '../components/Iconos';
import BarraSuperior from '../components/BarraSuperior';
import MigasDePan from '../components/MigasDePan';
import EstadoCarga from '../components/EstadoCarga';
import { obtenerMisPostulaciones } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import { textoFechaRetiro } from '../utils/carga';
import { ESTADOS } from '../utils/estadosCarga';
import { grupoDePostulacion } from '../utils/postulaciones';
import { destinoVolver, volverA } from '../utils/volver';
import { useAvisoSinConexion } from '../components/contextoConexion';
import './Postulaciones.css';

/** Títulos y textos de cada grupo, en el orden en que se muestran. */
const GRUPOS = [
  { clave: 'asignado', titulo: 'Viajes asignados', vacio: 'No tenés viajes por hacer.' },
  { clave: 'espera', titulo: 'Postulaciones en espera', vacio: 'No tenés postulaciones esperando respuesta.' },
  // Los entregados van aparte: "Viajes asignados" es sólo lo que falta hacer.
  { clave: 'entregado', titulo: 'Viajes completados', vacio: null },
  { clave: 'cerrada', titulo: 'No salieron', vacio: null },
];

/**
 * Mis viajes del camionero (HU 4 y HU 6), en la ruta /mis-viajes.
 *
 * Separa los viajes que le asignaron y todavía tiene que hacer de las
 * postulaciones que siguen esperando; abajo, los viajes que ya entregó y las
 * postulaciones que no salieron. Los viajes y las postulaciones
 * en espera llevan al detalle de la carga; las demás no, porque esa carga ya
 * no es suya ni está abierta.
 *
 * @returns {JSX.Element}
 */
export default function Postulaciones() {
  const navigate = useNavigate();
  const location = useLocation();
  // Desde dónde se llegó: arma las migas (Inicio › Mis viajes) y, en el
  // celular, la flecha de la barra. Desde la barra superior no hay a dónde
  // volver, y las migas quedan en Inicio › Mis viajes.
  const volver = destinoVolver(location, null);
  const [postulaciones, setPostulaciones] = useState([]);
  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const avisarSiFaltaConexion = useAvisoSinConexion();

  useEffect(() => {
    const controlador = new AbortController();

    obtenerMisPostulaciones({ signal: controlador.signal })
      .then((datos) => {
        setPostulaciones(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (avisarSiFaltaConexion(error)) return;
        setMensajeError(
          error instanceof ErrorDeApi ? error.message : 'Hubo un error al cargar tus viajes.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, [avisarSiFaltaConexion]);

  // El panel del camionero (HU 17) enlaza a un grupo puntual, por ejemplo
  // /mis-viajes#pos-espera. Los grupos recién existen cuando llegan los datos,
  // así que el desplazamiento espera a que la pantalla esté lista. Solo baja si
  // el grupo arranca en la mitad de abajo y no entra entero: si ya se ve, bajar
  // escondería la barra, el título y las migas sin mostrar nada nuevo.
  useEffect(() => {
    if (estadoPantalla !== 'ok' || !location.hash) return;
    // El id está en el título; se mide la sección entera, con sus tarjetas.
    const grupo = document.getElementById(location.hash.slice(1))?.closest('section');
    if (!grupo) return;
    const { top, bottom } = grupo.getBoundingClientRect();
    if (top > window.innerHeight / 2 && bottom > window.innerHeight) {
      grupo.scrollIntoView({ block: 'start' });
    }
  }, [estadoPantalla, location.hash]);

  return (
    <>
      <BarraSuperior volver={volver} />

      <main className="pos-contenido">
        <MigasDePan volver={volver} actual="Mis viajes" />

        <h1 className="ds-titulo-pagina pos-titulo">
          <IconoCamion width={26} height={26} />
          Mis viajes
        </h1>

        {estadoPantalla === 'cargando' && (
          <p className="pos-mensaje">Cargando tus viajes y postulaciones...</p>
        )}

        {estadoPantalla === 'error' && (
          <div className="ds-aviso ds-aviso--error" role="alert">
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
            const delGrupo = postulaciones.filter((postulacion) => grupoDePostulacion(postulacion) === clave);
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
                          {(clave === 'asignado' || clave === 'entregado') && (
                            <EstadoCarga estado={p.estado_actual} />
                          )}
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
                          <p className="pos-card-dato pos-card-dato--ruta">
                            <IconoUbicacion width={18} height={18} />
                            <strong>{p.origen}</strong> <span aria-hidden="true">→</span>{' '}
                            <strong>{p.destino}</strong>
                          </p>
                          <p className="pos-card-dato">
                            <IconoCalendario width={18} height={18} />
                            Retiro programado: {textoFechaRetiro(p.fecha_retiro)}
                          </p>
                        </div>
                        {clave !== 'cerrada' && (
                          <button
                            type="button"
                            className="ds-boton ds-boton--secundario pos-card__ver"
                            onClick={() => navigate(`/cargas/${p.id_carga}`, {
                              state: volverA('/mis-viajes', 'Volver a Mis viajes', location.state),
                            })}
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
