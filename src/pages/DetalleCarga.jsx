import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconoAlerta,
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
import HistorialCarga from '../components/HistorialCarga';
// NUEVO: Agregamos postularACarga junto a obtenerCarga
import { obtenerCarga, postularACarga } from '../api/cargas'; 
import { ErrorDeApi } from '../api/usuarios';
import { formatearFecha, formatearPeso } from '../utils/carga';
import './DetalleCarga.css';

/**
 * Detalle de una carga (HU 2.5), en la ruta /cargas/:id.
 *
 * Replica el bloque "Información de la carga" del mockup: título con el badge de
 * estado, la ruta origen → destino, fecha de retiro, peso, tipo y la descripción
 * (`observaciones`). Debajo va el historial de estados (HU 8, `HistorialCarga`).
 * Los bloques de camioneros / asignación son de otras HU (Sprint 2) y no van acá.
 *
 * El `id_carga` se lee de la URL y la carga se pide con `GET /cargas/:id` al
 * entrar. Funciona igual llegando desde el listado (click en una tarjeta) o
 * escribiendo la dirección a mano / refrescando. Mientras espera muestra
 * "Cargando…"; si la carga no existe (404) muestra un mensaje claro.
 *
 * @returns {JSX.Element}
 */
export default function DetalleCarga() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [carga, setCarga] = useState(null);
  // 'cargando' | 'ok' | 'no-encontrada' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  // Estados para manejar la ventana modal y la carga de la postulación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [procesandoPostulacion, setProcesandoPostulacion] = useState(false);
  const [mensajeModal, setMensajeModal] = useState({ texto: '', tipo: '' }); // tipo: 'exito' | 'error'

  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPantalla('cargando');
    setMensajeError('');

    obtenerCarga(id, { signal: controlador.signal })
      .then((datos) => {
        setCarga(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        if (error instanceof ErrorDeApi && error.estado === 404) {
          setEstadoPantalla('no-encontrada');
          return;
        }
        setMensajeError(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudo cargar el detalle de la carga. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, [id]);

  // Función que se ejecuta al confirmar en el modal
  const handleConfirmarPostulacion = async () => {
    setProcesandoPostulacion(true);
    setMensajeModal({ texto: '', tipo: '' });

    try {
      await postularACarga(id);
      setMensajeModal({ texto: '¡Te postulaste con éxito a esta carga!', tipo: 'exito' });
      // Cerramos el modal automáticamente después de 2 segundos
      setTimeout(() => {
        setModalAbierto(false);
      }, 2000);
    } catch (error) {
      setMensajeModal({
        texto: error instanceof ErrorDeApi ? error.message : 'Error al postularse',
        tipo: 'error'
      });
    } finally {
      setProcesandoPostulacion(false);
    }
  };

  const descripcion =
    carga && typeof carga.observaciones === 'string' && carga.observaciones.trim()
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

        {estadoPantalla === 'cargando' && <p className="dc-mensaje">Cargando carga...</p>}

        {estadoPantalla === 'no-encontrada' && (
          <div className="dc-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            No encontramos la carga #{id}. Puede que se haya eliminado o que la dirección
            sea incorrecta.
          </div>
        )}

        {estadoPantalla === 'error' && (
          <div className="dc-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            {mensajeError}
          </div>
        )}

        {estadoPantalla === 'ok' && carga && (
          <>
            <header className="dc-encabezado">
              <h1 className="dc-titulo">
                <IconoCaja width={26} height={26} />
                {carga.tipo_carga}
              </h1>
              <EstadoCarga estado={carga.estado_actual} />
            </header>

            <section className="dc-card">
              {/* NUEVO: Contenedor flex para alinear el título y el botón juntos */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="dc-card__titulo">Información de la carga</h2>
                
                {carga.estado_actual === 'disponible' && (
                  <button 
                    className="dc-btn-postular" 
                    onClick={() => setModalAbierto(true)}
                    style={{ backgroundColor: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Postularse
                  </button>
                )}
              </div>

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

            <HistorialCarga idCarga={carga.id_carga} />

            {/* Ventana Modal de Confirmación*/}
            {modalAbierto && (
              <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                <div className="modal-content" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '400px', width: '90%' }}>
                  <h3>Confirmar Postulación</h3>
                  <p>¿Estás seguro que deseás postularte para transportar esta carga desde <strong>{carga.origen}</strong> hasta <strong>{carga.destino}</strong>?</p>

                  {mensajeModal.texto && (
                    <p style={{ color: mensajeModal.tipo === 'exito' ? 'green' : 'red', fontWeight: 'bold' }}>
                      {mensajeModal.texto}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <button
                      onClick={() => setModalAbierto(false)}
                      disabled={procesandoPostulacion}
                      style={{ padding: '8px 16px', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmarPostulacion}
                      disabled={procesandoPostulacion}
                      style={{ backgroundColor: '#28a745', color: 'white', padding: '8px 16px', border: 'none', cursor: 'pointer' }}
                    >
                      {procesandoPostulacion ? 'Procesando...' : 'Sí, postularme'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}