import { useEffect, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLocation } from 'react-router-dom';
import BarraSuperior from '../components/BarraSuperior';
import MigasDePan from '../components/MigasDePan';
import { IconoAlerta, IconoGrafico } from '../components/Iconos';
import SelectorPeriodo from '../components/SelectorPeriodo';
import { obtenerMetricas } from '../api/metricas';
import { ErrorDeApi } from '../api/usuarios';
import { evitarFoco } from '../utils/formulario';
import { formatearFecha } from '../utils/carga';
import { etiquetaEstado, sufijoEstado } from '../utils/estadosCarga';
import { destinoVolver } from '../utils/volver';
import { useAvisoSinConexion } from '../components/contextoConexion';
import './DetalleCarga.css';
import './Metricas.css';

/** Orden fijo en el que se muestran los estados en el gráfico de barras. */
const ORDEN_ESTADOS = ['disponible', 'pendiente', 'aceptada', 'en_viaje', 'entregada', 'cancelada'];

/**
 * Color sólido por estado para el gráfico "Cargas por estado". Mismo criterio
 * semántico que usa `EstadoCarga` (`sufijoEstado`), pero con el tono oscuro
 * de cada color: el fondo clarito del badge no se distinguiría sobre el
 * blanco del gráfico.
 */
const COLOR_POR_SUFIJO = {
  disponible: '#1F4E79',
  'en-viaje': '#8A5300',
  entregada: '#1B5E20',
  cancelada: '#8E1F1F',
  neutro: '#4A5568',
};

/**
 * Franja que marca la barra bajo el mouse. Sin esto, Recharts usa un gris
 * (#ccc) muy fuerte: va el celeste del sistema (--color-primario-claro). Es un
 * color fijo porque Recharts lo pone como atributo del SVG, que no lee
 * variables de CSS.
 */
const CURSOR_GRAFICO = { fill: '#E8EFF6' };

/**
 * Margen de los dos gráficos: el mismo en los dos, para que sus ejes Y queden
 * alineados uno debajo del otro. En angosto deja lugar a la izquierda para el
 * primer nombre inclinado de "Cargas por estado" ("Disponible").
 *
 * @param {boolean} angosto
 * @returns {{ top: number, right: number, left: number, bottom: number }}
 */
const MARGEN_GRAFICO = (angosto) => ({ top: 8, right: 8, left: angosto ? 28 : 0, bottom: 8 });

/**
 * Capa de la cuadrícula: entre la franja del mouse (200) y las barras (300).
 * Por defecto va debajo de todo (-100) y la franja la tapaba; así las líneas
 * punteadas se siguen viendo sobre el celeste.
 */
const CAPA_CUADRICULA = 250;

/** Sin período: todos los tiempos. Es el que se ve al entrar y el que deja la ×. */
const TODOS_LOS_TIEMPOS = { fechaDesde: '', fechaHasta: '' };

/**
 * Da formato legible a un tiempo en horas: "6 h" si es menos de un día,
 * "3 d 8 h" si es un día o más. `null` (el backend no tiene datos
 * suficientes para calcularlo) se muestra como "Sin datos".
 *
 * @param {number|null} horas
 * @returns {string}
 */
function formatearDuracion(horas) {
  if (horas === null || horas === undefined || !Number.isFinite(horas)) return 'Sin datos';
  const totalHoras = Math.round(horas);
  if (totalHoras < 24) return `${totalHoras} h`;
  const dias = Math.floor(totalHoras / 24);
  const horasRestantes = totalHoras % 24;
  return horasRestantes > 0 ? `${dias} d ${horasRestantes} h` : `${dias} d`;
}

/**
 * Da formato a la tasa de cumplimiento (0 a 1) como porcentaje. `null` se
 * muestra como "Sin datos".
 *
 * @param {number|null} tasa
 * @returns {string}
 */
function formatearPorcentaje(tasa) {
  if (tasa === null || tasa === undefined || !Number.isFinite(tasa)) return 'Sin datos';
  return `${Math.round(tasa * 100)}%`;
}

/**
 * Panel de métricas y estadísticas del administrador (HU 13), en la ruta
 * /metricas.
 *
 * El acceso desde la barra superior ya se oculta para el camionero; si de
 * todas formas se entra por URL directa, el backend rechaza `GET /metricas`
 * con 403 y la pantalla lo muestra como el error de servidor genérico (no hay
 * una guarda de ruta propia: mismo criterio que el resto de las pantallas de
 * administrador del proyecto).
 *
 * Al entrar muestra "Todos los tiempos": desde el primer movimiento del
 * sistema hasta hoy. El período se elige en un solo calendario
 * (`SelectorPeriodo`, el mismo del filtro "Creada" de Cargas): con un acceso
 * rápido o marcando el primer y el último día y apretando "Aplicar" en el
 * panel. Con un período elegido, el campo se marca como filtro aplicado y su ×
 * vuelve a "Todos los tiempos". Cada cambio vuelve a pedir las métricas; como
 * el calendario marca los dos extremos en orden, no hay un período al revés
 * que validar. Al entrar a la pantalla siempre vuelve a "Todos los tiempos",
 * sin cachear lo de una visita anterior.
 *
 * @returns {JSX.Element}
 */
export default function Metricas() {
  // Desde dónde se llegó, para las migas y la flecha del celular (desde la
  // barra superior no hay a dónde volver).
  const destino = destinoVolver(useLocation(), null);
  // Pantalla angosta (celular): el gráfico de estados inclina los nombres.
  const [angosto, setAngosto] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 600px)');
    const alCambiar = (evento) => setAngosto(evento.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  // El período elegido: cada cambio dispara el pedido a GET /metricas.
  const [periodo, setPeriodo] = useState(TODOS_LOS_TIEMPOS);
  // Se incrementa para volver a pedir el mismo período (botón "Reintentar"),
  // mismo recurso que `versionHistorial` en DetalleCarga.jsx.
  const [intentoRecarga, setIntentoRecarga] = useState(0);

  const [metricas, setMetricas] = useState(null);
  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');
  // Sin conexión, la primera carga pasa a la pantalla de "Sin conexión"; si
  // falla al cambiar el período, se avisa acá y los filtros quedan como estaban.
  const yaCargoRef = useRef(false);
  const avisarSiFaltaConexion = useAvisoSinConexion();

  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPantalla('cargando');
    setMensajeError('');

    obtenerMetricas(periodo, { signal: controlador.signal })
      .then((datos) => {
        setMetricas(datos);
        setEstadoPantalla('ok');
        yaCargoRef.current = true;
      })
      .catch((error) => {
        // El pedido se canceló porque se disparó otro: no es un error real.
        if (error?.name === 'AbortError') return;
        if (!yaCargoRef.current && avisarSiFaltaConexion(error)) return;
        setMensajeError(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudieron cargar las métricas. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, [periodo, intentoRecarga, avisarSiFaltaConexion]);

  /** Vuelve a pedir el mismo período, tras un error de red o de servidor. */
  const reintentar = () => setIntentoRecarga((version) => version + 1);

  const datosPorEstado = ORDEN_ESTADOS.map((estado) => ({
    estado,
    etiqueta: etiquetaEstado(estado),
    cantidad: metricas?.cargas_por_estado?.[estado] ?? 0,
    color: COLOR_POR_SUFIJO[sufijoEstado(estado)],
  }));

  const datosPorSemana = (metricas?.entregadas_por_semana ?? []).map((fila) => ({
    ...fila,
    // "dd/mm", sin el año: alcanza para distinguir semanas en el eje y no
    // hace falta construir un Date (mismo criterio que formatearFecha).
    etiquetaCorta: formatearFecha(fila.semana_inicio).slice(0, 5),
  }));

  return (
    <>
      <BarraSuperior volver={destino} />

      <main className="us-contenido">
        <MigasDePan volver={destino} actual="Métricas" />

        <div className="us-encabezado">
          <h1 className="mt-titulo">
            <IconoGrafico width={26} height={26} />
            Panel de métricas
          </h1>
        </div>

        <div className="mt-filtros">
          <SelectorPeriodo
            id="mt-periodo"
            etiqueta="Período"
            className="mt-filtro"
            desde={periodo.fechaDesde}
            hasta={periodo.fechaHasta}
            alCambiar={({ desde, hasta }) => setPeriodo({ fechaDesde: desde, fechaHasta: hasta })}
            textoVacio="Todos los tiempos"
          />
        </div>

        {/* Las fechas que usó el backend: con todos los tiempos, desde el primer
            movimiento del sistema. */}
        <p className="mt-periodo">
          {metricas?.periodo
            ? `Del ${formatearFecha(metricas.periodo.fecha_desde)} al ${formatearFecha(metricas.periodo.fecha_hasta)}`
            : '\u00a0'}
        </p>

        {estadoPantalla === 'cargando' && <p className="mt-mensaje">Cargando métricas...</p>}

        {estadoPantalla === 'error' && (
          <div className="ds-aviso ds-aviso--error mt-aviso-error" role="alert">
            <span className="mt-aviso-error__texto">
              <IconoAlerta width={22} height={22} />
              <span>{mensajeError}</span>
            </span>
            <button
              type="button"
              className="ds-boton ds-boton--secundario"
              onClick={reintentar}
              onMouseDown={evitarFoco}
            >
              Reintentar
            </button>
          </div>
        )}

        {estadoPantalla === 'ok' && metricas && !metricas.hay_datos && (
          <p className="mt-mensaje">No hay datos en el período seleccionado.</p>
        )}

        {estadoPantalla === 'ok' && metricas && metricas.hay_datos && (
          <>
            <div className="mt-tarjetas">
              <article className="mt-tarjeta">
                <h2 className="mt-tarjeta__titulo">Cargas del período</h2>
                <p className="mt-tarjeta__valor">{metricas.total_cargas}</p>
              </article>

              <article className="mt-tarjeta">
                <h2 className="mt-tarjeta__titulo">Tiempo promedio de asignación</h2>
                <p className="mt-tarjeta__valor">
                  {formatearDuracion(metricas.tiempo_promedio_asignacion_horas)}
                </p>
              </article>

              <article className="mt-tarjeta">
                <h2 className="mt-tarjeta__titulo">Tiempo promedio de entrega</h2>
                <p className="mt-tarjeta__valor">
                  {formatearDuracion(metricas.tiempo_promedio_entrega_horas)}
                </p>
              </article>

              <article className="mt-tarjeta">
                <h2 className="mt-tarjeta__titulo">Tasa de cumplimiento</h2>
                <p className="mt-tarjeta__valor">{formatearPorcentaje(metricas.tasa_cumplimiento)}</p>
                <p className="mt-tarjeta__detalle">
                  {metricas.entregadas} de {metricas.entregadas + metricas.canceladas}
                </p>
              </article>

              <article className="mt-tarjeta">
                <h2 className="mt-tarjeta__titulo">Camioneros con viaje</h2>
                <p className="mt-tarjeta__valor">{metricas.camioneros_con_viaje}</p>
              </article>
            </div>

            <div className="mt-graficos">
              <section className="mt-grafico-card">
                <h2 className="mt-grafico-card__titulo">Cargas por estado</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={datosPorEstado} margin={MARGEN_GRAFICO(angosto)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D5DBE3" zIndex={CAPA_CUADRICULA} />
                    {/* El eje Y ocupa sólo lo que necesitan sus números (`width="auto"`):
                        con el ancho fijo de Recharts (60 px) quedaba un espacio en
                        blanco a la izquierda que en el celular achicaba el gráfico. */}
                    {/* En angosto, los nombres van inclinados: derechos no entraban
                        y el gráfico escondía la mitad (Disponible, Aceptada...). */}
                    <XAxis
                      dataKey="etiqueta"
                      interval={0}
                      tick={{ fontSize: 13, fill: '#4A5568' }}
                      {...(angosto ? { angle: -35, textAnchor: 'end', height: 70 } : {})}
                    />
                    <YAxis width="auto" allowDecimals={false} tick={{ fontSize: 13, fill: '#4A5568' }} />
                    <Tooltip cursor={CURSOR_GRAFICO} formatter={(valor) => [valor, 'Cargas']} />
                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                      {datosPorEstado.map((fila) => (
                        <Cell key={fila.estado} fill={fila.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>

              <section className="mt-grafico-card">
                <h2 className="mt-grafico-card__titulo">Entregas por semana</h2>
                {/* El backend manda todas las semanas del período, también las de
                    0 entregas: sin ninguna entrega se muestra el mensaje en lugar
                    de un gráfico con todas las barras en cero. */}
                {datosPorSemana.some((fila) => fila.cantidad > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={datosPorSemana} margin={MARGEN_GRAFICO(angosto)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D5DBE3" zIndex={CAPA_CUADRICULA} />
                      <XAxis dataKey="etiquetaCorta" tick={{ fontSize: 13, fill: '#4A5568' }} />
                      <YAxis width="auto" allowDecimals={false} tick={{ fontSize: 13, fill: '#4A5568' }} />
                      <Tooltip
                        cursor={CURSOR_GRAFICO}
                        labelFormatter={(_, payload) =>
                          payload?.[0]
                            ? `Semana del ${formatearFecha(payload[0].payload.semana_inicio)}`
                            : ''
                        }
                        formatter={(valor) => [valor, 'Entregas']}
                      />
                      <Bar dataKey="cantidad" fill="#1F4E79" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="mt-mensaje">No hubo entregas en el período seleccionado.</p>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}
