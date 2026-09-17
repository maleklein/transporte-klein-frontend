import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarCargas } from '../api/cargas';
import { listarProvincias } from '../api/geografia';
import ComboBox from '../components/ComboBox';
import { ErrorDeApi } from '../api/usuarios';
import { usuarioActual } from '../api/sesion';
import {
  IconoAlerta,
  IconoCalendario,
  IconoCamion,
  IconoCerrar,
  IconoOjo,
  IconoPeso,
  IconoUbicacion,
} from '../components/Iconos';
import EstadoCarga from '../components/EstadoCarga';
import { formatearFecha, formatearPeso } from '../utils/carga';
import { etiquetaEstado } from '../utils/estadosCarga';
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
 * @returns {JSX.Element}
 */
export default function Cargas() {
  const navigate = useNavigate();

  // Los tres filtros son discretos (se eligen de una lista o de un calendario),
  // así que cada cambio dispara un único pedido y no hace falta esperar a que
  // el usuario termine de escribir.
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

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
  };

  /**
   * Navega al detalle de una carga por su `id_carga`. El detalle recarga los
   * datos con `GET /cargas/:id`, así que no hace falta pasarlos por router state.
   *
   * @param {object} carga - la fila del listado sobre la que se hizo click.
   * @returns {void}
   */
  const irAlDetalle = (carga) => {
    navigate(`/cargas/${carga.id_carga}`);
  };

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      <main className="us-contenido">
        <div className="us-encabezado">
          <h1>{esCamionero ? 'Cargas disponibles' : 'Gestión de Cargas'}</h1>
        </div>

        {esCamionero && (
          <p className="cg-intro">
            Estas son las cargas disponibles para tomar. Usá los filtros para encontrar
            la que te sirva por fecha o destino.
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
                onChange={(evento) =>
                  setFiltros((previos) => ({ ...previos, estado: evento.target.value }))
                }
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

        {estadoPantalla === 'ok' && cargas.length > 0 && (
          <p className="cg-contador">
            {cargas.length} {cargas.length === 1 ? 'carga encontrada' : 'cargas encontradas'}
          </p>
        )}

        {estadoPantalla === 'error' && (
          <div className="cg-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            {mensajeError}
          </div>
        )}

        {estadoPantalla === 'cargando' && <p className="cg-mensaje">Cargando cargas...</p>}

        {estadoPantalla === 'ok' && cargas.length === 0 && (
          <p className="cg-mensaje">
            {hayAlgunFiltro
              ? 'No hay cargas que coincidan con los filtros aplicados. Probá con otros valores o limpiá los filtros.'
              : 'Todavía no hay cargas registradas.'}
          </p>
        )}

        {estadoPantalla === 'ok' && cargas.length > 0 && (
          <div className="cg-grilla">
            {cargas.map((carga) => (
              <article
                key={carga.id_carga}
                className="cg-card"
              >
                <div className="cg-card__top">
                  <h2 className="cg-card__titulo">{carga.tipo_carga}</h2>
                  <EstadoCarga estado={carga.estado_actual} />
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
            ))}
          </div>
        )}
      </main>
    </>
  );
}
