import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BarraSuperior from '../components/BarraSuperior';
import EstadoCarga from '../components/EstadoCarga';
import {
  IconoAjustes,
  IconoAlerta,
  IconoCaja,
  IconoCajaMas,
  IconoCampana,
  IconoEtiqueta,
  IconoGrafico,
  IconoReintentar,
  IconoUsuario,
} from '../components/Iconos';
import { listarCargas } from '../api/cargas';
import { obtenerMetricas } from '../api/metricas';
import { listarNotificaciones } from '../api/notificaciones';
import { ErrorDeApi } from '../api/usuarios';
import { formatearFecha } from '../utils/carga';
import { ESTADOS } from '../utils/estadosCarga';
// Las tarjetas de resumen (`pcm-tarjeta`) son las del panel del camionero
// (HU 17): se reusan sus estilos para que los dos paneles se vean igual.
import './PanelCamionero.css';
import './PanelAdministrador.css';

/** Orden en que se muestran los estados: el del ciclo de vida de una carga. */
const ORDEN_ESTADOS = [
  ESTADOS.DISPONIBLE,
  ESTADOS.PENDIENTE,
  ESTADOS.ACEPTADA,
  ESTADOS.EN_VIAJE,
  ESTADOS.ENTREGADA,
  ESTADOS.CANCELADA,
];

/**
 * Accesos directos a las secciones principales. Se muestran siempre, aunque
 * fallen todas las consultas del resumen: son la forma de seguir trabajando.
 */
const ACCESOS = [
  { to: '/usuarios', titulo: 'Gestión de usuarios', detalle: 'Altas, edición y consulta de cuentas.', Icono: IconoUsuario },
  { to: '/cargas', titulo: 'Gestión de cargas', detalle: 'Listado, detalle, estados y asignación.', Icono: IconoCaja },
  { to: '/cargas/nueva', titulo: 'Nueva carga', detalle: 'Registrar una carga para publicarla.', Icono: IconoCajaMas },
  { to: '/metricas', titulo: 'Panel de estadísticas', detalle: 'Tiempos, cumplimiento y gráficos.', Icono: IconoGrafico },
  { to: '/notificaciones', titulo: 'Notificaciones', detalle: 'Avisos de cargas, asignaciones y estados.', Icono: IconoCampana },
  { to: '/parametros', titulo: 'Parámetros operativos', detalle: 'Costo, peaje y tarifa por kilómetro.', Icono: IconoAjustes },
];

/** Días que abarca el conteo por estado: los mismos que el panel de métricas por defecto. */
const DIAS_PERIODO = 30;

/**
 * Los últimos `DIAS_PERIODO` días, incluido hoy, en hora local del navegador.
 * Mismo criterio que el período por defecto de `Metricas.jsx`, para que el
 * panel y las estadísticas den el mismo número. Se arma con los getters
 * locales y no con `toISOString`, que pasa a UTC y puede correr el día.
 *
 * @returns {{fechaDesde: string, fechaHasta: string}} fechas AAAA-MM-DD.
 */
function periodoDelConteo() {
  const aTexto = (fecha) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(hoy.getDate() - (DIAS_PERIODO - 1));
  return { fechaDesde: aTexto(desde), fechaHasta: aTexto(hoy) };
}

/*
 * Las tres consultas del resumen. Reutilizan endpoints que ya existían
 * (HU 13, HU 2.5 y HU 12): para tres números no hacía falta un endpoint de
 * resumen nuevo.
 */
const pedirMetricas = ({ signal }) => obtenerMetricas(periodoDelConteo(), { signal });
const pedirPendientes = ({ signal }) => listarCargas({ estado: ESTADOS.PENDIENTE }, { signal });
const pedirNoLeidas = ({ signal }) => listarNotificaciones({ soloNoLeidas: true }, { signal });

/**
 * Pide un dato del panel y lo deja como `{ estado, valor, error }`. Mismo
 * patrón que `useDato` del panel del camionero (HU 17).
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
        setDato({ estado: 'error', valor: null, error: fallo instanceof ErrorDeApi ? fallo.message : queFallo });
      });

    return () => controlador.abort();
    // `pedir` y `queFallo` son fijos: sólo se vuelve a pedir al reintentar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return dato;
}

/**
 * Tarjeta de resumen: un número y el acceso a su sección. Toda la tarjeta es
 * el enlace, así el acceso sigue disponible aunque el dato falle. Mismo
 * marcado que `TarjetaResumen` del panel del camionero.
 *
 * @param {object} props
 * @param {string} props.to - a dónde lleva.
 * @param {import('react').ComponentType} props.Icono
 * @param {string} props.titulo - qué cuenta.
 * @param {{estado: string}} props.dato - estado del pedido.
 * @param {number|string} props.cantidad - el número, cuando el dato llegó.
 * @param {string} props.detalle - qué significa el número.
 * @param {string} props.accion - texto del acceso.
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
 * Panel principal del administrador (HU 16), en la ruta /panel-administrador:
 * a donde lo lleva el login y el acceso "Inicio" de la barra (HU 15).
 *
 * Arriba, lo que requiere atención: las cargas pendientes de asignación (las
 * que ya tienen camioneros postulados) y las notificaciones sin leer, cada una
 * como tarjeta que lleva a su listado. Después, cuántas cargas hay en cada
 * estado, con el período que abarca el conteo. Abajo, los accesos directos.
 *
 * Sigue el mismo esquema que el panel del camionero (HU 17): cada dato se pide
 * por separado, y si falla alguno se avisa arriba con un único "Reintentar"
 * mientras las tarjetas y los accesos siguen llevando a su sección. Los datos
 * se piden cada vez que se entra al panel.
 *
 * Sólo el administrador llega acá: la ruta está dentro del grupo protegido
 * por rol de `App.jsx`, y los tres endpoints exigen el rol en el backend.
 *
 * @returns {JSX.Element}
 */
export default function PanelAdministrador() {
  const [version, setVersion] = useState(0);

  const pendientes = useDato(pedirPendientes, version, 'No se pudieron cargar las cargas pendientes de asignación.');
  const noLeidas = useDato(pedirNoLeidas, version, 'No se pudieron cargar tus notificaciones.');
  const metricas = useDato(pedirMetricas, version, 'No se pudo cargar el conteo de cargas por estado.');

  const cantidadPendientes = pendientes.valor?.length ?? 0;
  // El backend devuelve 100 notificaciones como máximo, igual que para el contador de la barra.
  const cantidadNoLeidas = noLeidas.valor?.length ?? 0;
  const periodo = metricas.valor?.periodo;
  const totalCargas = metricas.valor?.total_cargas ?? 0;

  const errores = [pendientes, noLeidas, metricas].filter((dato) => dato.estado === 'error');

  return (
    <>
      <BarraSuperior />

      <main className="us-contenido pcm-contenido">
        <div className="us-encabezado">
          <h1>Panel del administrador</h1>
        </div>
        <p className="pcm-intro">Así está la operación hoy. Tocá cada tarjeta para ir a esa sección.</p>

        {errores.length > 0 && (
          <div className="pcm-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            <span className="pcm-aviso-error__texto">
              {/* Los mensajes del backend no siempre terminan en punto. */}
              {errores.map((dato) => dato.error.replace(/([^.!?])$/, '$1.')).join(' ')} Los accesos siguen
              funcionando.
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

        <section className="pcm-tarjetas pa-tarjetas" aria-label="Requiere tu atención">
          <TarjetaResumen
            to={`/cargas?estado=${ESTADOS.PENDIENTE}`}
            Icono={IconoEtiqueta}
            titulo="Pendientes de asignación"
            dato={pendientes}
            cantidad={cantidadPendientes}
            detalle="Cargas con camioneros postulados, esperando que elijas a uno."
            accion="Ver pendientes"
            destacada={cantidadPendientes > 0}
          />
          <TarjetaResumen
            to="/notificaciones"
            Icono={IconoCampana}
            titulo="Notificaciones sin leer"
            dato={noLeidas}
            cantidad={cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas}
            detalle="Avisos de cambios de estado y asignaciones de tus cargas."
            accion="Ver notificaciones"
            destacada={cantidadNoLeidas > 0}
          />
        </section>

        <section className="pa-seccion" aria-labelledby="pa-titulo-estados">
          <div className="pa-seccion__encabezado">
            <h2 className="pa-seccion__titulo" id="pa-titulo-estados">
              Cargas por estado
            </h2>
            <Link to="/metricas" className="pa-enlace">
              Ver estadísticas completas →
            </Link>
          </div>

          {metricas.estado === 'cargando' && <p className="pa-mensaje">Cargando el resumen de cargas...</p>}

          {metricas.estado === 'error' && <p className="pa-mensaje">No se pudo cargar el conteo de cargas por estado.</p>}

          {metricas.estado === 'ok' && (
            <>
              {periodo && (
                <p className="pa-periodo">
                  Cargas creadas del {formatearFecha(periodo.fecha_desde)} al {formatearFecha(periodo.fecha_hasta)},
                  según el estado en que están hoy.
                </p>
              )}

              {totalCargas === 0 ? (
                <p className="pa-mensaje">
                  No se crearon cargas en este período.{' '}
                  <Link to="/cargas/nueva" className="pa-enlace">
                    Registrar una carga
                  </Link>
                </p>
              ) : (
                <ul className="pa-estados">
                  {ORDEN_ESTADOS.map((estado) => (
                    <li key={estado} className="pa-estado">
                      <span className="pa-estado__valor">{metricas.valor.cargas_por_estado?.[estado] ?? 0}</span>
                      <EstadoCarga estado={estado} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <section className="pa-seccion" aria-labelledby="pa-titulo-accesos">
          <h2 className="pa-seccion__titulo" id="pa-titulo-accesos">
            Accesos directos
          </h2>
          <ul className="pa-accesos">
            {ACCESOS.map(({ to, titulo, detalle, Icono }) => (
              <li key={to}>
                <Link to={to} className="pa-acceso">
                  <Icono width={24} height={24} />
                  <span className="pa-acceso__texto">
                    <span className="pa-acceso__titulo">{titulo}</span>
                    <span className="pa-acceso__detalle">{detalle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
