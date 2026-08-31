import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarCargas } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
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
import { capitalizarEstado, formatearFecha, formatearPeso } from '../utils/carga';
import './Cargas.css';

/**
 * Filtros en blanco. Sirve para inicializar el estado y para el botón
 * "Limpiar filtros".
 */
const FILTROS_VACIOS = { estado: '', fecha: '', destino: '' };

/**
 * Espera antes de aplicar lo que se escribió en el filtro de destino, para no
 * pegarle al backend en cada tecla.
 */
const RETRASO_DESTINO_MS = 350;

/**
 * Pantalla de consulta de cargas (HU 2.5), en la ruta /cargas.
 *
 * Al entrar pide `GET /cargas` sin filtros. Cada vez que cambia un filtro
 * (estado, fecha o destino) vuelve a pedir con los query params correspondientes
 * y actualiza la grilla de tarjetas. Al hacer click en una tarjeta navega al
 * detalle de esa carga, pasándole los datos que ya tiene el listado por router
 * state (GET /cargas no devuelve `id_carga`, así que no hay forma de recargarla
 * por URL).
 *
 * @returns {JSX.Element}
 */
export default function Cargas() {
  const navigate = useNavigate();

  // `filtros` son los filtros ya aplicados (los que disparan el pedido).
  // `destinoTexto` es lo que hay escrito en el input de destino ahora mismo;
  // se vuelca a `filtros.destino` con un pequeño retraso.
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [destinoTexto, setDestinoTexto] = useState('');

  const [cargas, setCargas] = useState([]);
  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  // Junta los estados que aparecieron en alguna respuesta, para armar el
  // <select> sin depender de que el filtro actual los deje pasar.
  const estadosVistosRef = useRef(new Set());
  const [estadosDisponibles, setEstadosDisponibles] = useState([]);

  // Destinos únicos del listado completo (respuesta sin filtros). Alimentan el
  // <datalist> del input de destino: son sólo sugerencias, el campo sigue siendo
  // texto libre y el backend hace la coincidencia parcial.
  const [destinosSugeridos, setDestinosSugeridos] = useState([]);

  const hayFiltrosAplicados = Boolean(filtros.estado || filtros.fecha || filtros.destino);

  // Vuelca el texto de destino a los filtros aplicados, con debounce.
  useEffect(() => {
    const id = setTimeout(() => {
      setFiltros((previos) =>
        previos.destino === destinoTexto ? previos : { ...previos, destino: destinoTexto },
      );
    }, RETRASO_DESTINO_MS);
    return () => clearTimeout(id);
  }, [destinoTexto]);

  // Pide las cargas cada vez que cambian los filtros aplicados. Si llega un
  // cambio antes de que responda el pedido anterior, lo cancela (gana el último).
  useEffect(() => {
    const controlador = new AbortController();
    const sinFiltros = !filtros.estado && !filtros.fecha && !filtros.destino;
    setEstadoPantalla('cargando');
    setMensajeError('');

    listarCargas(filtros, { signal: controlador.signal })
      .then((datos) => {
        for (const carga of datos) {
          if (carga.estado_actual) estadosVistosRef.current.add(carga.estado_actual);
        }
        setEstadosDisponibles([...estadosVistosRef.current].sort());

        // El listado completo (sin filtros) es la fuente de las sugerencias de
        // destino. Con filtros activos la respuesta está recortada y no sirve.
        if (sinFiltros) {
          const destinos = [...new Set(datos.map((fila) => fila.destino).filter(Boolean))];
          destinos.sort((a, b) => a.localeCompare(b, 'es'));
          setDestinosSugeridos(destinos);
        }

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
    setDestinoTexto('');
    setFiltros(FILTROS_VACIOS);
  };

  /**
   * Navega al detalle de una carga, llevando sus datos por router state.
   *
   * @param {object} carga - la fila del listado sobre la que se hizo click.
   * @returns {void}
   */
  const irAlDetalle = (carga) => {
    navigate('/cargas/detalle', { state: { carga } });
  };

  // Incluye lo tipeado en destino aunque el debounce todavía no lo haya aplicado.
  const hayAlgunFiltro = hayFiltrosAplicados || destinoTexto.trim() !== '';

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      <main className="us-contenido">
        <div className="us-encabezado">
          <h1>Gestión de Cargas</h1>
        </div>

        {/* Filtros: combinables entre sí. Cada cambio vuelve a pedir GET /cargas. */}
        <div className="cg-filtros">
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
                  {capitalizarEstado(estado)}
                </option>
              ))}
            </select>
          </div>

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

          <div className="cg-filtro">
            <label className="ds-campo__label" htmlFor="cg-destino">
              Destino
            </label>
            <input
              id="cg-destino"
              type="text"
              className="ds-campo__input"
              placeholder="Ej: Rosario"
              list="cg-destinos"
              autoComplete="off"
              value={destinoTexto}
              onChange={(evento) => setDestinoTexto(evento.target.value)}
            />
            {/* Sugerencias: el usuario puede elegir una o seguir escribiendo libre. */}
            <datalist id="cg-destinos">
              {destinosSugeridos.map((destino) => (
                <option key={destino} value={destino} />
              ))}
            </datalist>
          </div>

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
            {cargas.map((carga, indice) => (
              <article
                key={`${carga.origen}|${carga.destino}|${carga.fecha}|${carga.tipo_carga}|${indice}`}
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
