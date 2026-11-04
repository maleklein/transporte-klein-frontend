import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BarraSuperior from '../components/BarraSuperior';
import EstadoCarga from '../components/EstadoCarga';
import {
  IconoAlerta,
  IconoCaja,
  IconoCalendario,
  IconoCamion,
  IconoCampana,
  IconoEtiqueta,
  IconoReintentar,
} from '../components/Iconos';
import { listarCargas, obtenerMisPostulaciones } from '../api/cargas';
import { listarNotificaciones } from '../api/notificaciones';
import { ErrorDeApi } from '../api/usuarios';
import { formatearFecha } from '../utils/carga';
import { esViajeEnCurso, grupoDePostulacion } from '../utils/postulaciones';
import './PanelCamionero.css';

/** Cuántos viajes en curso se listan en el panel; el resto, en Mis viajes. */
const MAXIMO_VIAJES_A_LA_VISTA = 3;

/**
 * Pide un dato del panel y lo deja como `{ estado, valor, error }`.
 *
 * Cada dato se pide por separado a propósito: si falla uno, los demás se
 * muestran igual y su tarjeta sigue siendo un acceso a la sección.
 *
 * @param {function} pedir - recibe `{ signal }` y devuelve una promesa.
 * @param {number} version - cambia al apretar "Reintentar", para volver a pedir.
 * @param {string} queFallo - mensaje si el error no trae uno propio.
 * @returns {{estado: 'cargando'|'ok'|'error', valor: *, error: string}}
 */
function useDato(pedir, version, queFallo) {
  const [dato, setDato] = useState({ estado: 'cargando', valor: null, error: '' });

  useEffect(() => {
    const controlador = new AbortController();
    setDato((previo) => ({ ...previo, estado: 'cargando', error: '' }));

    pedir({ signal: controlador.signal })
      .then((valor) => setDato({ estado: 'ok', valor, error: '' }))
      .catch((fallo) => {
        if (fallo?.name === 'AbortError') return;
        setDato({
          estado: 'error',
          valor: null,
          error: fallo instanceof ErrorDeApi ? fallo.message : queFallo,
        });
      });

    return () => controlador.abort();
    // `pedir` es una función de módulo y no cambia entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return dato;
}

const pedirPostulaciones = ({ signal }) => obtenerMisPostulaciones({ signal });
// Como camionero, el backend devuelve sólo las cargas a las que se puede postular (HU 3).
const pedirCargasDisponibles = ({ signal }) => listarCargas({}, { signal });
const pedirNoLeidas = ({ signal }) => listarNotificaciones({ soloNoLeidas: true }, { signal });

/**
 * Tarjeta de resumen del panel: un número y el acceso a su sección. Toda la
 * tarjeta es el enlace, así el acceso sigue disponible aunque el dato falle.
 *
 * @param {object} props
 * @param {string} props.to - a dónde lleva.
 * @param {import('react').ComponentType} props.Icono
 * @param {string} props.titulo - qué cuenta ("Viajes en curso").
 * @param {{estado: string, error: string}} props.dato - estado del pedido.
 * @param {number|null} props.cantidad - el número, cuando el dato llegó.
 * @param {string} props.detalle - qué significa el número.
 * @param {string} props.accion - texto del acceso ("Ver mis viajes").
 * @param {boolean} [props.destacada] - resalta la tarjeta si hay algo que mirar.
 * @returns {JSX.Element}
 */
function TarjetaResumen({ to, Icono, titulo, dato, cantidad, detalle, accion, destacada = false }) {
  return (
    <Link to={to} className={`pcm-tarjeta${destacada ? ' pcm-tarjeta--destacada' : ''}`}>
      <span className="pcm-tarjeta__titulo">
        <Icono width={20} height={20} />
        {titulo}
      </span>
      {dato.estado === 'cargando' && <span className="pcm-tarjeta__valor pcm-tarjeta__valor--cargando">…</span>}
      {dato.estado === 'ok' && <span className="pcm-tarjeta__valor">{cantidad}</span>}
      {dato.estado === 'error' && (
        <span className="pcm-tarjeta__error">
          <IconoAlerta width={16} height={16} />
          No se pudo cargar este dato.
        </span>
      )}
      <span className="pcm-tarjeta__detalle">{detalle}</span>
      <span className="pcm-tarjeta__accion">{accion} →</span>
    </Link>
  );
}

/**
 * Panel de inicio del camionero (HU 17), en la ruta /panel-camionero. Es a
 * donde lo lleva el login y el acceso "Inicio" de la barra (HU 15).
 *
 * Resume su trabajo en cuatro tarjetas —viajes en curso, postulaciones
 * pendientes, cargas disponibles y notificaciones sin leer— y cada una lleva a
 * su sección. Debajo lista los viajes en curso, que son lo que tiene que hacer.
 *
 * No necesita endpoints propios: los viajes y las postulaciones salen de
 * "Mis postulaciones", agrupadas con la misma regla que usa Mis viajes
 * (`utils/postulaciones`), así los números coinciden con lo que ve ahí.
 *
 * Si no tiene postulaciones ni viajes, lo dice y lo invita a ver las cargas
 * disponibles. Si falla algún pedido, avisa arriba con "Reintentar" y la
 * tarjeta afectada lo dice, pero todas siguen llevando a su sección.
 *
 * @returns {JSX.Element}
 */
export default function PanelCamionero() {
  const [version, setVersion] = useState(0);

  const postulaciones = useDato(pedirPostulaciones, version, 'No se pudieron cargar tus postulaciones y viajes.');
  const cargas = useDato(pedirCargasDisponibles, version, 'No se pudieron cargar las cargas disponibles.');
  const noLeidas = useDato(pedirNoLeidas, version, 'No se pudieron cargar tus notificaciones.');

  const lista = postulaciones.valor ?? [];
  const viajesEnCurso = lista.filter(esViajeEnCurso);
  const enEspera = lista.filter((postulacion) => grupoDePostulacion(postulacion) === 'espera');
  const cantidadCargas = cargas.valor?.length ?? 0;
  // El backend devuelve 100 como máximo, igual que para el contador de la barra.
  const cantidadNoLeidas = noLeidas.valor?.length ?? 0;
  const textoNoLeidas = cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas;

  const errores = [postulaciones, cargas, noLeidas].filter((dato) => dato.estado === 'error');
  const sinTrabajo = postulaciones.estado === 'ok' && viajesEnCurso.length === 0 && enEspera.length === 0;

  return (
    <>
      <BarraSuperior />

      <main className="us-contenido pcm-contenido">
        <div className="us-encabezado">
          <h1>Mi panel</h1>
        </div>
        <p className="pcm-intro">Así está tu trabajo hoy. Tocá cada tarjeta para ir a esa sección.</p>

        {errores.length > 0 && (
          <div className="pcm-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            <span className="pcm-aviso-error__texto">
              {errores.map((dato) => dato.error).join(' ')} Los accesos siguen funcionando.
            </span>
            <button
              type="button"
              className="ds-boton ds-boton--secundario"
              onClick={() => setVersion((previa) => previa + 1)}
            >
              <IconoReintentar />
              Reintentar
            </button>
          </div>
        )}

        <section className="pcm-tarjetas" aria-label="Resumen">
          <TarjetaResumen
            to="/mis-viajes#pos-asignado"
            Icono={IconoCamion}
            titulo="Viajes en curso"
            dato={postulaciones}
            cantidad={viajesEnCurso.length}
            detalle="Cargas que te asignaron, confirmadas o en viaje."
            accion="Ver mis viajes"
            destacada={viajesEnCurso.length > 0}
          />
          <TarjetaResumen
            to="/mis-viajes#pos-espera"
            Icono={IconoEtiqueta}
            titulo="Postulaciones pendientes"
            dato={postulaciones}
            cantidad={enEspera.length}
            detalle="Esperando que el administrador elija."
            accion="Ver mis postulaciones"
          />
          <TarjetaResumen
            to="/cargas"
            Icono={IconoCaja}
            titulo="Cargas disponibles"
            dato={cargas}
            cantidad={cantidadCargas}
            detalle="Cargas a las que todavía te podés postular."
            accion="Ver cargas disponibles"
          />
          <TarjetaResumen
            to="/notificaciones"
            Icono={IconoCampana}
            titulo="Notificaciones sin leer"
            dato={noLeidas}
            cantidad={textoNoLeidas}
            detalle="Avisos de cargas nuevas, asignaciones y cambios de estado."
            accion="Ver notificaciones"
            destacada={cantidadNoLeidas > 0}
          />
        </section>

        {sinTrabajo && (
          <div className="pcm-vacio">
            <p className="pcm-vacio__texto">
              Todavía no tenés postulaciones ni viajes. Mirá las cargas disponibles y postulate a la
              que te sirva: si te eligen, te llega un aviso.
            </p>
            <Link to="/cargas" className="ds-boton ds-boton--primario">
              <IconoCaja />
              Ver cargas disponibles
            </Link>
          </div>
        )}

        {viajesEnCurso.length > 0 && (
          <section className="pcm-viajes" aria-labelledby="pcm-viajes-titulo">
            <h2 className="pcm-viajes__titulo" id="pcm-viajes-titulo">
              Tus viajes en curso
            </h2>
            <ul className="pcm-viajes__lista">
              {viajesEnCurso.slice(0, MAXIMO_VIAJES_A_LA_VISTA).map((viaje) => (
                <li key={viaje.id_postulacion}>
                  <Link to={`/cargas/${viaje.id_carga}`} className="pcm-viaje">
                    <span className="pcm-viaje__cabecera">
                      <span className="pcm-viaje__tipo">{viaje.tipo_carga}</span>
                      <EstadoCarga estado={viaje.estado_actual} />
                    </span>
                    <span className="pcm-viaje__ruta">
                      {viaje.origen} <span aria-hidden="true">→</span> {viaje.destino}
                    </span>
                    <span className="pcm-viaje__fecha">
                      <IconoCalendario width={16} height={16} />
                      Retiro: {formatearFecha(viaje.fecha_retiro)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {viajesEnCurso.length > MAXIMO_VIAJES_A_LA_VISTA && (
              <Link to="/mis-viajes#pos-asignado" className="pcm-viajes__mas">
                Ver los {viajesEnCurso.length} viajes en curso
              </Link>
            )}
          </section>
        )}
      </main>
    </>
  );
}
