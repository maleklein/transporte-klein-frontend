import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { listarCargas } from '../api/cargas';
import { listarProvincias } from '../api/geografia';
import ComboBox from '../components/ComboBox';
import { ErrorDeApi } from '../api/usuarios';
import { usuarioActual } from '../api/sesion';
import {
  IconoAlerta,
  IconoCaja,
  IconoCajaMas,
  IconoCalendario,
  IconoCerrar,
  IconoOjo,
  IconoPeso,
  IconoRuta,
  IconoUbicacion,
} from '../components/Iconos';
import BarraSuperior from '../components/BarraSuperior';
import EstadoCarga from '../components/EstadoCarga';
import {
  formatearFecha,
  formatearKm,
  formatearPeso,
  motivoSinCapacidad,
  retiroVencido,
} from '../utils/carga';
import { etiquetaEstado } from '../utils/estadosCarga';
import { volverA } from '../utils/volver';
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
  const filtros = useMemo(() => ({ ...filtrosLocales, estado: estadoUrl }), [filtrosLocales, estadoUrl]);

  /**
   * Cambia el filtro de estado escribiéndolo en la URL. `replace` para no
   * llenar el historial con un paso por cada cambio de filtro.
   *
   * @param {string} estado - estado elegido, o '' para no filtrar.
   * @returns {void}
   */
  const cambiarEstadoFiltro = (estado) => {
    setParametrosUrl(estado ? { estado } : {}, { replace: true });
  };

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

  const hayAlgunFiltro = Boolean(filtros.estado || filtros.fecha || filtros.destino_provincia);

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
    cambiarEstadoFiltro('');
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
        El botón "estirado" (::after cubre toda la tarjeta en el CSS) hace
        que el click en cualquier parte de la tarjeta lleve al detalle, sin
        perder accesibilidad: sigue siendo un único control enfocable.
      */}
      <button
        type="button"
        className="ds-boton ds-boton--primario cg-card__vermas"
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
      <BarraSuperior />

      <main className="us-contenido">
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
              onClick={() => navigate('/cargas/nueva')}
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
        <div className="cg-filtros">
          {/* El filtro por estado es sólo para el administrador (ver `esCamionero`). */}
          {!esCamionero && (
            <div className="cg-filtro">
              <label className="ds-campo__label" htmlFor="cg-estado">
                Estado
              </label>
              <select
                id="cg-estado"
                className="ds-campo__input"
                value={filtros.estado}
                onChange={(evento) => cambiarEstadoFiltro(evento.target.value)}
              >
                <option value="">Todos los estados</option>
                {estadosDisponibles.map((estado) => (
                  <option key={estado} value={estado}>
                    {etiquetaEstado(estado)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="cg-filtro">
            <label className="ds-campo__label" htmlFor="cg-fecha">
              Fecha
            </label>
            <input
              id="cg-fecha"
              type="date"
              className="ds-campo__input"
              value={filtros.fecha}
              onChange={(evento) =>
                setFiltros((previos) => ({ ...previos, fecha: evento.target.value }))
              }
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
            />
          </div>

          {/*
            El botón aparece sólo cuando hay algo que limpiar. Deshabilitado no
            aportaba nada: ocupaba lugar en la barra de filtros sin poder
            hacer nada, y en la vista del camionero —que tiene un filtro menos—
            quedaba especialmente fuera de lugar.
          */}
          {hayAlgunFiltro && (
            <button
              type="button"
              className="ds-boton ds-boton--secundario cg-limpiar"
              onClick={limpiarFiltros}
            >
              <IconoCerrar />
              Limpiar filtros
            </button>
          )}
        </div>

        {estadoPantalla === 'ok' && postulables.length > 0 && (
          <p className="cg-contador">
            {postulables.length}{' '}
            {postulables.length === 1 ? 'carga encontrada' : 'cargas encontradas'}
          </p>
        )}

        {estadoPantalla === 'error' && (
          <div className="cg-aviso-error" role="alert">
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
