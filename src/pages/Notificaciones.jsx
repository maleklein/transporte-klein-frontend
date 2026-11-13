import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BarraSuperior from '../components/BarraSuperior';
import {
  IconoAlerta,
  IconoCajaMas,
  IconoCampana,
  IconoCamion,
  IconoCerrar,
  IconoCheck,
  IconoFlechaAtras,
  IconoOjo,
} from '../components/Iconos';
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from '../api/notificaciones';
import { ErrorDeApi } from '../api/usuarios';
import { usuarioActual } from '../api/sesion';
import { formatearFechaHora, formatearMarcaCorta } from '../utils/carga';
import { agruparPorFecha } from '../utils/agruparPorFecha';
import { destinoVolver, volverA } from '../utils/volver';
import './Notificaciones.css';

/**
 * Ícono y nombre de cada tipo de evento. Los tipos los define el backend
 * (`TIPOS_NOTIFICACION` en `services/notificaciones.js`); uno que no esté
 * acá se muestra igual, como un aviso genérico.
 */
const TIPOS = {
  carga_nueva: { Icono: IconoCajaMas, nombre: 'Carga nueva' },
  carga_cancelada: { Icono: IconoCerrar, nombre: 'Carga cancelada' },
  cambio_estado: { Icono: IconoCamion, nombre: 'Cambio de estado' },
  carga_asignada: { Icono: IconoCheck, nombre: 'Carga asignada' },
  asignacion_confirmada: { Icono: IconoCheck, nombre: 'Asignación confirmada' },
  postulacion_rechazada: { Icono: IconoCerrar, nombre: 'Postulación no elegida' },
};
const TIPO_GENERICO = { Icono: IconoCampana, nombre: 'Aviso' };

/**
 * Centro de notificaciones (HU 12), en la ruta /notificaciones.
 *
 * Lista los avisos del usuario logueado, el más nuevo primero, y distingue
 * los que faltan leer. Abrir uno lo marca como leído y, si es de una carga,
 * lleva a su detalle en vez de dejar al usuario buscándola en el listado.
 *
 * Es la misma pantalla para el administrador y para el camionero: lo que
 * cambia es qué avisos le llegan a cada uno, y eso lo decide el backend.
 *
 * @returns {JSX.Element}
 */
export default function Notificaciones() {
  const navigate = useNavigate();
  const location = useLocation();

  const [notificaciones, setNotificaciones] = useState([]);
  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  // La que se está abriendo (deshabilita su botón mientras se marca) y el
  // error si no se pudo marcar.
  const [abriendo, setAbriendo] = useState(null);
  const [errorAlAbrir, setErrorAlAbrir] = useState('');

  // "Marcar todas como leídas": si el pedido está en curso, y el resumen, que
  // recibe el foco cuando el botón desaparece.
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const refResumen = useRef(null);

  useEffect(() => {
    const controlador = new AbortController();

    listarNotificaciones({}, { signal: controlador.signal })
      .then((datos) => {
        setNotificaciones(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setMensajeError(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudieron cargar las notificaciones. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, []);

  const cantidadNoLeidas = notificaciones.filter((notificacion) => !notificacion.leida).length;
  // Al administrador no le llegan avisos de cargas nuevas (las crea él): el
  // mensaje de lista vacía no se los promete.
  const esAdministrador = usuarioActual()?.rol === 'administrador';

  // Llegando desde el inicio, el botón lo dice ("Volver al inicio").
  const destino = destinoVolver(location, null);

  /**
   * Vuelve a la pantalla desde la que se entró.
   *
   * @returns {void}
   */
  const volver = () => navigate(destino.ruta, { state: destino.estado });

  /**
   * Marca como leídas todas las que faltaban, de una vez. Sirve sobre todo al
   * camionero: cada carga nueva le deja un aviso, y sin esto tenía que abrirlos
   * de a uno para bajar el contador.
   *
   * Al terminar el botón desaparece (ya no queda nada sin leer), así que el
   * foco pasa al resumen, que ahora dice "Ya leíste todas.".
   *
   * @returns {Promise<void>}
   */
  const marcarTodas = async () => {
    setErrorAlAbrir('');
    setMarcandoTodas(true);
    try {
      await marcarTodasLeidas();
      setNotificaciones((previas) => previas.map((otra) => ({ ...otra, leida: true })));
      refResumen.current?.focus({ preventScroll: true });
    } catch (error) {
      setErrorAlAbrir(
        error instanceof ErrorDeApi
          ? error.message
          : 'No se pudieron marcar las notificaciones como leídas. Intentá de nuevo.',
      );
    } finally {
      setMarcandoTodas(false);
    }
  };

  /**
   * Abre una notificación: si falta leerla la marca como leída, y si es de
   * una carga lleva a su detalle. Si no se pudo marcar, se queda acá y lo
   * dice, para que no parezca que se abrió.
   *
   * @param {object} notificacion - fila de `GET /notificaciones`.
   * @returns {Promise<void>}
   */
  const abrir = async (notificacion) => {
    setErrorAlAbrir('');

    if (!notificacion.leida) {
      setAbriendo(notificacion.id_notificacion);
      try {
        await marcarNotificacionLeida(notificacion.id_notificacion);
      } catch (error) {
        setErrorAlAbrir(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudo abrir la notificación. Intentá de nuevo.',
        );
        return;
      } finally {
        setAbriendo(null);
      }

      setNotificaciones((previas) =>
        previas.map((otra) =>
          otra.id_notificacion === notificacion.id_notificacion ? { ...otra, leida: true } : otra,
        ),
      );
    }

    if (notificacion.id_carga) {
      navigate(`/cargas/${notificacion.id_carga}`, {
        state: volverA('/notificaciones', 'Volver a Notificaciones', location.state),
      });
    }
  };

  return (
    <>
      <BarraSuperior />

      <main className="nt-contenido">
        {/*
          Sólo si se llegó desde otra pantalla (el inicio, por ejemplo). Desde
          la barra superior o la campana no hay a dónde volver.
        */}
        {destino && (
          <button type="button" className="nt-volver" onClick={volver}>
            <IconoFlechaAtras width={20} height={20} />
            {destino.texto}
          </button>
        )}

        <header className="nt-encabezado">
          <h1 className="nt-titulo">
            <IconoCampana width={26} height={26} />
            Notificaciones
          </h1>
          {estadoPantalla === 'ok' && notificaciones.length > 0 && (
            <div className="nt-encabezado__acciones">
              {/*
                No repite cuántas faltan leer: ya lo dice el contador del botón
                Notificaciones. Sólo confirma cuando no queda ninguna. El
                párrafo está siempre, aunque vacío, para que el lector de
                pantalla anuncie el cambio al marcar todas.
              */}
              <p className="nt-resumen" role="status" tabIndex={-1} ref={refResumen}>
                {cantidadNoLeidas === 0 ? 'Ya leíste todas.' : ''}
              </p>
              {cantidadNoLeidas > 0 && (
                <button
                  type="button"
                  className="ds-boton ds-boton--secundario nt-marcar-todas"
                  onClick={marcarTodas}
                  disabled={marcandoTodas}
                >
                  <IconoCheck width={18} height={18} />
                  {marcandoTodas ? 'Marcando...' : 'Marcar todas como leídas'}
                </button>
              )}
            </div>
          )}
        </header>

        {estadoPantalla === 'cargando' && <p className="nt-mensaje">Cargando notificaciones...</p>}

        {estadoPantalla === 'error' && (
          <div className="nt-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            {mensajeError}
          </div>
        )}

        {estadoPantalla === 'ok' && notificaciones.length === 0 && (
          <p className="nt-mensaje">
            {esAdministrador ? (
              <>
                Todavía no tenés notificaciones. Acá vas a ver los cambios de estado de tus cargas
                y las asignaciones confirmadas.
              </>
            ) : (
              <>
                Todavía no tenés notificaciones. Acá vas a ver los avisos de cargas nuevas,
                asignaciones y cambios de estado.
              </>
            )}
          </p>
        )}

        {errorAlAbrir && (
          <div className="nt-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            {errorAlAbrir}
          </div>
        )}

        {/*
          Agrupadas por antigüedad (Hoy, Ayer, Últimos 7 días...): todas
          juntas en una sola lista confundían. Dentro de cada grupo siguen de
          la más nueva a la más vieja, como llegan del backend.
        */}
        {estadoPantalla === 'ok' &&
          notificaciones.length > 0 &&
          agruparPorFecha(notificaciones, (notificacion) => notificacion.creado_en).map((grupo) => (
            <section key={grupo.clave} className="nt-grupo" aria-labelledby={`nt-grupo-${grupo.clave}`}>
              <h2 className="nt-grupo__titulo" id={`nt-grupo-${grupo.clave}`}>{grupo.titulo}</h2>
              <ul className="nt-lista">
                {grupo.elementos.map((notificacion) => {
                  const { Icono, nombre } = TIPOS[notificacion.tipo_evento] ?? TIPO_GENERICO;
                  const idTexto = `nt-texto-${notificacion.id_notificacion}`;
                  // Una leída que no es de ninguna carga ya no tiene nada que abrir.
                  const tieneAccion = Boolean(notificacion.id_carga) || !notificacion.leida;

                  return (
                    <li
                      key={notificacion.id_notificacion}
                      className={`nt-item${notificacion.leida ? '' : ' nt-item--no-leida'}`}
                    >
                      <span className="nt-item__icono" aria-hidden="true">
                        <Icono width={22} height={22} />
                      </span>

                      <div className="nt-item__cuerpo">
                        <p className="nt-item__tipo">
                          {nombre}
                          {!notificacion.leida && <span className="nt-etiqueta">Sin leer</span>}
                        </p>
                        <p className="nt-item__texto" id={idTexto}>
                          {notificacion.contenido}
                        </p>
                        <p className="nt-item__fecha">
                          <time
                            dateTime={notificacion.creado_en}
                            title={formatearFechaHora(notificacion.creado_en)}
                          >
                            {formatearMarcaCorta(notificacion.creado_en)}
                          </time>
                        </p>
                      </div>

                      {/*
                        Mismo botón "estirado" que las tarjetas del listado de
                        cargas: el click en cualquier parte del aviso lo abre, y
                        sigue siendo un único control enfocable.
                      */}
                      {tieneAccion && (
                        <button
                          type="button"
                          className="ds-boton ds-boton--secundario nt-item__abrir"
                          onClick={() => abrir(notificacion)}
                          disabled={abriendo === notificacion.id_notificacion}
                          aria-describedby={idTexto}
                        >
                          {notificacion.id_carga ? (
                            <>
                              <IconoOjo width={18} height={18} />
                              Ver carga
                            </>
                          ) : (
                            <>
                              <IconoCheck width={18} height={18} />
                              Marcar como leída
                            </>
                          )}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
      </main>
    </>
  );
}
