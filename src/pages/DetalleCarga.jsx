import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  IconoCaja,
  IconoCalendario,
  IconoCamion,
  IconoDocumento,
  IconoEtiqueta,
  IconoFlechaAtras,
  IconoPeso,
  IconoUbicacion,
} from '../components/Iconos';
import EstadoCarga from '../components/EstadoCarga';
import { formatearFecha, formatearPeso } from '../utils/carga';
import './DetalleCarga.css';

/**
 * Detalle de una carga (HU 2.5), en la ruta /cargas/detalle.
 *
 * Replica el bloque "Información de la carga" del mockup: título con el badge de
 * estado, la ruta origen → destino, fecha de retiro, peso, tipo y la descripción
 * (`observaciones`). Los bloques de camioneros / asignación / historial son de
 * otras HU (Sprint 2) y no van acá.
 *
 * Los datos llegan por router state desde el listado — `GET /cargas` no devuelve
 * `id_carga`, así que no se puede recargar por URL: si se entra directo o se
 * refresca, se vuelve al listado.
 *
 * @returns {JSX.Element}
 */
export default function DetalleCarga() {
  const navigate = useNavigate();
  const location = useLocation();
  const carga = location.state?.carga;

  if (!carga) return <Navigate to="/cargas" replace />;

  const descripcion =
    typeof carga.observaciones === 'string' && carga.observaciones.trim()
      ? carga.observaciones
      : 'Sin descripción.';

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      <main className="dc-contenido">
        <button type="button" className="dc-volver" onClick={() => navigate('/cargas')}>
          <IconoFlechaAtras width={20} height={20} />
          Volver a Cargas
        </button>

        <header className="dc-encabezado">
          <h1 className="dc-titulo">
            <IconoCaja width={26} height={26} />
            {carga.tipo_carga}
          </h1>
          <EstadoCarga estado={carga.estado_actual} />
        </header>

        <section className="dc-card">
          <h2 className="dc-card__titulo">Información de la carga</h2>

          <p className="dc-ruta">
            <IconoUbicacion width={18} height={18} />
            <span>{carga.origen}</span>
            <span className="dc-ruta__flecha" aria-hidden="true">
              →
            </span>
            <span>{carga.destino}</span>
          </p>

          <dl className="dc-datos">
            <div className="dc-dato">
              <dt>
                <IconoCalendario width={15} height={15} />
                Fecha de retiro
              </dt>
              <dd>{formatearFecha(carga.fecha)}</dd>
            </div>
            <div className="dc-dato">
              <dt>
                <IconoPeso width={15} height={15} />
                Peso
              </dt>
              <dd>{formatearPeso(carga.peso_kg)}</dd>
            </div>
            <div className="dc-dato">
              <dt>
                <IconoEtiqueta width={15} height={15} />
                Tipo
              </dt>
              <dd>{carga.tipo_carga}</dd>
            </div>
          </dl>

          <div className="dc-descripcion">
            <h3 className="dc-descripcion__titulo">
              <IconoDocumento width={16} height={16} />
              Descripción
            </h3>
            <p className="dc-descripcion__texto">{descripcion}</p>
          </div>
        </section>
      </main>
    </>
  );
}
