import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BarraSuperior from '../components/BarraSuperior';
import {
  IconoAlerta,
  IconoCajaMas,
  IconoCampana,
  IconoEtiqueta,
  IconoCamion,
  IconoCerrar,
  IconoCheck,
  IconoChevronAbajo,
  IconoChevronDerecha,
  IconoFlechaAtras,
} from '../components/Iconos';
import {
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from '../api/notificaciones';
import { listarCargas } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import { usuarioActual } from '../api/sesion';
import { formatearFechaHora, formatearMarcaCorta, rutaPendientesAsignacion } from '../utils/carga';
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
 * Cuántas notificaciones se muestran de entrada y cuántas más trae cada
 * "Mostrar más" (corrección del profesor del 17/11, punto 6).
 */
const POR_PAGINA = 20;

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
  // Si quedan notificaciones más viejas para traer con "Mostrar más".
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState('');
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

    // Pide una más de las que muestra: si llega, es que quedan más para "Mostrar más".
    listarNotificaciones({ limite: POR_PAGINA + 1 }, { signal: controlador.signal })
      .then((datos) => {
        setNotificaciones(datos.slice(0, POR_PAGINA));
        setHayMas(datos.length > POR_PAGINA);
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

  // Las sin leer cuentan sobre todas, no sólo sobre las 20 que se ven: si no,
  // con avisos sin leer más viejos decía "Ya leíste todas." y escondía
  // "Marcar todas como leídas". Lo da el servidor; mientras no llega, se usan
  // las que se ven.
  const [noLeidasTotal, setNoLeidasTotal] = useState(null);
  const cantidadNoLeidas =
    noLeidasTotal ?? notificaciones.filter((notificacion) => !notificacion.leida).length;

  useEffect(() => {
    const controlador = new AbortController();
    listarNotificaciones({ soloNoLeidas: true }, { signal: controlador.signal })
      .then((datos) => setNoLeidasTotal(datos.length))
      .catch(() => {});
    return () => controlador.abort();
  }, []);
  // Al administrador no le llegan avisos de cargas nuevas (las crea él): el
  // mensaje de lista vacía no se los promete.
  const esAdministrador = usuarioActual()?.rol === 'administrador';

  // Cuántas cargas tienen camioneros postulados esperando que el
  // administrador elija uno (null mientras no se sabe). Van arriba de todo,
  // en una tarjeta aparte, como las solicitudes de seguimiento de Instagram:
  // es lo único de la pantalla que espera una respuesta suya.
  const [cargasPendientes, setCargasPendientes] = useState(null);
  const pendientesAsignacion = cargasPendientes?.length ?? 0;

  useEffect(() => {
    if (!esAdministrador) return undefined;
    const controlador = new AbortController();
    listarCargas({ estado: 'pendiente' }, { signal: controlador.signal })
      .then(setCargasPendientes)
      // Si no se pudo saber, la tarjeta no aparece: el resto de la pantalla sigue andando.
      .catch(() => {});
    return () => controlador.abort();
  }, [esAdministrador]);

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
      setNoLeidasTotal(0);
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
   * Trae las siguientes notificaciones, más viejas que la última que se ve, y
   * las suma al final. Se agrupan junto con las que ya estaban (Hoy, Ayer...).
   *
   * @returns {Promise<void>}
   */
  const verMas = async () => {
    const ultima = notificaciones.at(-1);
    if (!ultima) return;
    setErrorMas('');
    setCargandoMas(true);
    try {
      const datos = await listarNotificaciones({
        limite: POR_PAGINA + 1,
        antesDe: ultima.id_notificacion,
      });
      setNotificaciones((previas) => [...previas, ...datos.slice(0, POR_PAGINA)]);
      setHayMas(datos.length > POR_PAGINA);
    } catch (error) {
      setErrorMas(
        error instanceof ErrorDeApi
          ? error.message
          : 'No se pudieron cargar más notificaciones. Intentá de nuevo.',
      );
    } finally {
      setCargandoMas(false);
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
      setNoLeidasTotal((total) => (total === null ? null : Math.max(0, total - 1)));
    }

    if (notificacion.id_carga) {
      navigate(`/cargas/${notificacion.id_carga}`, {
        state: volverA('/notificaciones', 'Volver a Notificaciones', location.state),
      });
    }
  };

  return (
    <>
      <BarraSuperior volver={destino} />

      <main className="nt-contenido">
        {/*
          Sólo si se llegó desde otra pantalla (el inicio, por ejemplo). Desde
          la barra superior o la campana no hay a dónde volver.
        */}
        {destino && (
          <button type="button" className="nt-volver bs-volver-pantalla" onClick={volver}>
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
          <div className="ds-aviso ds-aviso--error" role="alert">
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

        {/* Lo que espera una respuesta del administrador, arriba de todo. */}
        {pendientesAsignacion > 0 && (
          <section className="nt-destacadas" aria-label="Requiere tu respuesta">
            <Link
              to={rutaPendientesAsignacion(cargasPendientes)}
              state={volverA('/notificaciones', 'Volver a Notificaciones', location.state)}
              className="nt-item nt-item--clickeable nt-item--pendientes"
            >
              <span className="nt-item__icono" aria-hidden="true">
                <IconoEtiqueta width={22} height={22} />
              </span>
              <span className="nt-item__cuerpo">
                <span className="nt-item__tipo">Pendientes de asignación</span>
                <span className="nt-item__texto">
                  {pendientesAsignacion === 1
                    ? '1 carga tiene camioneros postulados esperando que elijas uno.'
                    : `${pendientesAsignacion} cargas tienen camioneros postulados esperando que elijas uno.`}
                </span>
              </span>
              {/* El número va a la derecha, junto a la flecha, y no pegado al
                  título: en el celular el título ocupa dos renglones y el
                  número quedaba solo debajo. */}
              <span className="nt-item__fin">
                <span className="nt-contador">{pendientesAsignacion}</span>
                <span className="nt-item__flecha" aria-hidden="true">
                  <IconoChevronDerecha width={22} height={22} />
                </span>
              </span>
            </Link>
          </section>
        )}

        {errorAlAbrir && (
          <div className="ds-aviso ds-aviso--error" role="alert">
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
                      className={`nt-item${notificacion.leida ? '' : ' nt-item--no-leida'}${
                        tieneAccion ? ' nt-item--clickeable' : ''
                      }`}
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
                        Todo el aviso es clickeable, sin un botón "Ver carga"
                        repetido en cada uno. El control es la flechita,
                        "estirada" con ::after sobre todo el aviso: el click
                        funciona en cualquier parte y sigue siendo un único
                        control enfocable, con su nombre para el lector de
                        pantalla. La flechita además avisa, sin hover (en el
                        celular), cuáles avisos abren algo.
                      */}
                      {tieneAccion && (
                        <button
                          type="button"
                          className="nt-item__abrir"
                          onClick={() => abrir(notificacion)}
                          disabled={abriendo === notificacion.id_notificacion}
                          aria-label={notificacion.id_carga ? 'Ver carga' : 'Marcar como leída'}
                          aria-describedby={idTexto}
                        >
                          {notificacion.id_carga ? (
                            <IconoChevronDerecha width={22} height={22} />
                          ) : (
                            <IconoCheck width={20} height={20} />
                          )}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

        {estadoPantalla === 'ok' && hayMas && (
          <div className="nt-mas">
            {errorMas && (
              <p className="nt-mas__error" role="alert">
                <IconoAlerta width={18} height={18} />
                {errorMas}
              </p>
            )}
            <button
              type="button"
              className="ds-boton ds-boton--secundario"
              onClick={verMas}
              disabled={cargandoMas}
            >
              <IconoChevronAbajo width={18} height={18} />
              {cargandoMas ? 'Cargando...' : 'Mostrar más'}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
