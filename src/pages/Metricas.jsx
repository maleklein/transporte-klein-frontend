import { useEffect, useState } from 'react';
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
import BarraSuperior from '../components/BarraSuperior';
import { IconoAlerta, IconoGrafico } from '../components/Iconos';
import { obtenerMetricas } from '../api/metricas';
import { ErrorDeApi } from '../api/usuarios';
import { evitarFoco } from '../utils/formulario';
import { formatearFecha } from '../utils/carga';
import { etiquetaEstado, sufijoEstado } from '../utils/estadosCarga';
import './Metricas.css';

/** Cuántos días para atrás, contando hoy, arma el rango por defecto. */
const DIAS_RANGO_POR_DEFECTO = 30;

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
 * Arma una fecha AAAA-MM-DD a partir de los getters locales de `Date` (no de
 * `toISOString`, que convierte a UTC y podría correr el día según la zona
 * horaria del navegador).
 *
 * @param {Date} fecha - fecha de referencia, ya en hora local.
 * @returns {string} la fecha en formato AAAA-MM-DD.
 */
function aFechaLocal(fecha) {
  const dosDigitos = (numero) => String(numero).padStart(2, '0');
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/**
 * Calcula el período por defecto: los últimos 30 días, incluido hoy, en hora
 * local del navegador.
 *
 * @returns {{fechaDesde: string, fechaHasta: string}}
 */
function calcularPeriodoPorDefecto() {
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(hoy.getDate() - (DIAS_RANGO_POR_DEFECTO - 1));
  return { fechaDesde: aFechaLocal(desde), fechaHasta: aFechaLocal(hoy) };
}

/**
 * Valida el rango de fechas elegido antes de consultar al backend.
 *
 * @param {string} fechaDesde
 * @param {string} fechaHasta
 * @returns {string} el mensaje de error a mostrar, o cadena vacía si el rango es válido.
 */
function validarPeriodo(fechaDesde, fechaHasta) {
  if (!fechaDesde || !fechaHasta) return 'Completá las dos fechas.';
  // Las fechas vienen en formato AAAA-MM-DD: comparar como texto alcanza.
  if (fechaDesde > fechaHasta) {
    return 'La fecha "Desde" no puede ser posterior a la fecha "Hasta".';
  }
  return '';
}

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
 * Por defecto consulta los últimos 30 días en hora local del navegador. El
 * selector de rango no vuelve a consultar en cada tecla: hay que completar
 * las dos fechas y apretar "Aplicar"; antes de pedir valida que estén
 * completas y que "Desde" no sea posterior a "Hasta". Al entrar a la
 * pantalla siempre vuelve a pedir el período por defecto, sin cachear lo de
 * una visita anterior.
 *
 * @returns {JSX.Element}
 */
export default function Metricas() {
  const [periodoInicial] = useState(calcularPeriodoPorDefecto);

  // Lo que el usuario está escribiendo en los campos de fecha.
  const [desdeTexto, setDesdeTexto] = useState(periodoInicial.fechaDesde);
  const [hastaTexto, setHastaTexto] = useState(periodoInicial.fechaHasta);
  const [errorValidacion, setErrorValidacion] = useState('');

  // El período efectivamente aplicado: el que dispara el pedido a GET /metricas.
  const [periodo, setPeriodo] = useState(periodoInicial);
  // Se incrementa para volver a pedir el mismo período (botón "Reintentar"),
  // mismo recurso que `versionHistorial` en DetalleCarga.jsx.
  const [intentoRecarga, setIntentoRecarga] = useState(0);

  const [metricas, setMetricas] = useState(null);
  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPantalla('cargando');
    setMensajeError('');

    obtenerMetricas(periodo, { signal: controlador.signal })
      .then((datos) => {
        setMetricas(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        // El pedido se canceló porque se disparó otro: no es un error real.
        if (error?.name === 'AbortError') return;
        setMensajeError(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudieron cargar las métricas. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, [periodo, intentoRecarga]);

  /**
   * Valida el rango elegido y, si es válido, lo aplica (lo que dispara el
   * pedido a `GET /metricas`). Si no, deja el mensaje inline y no consulta.
   *
   * @returns {void}
   */
  const aplicar = () => {
    const mensaje = validarPeriodo(desdeTexto, hastaTexto);
    setErrorValidacion(mensaje);
    if (mensaje) return;
    setPeriodo({ fechaDesde: desdeTexto, fechaHasta: hastaTexto });
  };

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
      <BarraSuperior />

      <main className="us-contenido">
        <div className="us-encabezado">
          <h1 className="mt-titulo">
            <IconoGrafico width={26} height={26} />
            Panel de métricas
          </h1>
        </div>

        <div className="mt-filtros">
          <div className="mt-filtro">
            <label className="ds-campo__label" htmlFor="mt-desde">
              Desde
            </label>
            <input
              id="mt-desde"
              type="date"
              className="ds-campo__input"
              value={desdeTexto}
              onChange={(evento) => setDesdeTexto(evento.target.value)}
            />
          </div>

          <div className="mt-filtro">
            <label className="ds-campo__label" htmlFor="mt-hasta">
              Hasta
            </label>
            <input
              id="mt-hasta"
              type="date"
              className="ds-campo__input"
              value={hastaTexto}
              onChange={(evento) => setHastaTexto(evento.target.value)}
            />
          </div>

          <button
            type="button"
            className="ds-boton ds-boton--primario mt-aplicar"
            onClick={aplicar}
            onMouseDown={evitarFoco}
          >
            Aplicar
          </button>
        </div>

        {errorValidacion && (
          <p className="mt-error-validacion" role="alert">
            <IconoAlerta width={18} height={18} />
            {errorValidacion}
          </p>
        )}

        <p className="mt-periodo">
          Del {formatearFecha(periodo.fechaDesde)} al {formatearFecha(periodo.fechaHasta)}
        </p>

        {estadoPantalla === 'cargando' && <p className="mt-mensaje">Cargando métricas...</p>}

        {estadoPantalla === 'error' && (
          <div className="mt-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            <span className="mt-aviso-error__texto">{mensajeError}</span>
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
                  <BarChart data={datosPorEstado} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D5DBE3" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 13, fill: '#4A5568' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: '#4A5568' }} />
                    <Tooltip formatter={(valor) => [valor, 'Cargas']} />
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
                {datosPorSemana.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={datosPorSemana} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D5DBE3" />
                      <XAxis dataKey="etiquetaCorta" tick={{ fontSize: 13, fill: '#4A5568' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: '#4A5568' }} />
                      <Tooltip
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
