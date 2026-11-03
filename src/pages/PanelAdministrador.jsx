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
  IconoGrafico,
  IconoInicio,
  IconoReintentar,
  IconoUsuario,
} from '../components/Iconos';
import { listarCargas } from '../api/cargas';
import { obtenerMetricas } from '../api/metricas';
import { listarNotificaciones } from '../api/notificaciones';
import { ErrorDeApi } from '../api/usuarios';
import { evitarFoco } from '../utils/formulario';
import { formatearFecha } from '../utils/carga';
import { ESTADOS } from '../utils/estadosCarga';
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
 * Las tres consultas del resumen. Van afuera del componente para que no
 * cambien de identidad en cada render: `useConsulta` las usa de dependencia.
 * Reutilizan endpoints que ya existían (HU 13, HU 2.5 y HU 12): para tres
 * números no hacía falta un endpoint de resumen nuevo.
 */
const pedirMetricas = (signal) => obtenerMetricas(periodoDelConteo(), { signal });
const pedirPendientes = (signal) => listarCargas({ estado: ESTADOS.PENDIENTE }, { signal });
const pedirNoLeidas = (signal) => listarNotificaciones({ soloNoLeidas: true }, { signal });

/**
 * Hace una consulta al montar la pantalla y expone su estado, para que cada
 * bloque del panel muestre su propio "cargando", error y reintento sin
 * depender de los demás.
 *
 * @param {(signal: AbortSignal) => Promise<*>} pedir - la consulta.
 * @returns {{estado: 'cargando'|'ok'|'error', datos: *, error: string, reintentar: () => void}}
 */
function useConsulta(pedir) {
  const [estado, setEstado] = useState('cargando');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    setEstado('cargando');
    setError('');

    pedir(controlador.signal)
      .then((respuesta) => {
        setDatos(respuesta);
        setEstado('ok');
      })
      .catch((causa) => {
        if (causa?.name === 'AbortError') return;
        setError(causa instanceof ErrorDeApi ? causa.message : 'No se pudo obtener este dato.');
        setEstado('error');
      });

    return () => controlador.abort();
  }, [pedir, intento]);

  return { estado, datos, error, reintentar: () => setIntento((valor) => valor + 1) };
}

/**
 * Mensaje de error de un bloque, con su botón para volver a intentar.
 *
 * @param {object} props
 * @param {string} props.mensaje
 * @param {() => void} props.alReintentar
 * @returns {JSX.Element}
 */
function ErrorDeBloque({ mensaje, alReintentar }) {
  return (
    <div className="pa-error" role="alert">
      <p className="pa-error__texto">
        <IconoAlerta width={18} height={18} />
        {mensaje}
      </p>
      <button
        type="button"
        className="ds-boton ds-boton--secundario pa-error__boton"
        onClick={alReintentar}
        onMouseDown={evitarFoco}
      >
        <IconoReintentar width={16} height={16} />
        Reintentar
      </button>
    </div>
  );
}

/**
 * Tarjeta de "Requiere tu atención": un número grande, qué significa y el
 * enlace a la sección donde se resuelve.
 *
 * @param {object} props
 * @param {ReturnType<typeof useConsulta>} props.consulta
 * @param {(datos: *) => number} props.contar - cuántos hay, a partir de la respuesta.
 * @param {string} props.titulo
 * @param {(cantidad: number) => string} props.describir - texto según la cantidad.
 * @param {string} props.enlace - a dónde lleva.
 * @param {string} props.textoEnlace
 * @returns {JSX.Element}
 */
function TarjetaAtencion({ consulta, contar, titulo, describir, enlace, textoEnlace }) {
  const cantidad = consulta.estado === 'ok' ? contar(consulta.datos) : 0;

  return (
    <article className={`pa-atencion${cantidad > 0 ? ' pa-atencion--alerta' : ''}`}>
      <h3 className="pa-atencion__titulo">{titulo}</h3>

      {consulta.estado === 'cargando' && <p className="pa-cargando">Cargando...</p>}
      {consulta.estado === 'error' && <ErrorDeBloque mensaje={consulta.error} alReintentar={consulta.reintentar} />}
      {consulta.estado === 'ok' && (
        <>
          <p className="pa-atencion__valor">{cantidad > 99 ? '99+' : cantidad}</p>
          <p className="pa-atencion__detalle">{describir(cantidad)}</p>
        </>
      )}

      <Link to={enlace} className="pa-atencion__enlace">
        {textoEnlace}
      </Link>
    </article>
  );
}

/**
 * Panel principal del administrador (HU 16), en la ruta /panel-administrador:
 * a donde lo lleva el login y el acceso "Inicio" de la barra (HU 15).
 *
 * Arriba, lo que requiere atención: las cargas pendientes de asignación (las
 * que ya tienen camioneros postulados) y las notificaciones sin leer, cada una
 * con su enlace. Después, cuántas cargas hay en cada estado, con el período
 * que abarca el conteo. Abajo, los accesos directos a cada sección.
 *
 * Cada bloque pide sus datos por separado y muestra su propio error: si falla
 * una consulta, las demás siguen a la vista, y los accesos directos no
 * dependen de ninguna. Los datos se piden cada vez que se entra al panel.
 *
 * Sólo el administrador llega acá: la ruta está dentro del grupo protegido
 * por rol de `App.jsx`, y los tres endpoints exigen el rol en el backend.
 *
 * @returns {JSX.Element}
 */
export default function PanelAdministrador() {
  const metricas = useConsulta(pedirMetricas);
  const pendientes = useConsulta(pedirPendientes);
  const noLeidas = useConsulta(pedirNoLeidas);

  const periodo = metricas.datos?.periodo;
  const totalCargas = metricas.datos?.total_cargas ?? 0;

  return (
    <>
      <BarraSuperior />

      <main className="us-contenido pa-contenido">
        <div className="us-encabezado">
          <h1 className="pa-titulo">
            <IconoInicio width={26} height={26} />
            Panel del administrador
          </h1>
        </div>

        <section className="pa-seccion" aria-labelledby="pa-titulo-atencion">
          <h2 className="pa-seccion__titulo" id="pa-titulo-atencion">
            Requiere tu atención
          </h2>
          <div className="pa-atencion-grilla">
            <TarjetaAtencion
              consulta={pendientes}
              contar={(cargas) => cargas.length}
              titulo="Pendientes de asignación"
              describir={(cantidad) =>
                cantidad === 0
                  ? 'No hay cargas esperando que elijas camionero.'
                  : cantidad === 1
                    ? 'Carga con camioneros postulados, esperando que elijas a uno.'
                    : 'Cargas con camioneros postulados, esperando que elijas a uno.'
              }
              enlace={`/cargas?estado=${ESTADOS.PENDIENTE}`}
              textoEnlace="Ver pendientes"
            />
            <TarjetaAtencion
              consulta={noLeidas}
              contar={(notificaciones) => notificaciones.length}
              titulo="Notificaciones sin leer"
              describir={(cantidad) =>
                cantidad === 0
                  ? 'Estás al día: no tenés avisos sin leer.'
                  : cantidad === 1
                    ? 'Aviso que todavía no leíste.'
                    : 'Avisos que todavía no leíste.'
              }
              enlace="/notificaciones"
              textoEnlace="Abrir notificaciones"
            />
          </div>
        </section>

        <section className="pa-seccion" aria-labelledby="pa-titulo-estados">
          <div className="pa-seccion__encabezado">
            <h2 className="pa-seccion__titulo" id="pa-titulo-estados">
              Cargas por estado
            </h2>
            <Link to="/metricas" className="pa-enlace">
              Ver estadísticas completas
            </Link>
          </div>

          {metricas.estado === 'cargando' && <p className="pa-mensaje">Cargando el resumen de cargas...</p>}

          {metricas.estado === 'error' && (
            <ErrorDeBloque mensaje={metricas.error} alReintentar={metricas.reintentar} />
          )}

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
                      <span className="pa-estado__valor">{metricas.datos.cargas_por_estado?.[estado] ?? 0}</span>
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
