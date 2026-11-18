import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { listarCargas } from '../api/cargas';
import { listarProvincias } from '../api/geografia';
import CampoFecha from '../components/CampoFecha';
import ComboBox from '../components/ComboBox';
import { ErrorDeApi } from '../api/usuarios';
import { usuarioActual } from '../api/sesion';
import {
  IconoAlerta,
  IconoCaja,
  IconoCajaMas,
  IconoCalendario,
  IconoCerrar,
  IconoFlechaAtras,
  IconoOjo,
  IconoPeso,
  IconoRuta,
  IconoUbicacion,
  IconoUsuario,
} from '../components/Iconos';
import BarraSuperior from '../components/BarraSuperior';
import EstadoCarga from '../components/EstadoCarga';
import SelectorPeriodo from '../components/SelectorPeriodo';
import {
  formatearFecha,
  formatearKm,
  formatearPeso,
  motivoSinCapacidad,
  retiroVencido,
} from '../utils/carga';
import { ESTADOS, etiquetaEstado } from '../utils/estadosCarga';
import { destinoVolver, volverA } from '../utils/volver';
import './DetalleCarga.css';
import './Cargas.css';

/**
 * Filtros en blanco. Sirve para inicializar el estado y para el botón
 * "Limpiar filtros".
 */
const FILTROS_VACIOS = { estado: '', fecha: '', destino_provincia: '' };

/**
 * Pantalla de consulta de cargas (HU 2.5), en la ruta /cargas.
 *
 * Al entrar pide `GET /cargas` sin filtros. Cada vez que cambia un filtro
 * (estado, fecha o destino) vuelve a pedir con los query params correspondientes
 * y actualiza la grilla de tarjetas. Al hacer click en una tarjeta navega a
 * `/cargas/:id` con el `id_carga` de esa fila; el detalle recarga la carga con
 * `GET /cargas/:id`.
 *
 * El filtro de estado también vive en la URL (`/cargas?estado=pendiente`),
 * para que otra pantalla pueda abrir el listado ya filtrado: el panel del
 * administrador (HU 16) lo usa para "Ver pendientes de asignación".
 *
 * @returns {JSX.Element}
 */
export default function Cargas() {
  const navigate = useNavigate();
  const location = useLocation();
  const [parametrosUrl, setParametrosUrl] = useSearchParams();

  // Los tres filtros son discretos (se eligen de una lista o de un calendario),
  // así que cada cambio dispara un único pedido y no hace falta esperar a que
  // el usuario termine de escribir.
  // El estado no se guarda en `filtros`: se lee siempre de la URL, que es la
  // única fuente. Si se guardara también acá, entrar a "Cargas" desde la barra
  // estando en `?estado=pendiente` dejaría el filtro viejo puesto.
  const [filtrosLocales, setFiltros] = useState(FILTROS_VACIOS);
  const estadoUrl = parametrosUrl.get('estado') ?? '';
  // Período de creación (filtro "Creada", sólo administrador). Va en la URL,
  // como el estado: así las casillas de "Cargas por estado" del panel llevan
  // al listado con el mismo período que contaron.
  const fechaUrl = (clave) => {
    const valor = parametrosUrl.get(clave) ?? '';
    return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : '';
  };
  const creadaDesde = fechaUrl('creada_desde');
  const creadaHasta = fechaUrl('creada_hasta');
  const filtros = useMemo(
    () => ({ ...filtrosLocales, estado: estadoUrl, creada_desde: creadaDesde, creada_hasta: creadaHasta }),
    [filtrosLocales, estadoUrl, creadaDesde, creadaHasta],
  );

  /**
   * Escribe en la URL el estado y el período. Con el `state`, cambiar un
   * filtro no borra a dónde vuelve la pantalla; `replace` para no llenar el
   * historial con un paso por cada cambio.
   *
   * @param {{estado?: string, creada_desde?: string, creada_hasta?: string}} valores
   * @returns {void}
   */
  const escribirUrl = (valores) => {
    const params = {};
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor) params[clave] = valor;
    }
    setParametrosUrl(params, { replace: true, state: location.state });
  };

  /**
   * Cambia el filtro de estado escribiéndolo en la URL. `replace` para no
   * llenar el historial con un paso por cada cambio de filtro.
   *
   * @param {string} estado - estado elegido, o '' para no filtrar.
   * @returns {void}
   */
  const cambiarEstadoFiltro = (estado) => {
    // El período se conserva: se cambia sólo el estado.
    escribirUrl({ estado, creada_desde: creadaDesde, creada_hasta: creadaHasta });
  };


  // Si se llegó desde otra pantalla (Notificaciones, el inicio), el botón de
  // volver lleva ahí; desde la barra superior no hay botón.
  const destino = destinoVolver(location, null);

  const [cargas, setCargas] = useState([]);
  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  // Junta los estados que aparecieron en alguna respuesta, para armar el
  // <select> sin depender de que el filtro actual los deje pasar.
  const estadosVistosRef = useRef(new Set());
  const [estadosDisponibles, setEstadosDisponibles] = useState([]);

  // Provincias del catálogo, para el filtro por destino. Se piden una vez y la
  // capa de API las cachea, así que compartir la lista con el formulario de
  // alta no cuesta un pedido más.
  const [provincias, setProvincias] = useState([]);

  // HU 3: al camionero el backend le devuelve sólo las cargas en "disponible",
  // que son a las que se puede postular. Como para él todas tienen el mismo
  // estado, el filtro por estado no le aporta nada y se oculta; le quedan los
  // de fecha y destino, que son los que sí le sirven para elegir un viaje.
  const esCamionero = usuarioActual()?.rol === 'camionero';

  const hayAlgunFiltro = Boolean(
    filtros.estado || filtros.fecha || filtros.destino_provincia || creadaDesde || creadaHasta,
  );

  useEffect(() => {
    let vigente = true;
    listarProvincias()
      .then((datos) => {
        if (vigente) setProvincias(datos);
      })
      // Si el catálogo no carga, el filtro de destino queda vacío pero el
      // listado sigue andando: no vale la pena romper toda la pantalla.
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);

  // Pide las cargas cada vez que cambian los filtros aplicados. Si llega un
  // cambio antes de que responda el pedido anterior, lo cancela (gana el último).
  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPantalla('cargando');
    setMensajeError('');

    listarCargas(filtros, { signal: controlador.signal })
      .then((datos) => {
        for (const carga of datos) {
          if (carga.estado_actual) estadosVistosRef.current.add(carga.estado_actual);
        }
        // El estado filtrado puede venir por URL sin que haya ninguna carga en
        // él: se suma igual, para que el <select> lo muestre elegido.
        if (filtros.estado) estadosVistosRef.current.add(filtros.estado);
        setEstadosDisponibles([...estadosVistosRef.current].sort());
        setCargas(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        // El pedido se canceló porque cambió un filtro: no es un error real.
        if (error?.name === 'AbortError') return;
        setMensajeError(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudo cargar el listado de cargas. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, [filtros]);

  /**
   * Deja los filtros en blanco y vuelve a traer el listado completo.
   *
   * @returns {void}
   */
  const limpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS);
    escribirUrl({});
  };

  /**
   * Navega al detalle de una carga por su `id_carga`. El detalle recarga los
   * datos con `GET /cargas/:id`, así que no hace falta pasarlos por router state.
   *
   * @param {object} carga - la fila del listado sobre la que se hizo click.
   * @returns {void}
   */
  const irAlDetalle = (carga) => {
    // Con la búsqueda incluida, volver del detalle deja los filtros como estaban.
    navigate(`/cargas/${carga.id_carga}`, {
      state: volverA(location.pathname + location.search, 'Volver a Cargas', location.state),
    });
  };

  // Al camionero se le separan las cargas que no puede llevar (HU 4): pesan
  // más que su capacidad o no tiene la capacidad cargada. Al administrador
  // `motivoSinCapacidad` siempre le da null, así que ve todas juntas.
  const postulables = cargas.filter((carga) => !motivoSinCapacidad(carga));
  const excedidas = cargas.filter((carga) => motivoSinCapacidad(carga));
  const sinCapacidadCargada = excedidas.some((carga) => motivoSinCapacidad(carga) === 'sin-capacidad');

  /**
   * Qué decir cuando no hay ninguna carga en la grilla principal.
   *
   * @returns {string}
   */
  const mensajeSinCargas = () => {
    if (excedidas.length > 0) return 'No hay cargas que pueda llevar tu vehículo en este momento.';
    if (hayAlgunFiltro) {
      return 'No hay cargas que coincidan con los filtros aplicados. Probá con otros valores o limpiá los filtros.';
    }
    return esCamionero ? 'No hay cargas disponibles en este momento.' : 'Todavía no hay cargas registradas.';
  };

  /**
   * Tarjeta de una carga del listado.
   *
   * @param {object} carga
   * @param {boolean} [excedida] - si el camionero no la puede llevar: se ve atenuada.
   * @returns {JSX.Element}
   */
  const tarjeta = (carga, excedida = false) => (
    <article key={carga.id_carga} className={`cg-card${excedida ? ' cg-card--excedida' : ''}`}>
      <div className="cg-card__top">
        <h2 className="cg-card__titulo">{carga.tipo_carga}</h2>
        {/*
          Al camionero no se le muestra el estado: todas las que ve están
          abiertas a postulaciones, y una "Pendiente" (que ya tiene postulados)
          se leería como que no puede postularse.
        */}
        {!esCamionero && (
          <span className="cg-card__etiquetas">
            {retiroVencido(carga) && <span className="cg-etiqueta-vencida">Retiro vencido</span>}
            <EstadoCarga estado={carga.estado_actual} />
          </span>
        )}
      </div>

      <p className="cg-card__ruta">
        <IconoUbicacion width={18} height={18} />
        <span>{carga.origen}</span>
        <span className="cg-card__flecha" aria-hidden="true">
          →
        </span>
        <span>{carga.destino}</span>
      </p>

      <div className="cg-card__meta">
        <span>
          <IconoCalendario width={16} height={16} />
          {formatearFecha(carga.fecha)}
        </span>
        <span>
          <IconoPeso width={16} height={16} />
          {formatearPeso(carga.peso_kg)}
        </span>
        {/*
          Distancia estimada (HU 9): dato secundario, sólo para el
          administrador. Si quedó pendiente se avisa acá también, así
          se ve desde el listado qué cargas hay que reintentar.
        */}
        {!esCamionero && (
          <span>
            <IconoRuta width={16} height={16} />
            {carga.estado_calculo_km === 'ok'
              ? formatearKm(carga.kilometros_estimados)
              : 'Distancia pendiente'}
          </span>
        )}
      </div>

      {/*
        Cuántos camioneros esperan la asignación: se ve desde el listado cuál
        conviene resolver primero, sin abrir cada carga. Sólo en las
        pendientes y para el administrador (el backend no se lo manda al
        camionero).
      */}
      {!esCamionero && carga.estado_actual === ESTADOS.PENDIENTE && carga.cantidad_postulados > 0 && (
        <span className="cg-postulados">
          <IconoUsuario width={16} height={16} />
          {carga.cantidad_postulados === 1 ? '1 postulado' : `${carga.cantidad_postulados} postulados`}
        </span>
      )}

      {/*
        El botón "estirado" (::after cubre toda la tarjeta en el CSS) hace
        que el click en cualquier parte de la tarjeta lleve al detalle, sin
        perder accesibilidad: sigue siendo un único control enfocable.
      */}
      <button
        type="button"
        className="ds-boton ds-boton--secundario cg-card__vermas"
        onClick={() => irAlDetalle(carga)}
        aria-label={`Ver detalle de la carga de ${carga.origen} a ${carga.destino}`}
      >
        <IconoOjo width={18} height={18} />
        Ver detalle
      </button>
    </article>
  );

  return (
    <>
      <BarraSuperior volver={destino} />

      <main className="us-contenido">
        {destino && (
          <button
            type="button"
            className="dc-volver bs-volver-pantalla"
            onClick={() => navigate(destino.ruta, { state: destino.estado ?? null })}
          >
            <IconoFlechaAtras width={20} height={20} />
            {destino.texto}
          </button>
        )}

        <div className="us-encabezado">
          <h1 className="ds-titulo-pagina">
            <IconoCaja width={26} height={26} />
            {esCamionero ? 'Cargas disponibles' : 'Gestión de Cargas'}
          </h1>
          {/*
            HU 2.1 + 2.1.1: alta de carga, también alcanzable desde este listado.
            Mismo estilo que "Nuevo Usuario" en Gestión de Usuarios. El camionero
            no tiene botón acá: "Mis viajes" ya está en la barra superior.
          */}
          {!esCamionero && (
            <button
              type="button"
              className="ds-boton ds-boton--primario"
              onClick={() =>
                navigate('/cargas/nueva', {
                  state: volverA(location.pathname + location.search, 'Volver a Cargas', location.state),
                })
              }
            >
              <IconoCajaMas />
              Nueva Carga
            </button>
          )}
        </div>

        {esCamionero && (
          <p className="cg-intro">
            Estas son las cargas disponibles para tomar. Usá los filtros para encontrar
            la que te sirva por fecha o destino, y entrá a una para postularte.
          </p>
        )}

        {/* Filtros: combinables entre sí. Cada cambio vuelve a pedir GET /cargas. */}
        <div className={`cg-filtros${esCamionero ? ' cg-filtros--camionero' : ''}`}>
          {/* El filtro por estado es sólo para el administrador (ver `esCamionero`). */}
          {!esCamionero && (
            <div className="cg-filtro">
              <label className="ds-campo__label" htmlFor="cg-estado">
                Estado
              </label>
              <ComboBox
                id="cg-estado"
                buscable={false}
                opciones={estadosDisponibles.map((estado) => ({
                  valor: estado,
                  etiqueta: etiquetaEstado(estado),
                }))}
                valor={filtros.estado}
                alElegir={cambiarEstadoFiltro}
                marcador="Todos los estados"
                textoOpcionVacia="Todos los estados"
                etiquetaFiltro="Estado"
              />
            </div>
          )}

          {/*
            Por fecha de creación, sólo para el administrador: es el período
            con el que cuentan el panel de inicio y Métricas. Las casillas de
            "Cargas por estado" llegan con "Últimos 30 días" elegido.
          */}
          {!esCamionero && (
            <SelectorPeriodo
              id="cg-creada"
              etiqueta="Creada"
              className="cg-filtro"
              desde={creadaDesde}
              hasta={creadaHasta}
              alCambiar={({ desde, hasta }) =>
                escribirUrl({ estado: estadoUrl, creada_desde: desde, creada_hasta: hasta })
              }
            />
          )}

          <div className="cg-filtro">
            <label className="ds-campo__label" htmlFor="cg-fecha">
              Fecha de retiro
            </label>
            <CampoFecha
              id="cg-fecha"
              etiqueta="Fecha de retiro"
              valor={filtros.fecha}
              alCambiar={(fecha) => setFiltros((previos) => ({ ...previos, fecha }))}
              marcador="Cualquier fecha"
              esFiltro
            />
          </div>

          {/*
            Antes era un input de texto libre con sugerencias: buscaba por
            coincidencia parcial y no encontraba la misma ciudad escrita de
            otra forma. Ahora se filtra por provincia del catálogo, que además
            es la granularidad útil ("qué viajes hay hacia el litoral").
          */}
          <div className="cg-filtro">
            <label className="ds-campo__label" htmlFor="cg-destino-provincia">
              Provincia de destino
            </label>
            <ComboBox
              id="cg-destino-provincia"
              opciones={provincias.map((provincia) => ({
                valor: provincia.id,
                etiqueta: provincia.nombre,
              }))}
              valor={filtros.destino_provincia}
              alElegir={(nuevoValor) =>
                setFiltros((previos) => ({ ...previos, destino_provincia: nuevoValor }))
              }
              marcador="Todas las provincias"
              textoOpcionVacia="Todas las provincias"
              etiquetaFiltro="Provincia de destino"
            />
          </div>

          {/*
            Siempre a la vista y deshabilitado mientras no haya filtros, igual
            que en Gestión de Usuarios: se ve que la opción existe y la barra
            no cambia de forma al elegir el primer filtro.
          */}
          <button
            type="button"
            className="ds-boton ds-boton--secundario cg-limpiar"
            onClick={limpiarFiltros}
            disabled={!hayAlgunFiltro}
          >
            <IconoCerrar />
            Limpiar filtros
          </button>
        </div>

        {estadoPantalla === 'ok' && postulables.length > 0 && (
          <p className="cg-contador">
            {postulables.length}{' '}
            {postulables.length === 1 ? 'carga encontrada' : 'cargas encontradas'}
          </p>
        )}

        {estadoPantalla === 'error' && (
          <div className="ds-aviso ds-aviso--error" role="alert">
            <IconoAlerta width={22} height={22} />
            {mensajeError}
          </div>
        )}

        {estadoPantalla === 'cargando' && <p className="cg-mensaje">Cargando cargas...</p>}

        {estadoPantalla === 'ok' && postulables.length === 0 && (
          <p className="cg-mensaje">{mensajeSinCargas()}</p>
        )}

        {estadoPantalla === 'ok' && postulables.length > 0 && (
          <div className="cg-grilla">{postulables.map((carga) => tarjeta(carga))}</div>
        )}

        {/*
          Las que el camionero no puede llevar quedan aparte y al final, en vez
          de ocultarse: así sabe que existen (por ejemplo, para cuando cambie
          de vehículo), pero no se mezclan con las que sí puede tomar.
        */}
        {estadoPantalla === 'ok' && excedidas.length > 0 && (
          <section className="cg-excedidas" aria-labelledby="cg-excedidas-titulo">
            <h2 className="cg-excedidas__titulo" id="cg-excedidas-titulo">
              {sinCapacidadCargada ? 'No podés postularte todavía' : 'Superan la capacidad de tu vehículo'}
            </h2>
            <p className="cg-excedidas__texto">
              {sinCapacidadCargada
                ? 'Tu vehículo no tiene la capacidad cargada, así que no podés postularte a ninguna carga. Pedile a un administrador que la cargue.'
                : `Tu vehículo lleva hasta ${formatearPeso(excedidas[0].capacidad_camionero_kg)}. Estas cargas pesan más, así que no podés postularte.`}
            </p>
            <div className="cg-grilla">{excedidas.map((carga) => tarjeta(carga, true))}</div>
          </section>
        )}
      </main>
    </>
  );
}
