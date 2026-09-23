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
import { obtenerCarga, postularACarga, obtenerMisPostulaciones } from '../api/cargas'; 
import { ErrorDeApi } from '../api/usuarios';
import { formatearFecha, formatearPeso } from '../utils/carga';
import './DetalleCarga.css';

/**
 * Detalle de una carga (HU 2.5 y HU 4), en la ruta /cargas/:id.
 *
 * Muestra la información completa de una carga específica (ruta, fecha, peso, etc.) 
 * y su historial de estados (HU 8). Además, implementa la lógica de postulación 
 * para los camioneros (HU 4).
 * 
 * Mejoras de UX implementadas:
 * - Se verifica al cargar la página si el usuario actual ya se postuló a este viaje.
 * - Si ya está postulado, el botón principal cambia de estado (gris) y se deshabilita 
 *   para evitar llamadas innecesarias al backend y confusiones en el usuario.
 *
 * @returns {JSX.Element} El componente renderizado del detalle de la carga.
 */
export default function DetalleCarga() {
  const navigate = useNavigate();
  const { id } = useParams();

  // ============================================================================
  // ESTADOS DEL COMPONENTE
  // ============================================================================
  
  /** @type {[object|null, Function]} Datos de la carga obtenidos del backend */
  const [carga, setCarga] = useState(null);
  
  /** @type {['cargando'|'ok'|'no-encontrada'|'error', Function]} Controla qué pantalla mostrar */
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  
  /** @type {[string, Function]} Mensaje de error general de la página */
  const [mensajeError, setMensajeError] = useState('');

  /** @type {[boolean, Function]} Controla la visibilidad de la ventana modal de confirmación */
  const [modalAbierto, setModalAbierto] = useState(false);
  
  /** @type {[boolean, Function]} Bloquea los botones mientras se hace la petición POST */
  const [procesandoPostulacion, setProcesandoPostulacion] = useState(false);
  
  /** @type {[{texto: string, tipo: string}, Function]} Mensaje de éxito o error dentro del modal */
  const [mensajeModal, setMensajeModal] = useState({ texto: '', tipo: '' });
  
  /** @type {[boolean, Function]} Bandera que indica si el usuario logueado ya se postuló a esta carga */
  const [yaPostulado, setYaPostulado] = useState(false);

  // ============================================================================
  // EFECTOS (CARGA DE DATOS)
  // ============================================================================

  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPantalla('cargando');
    setMensajeError('');

    // 1. Obtenemos los datos generales de la carga
    obtenerCarga(id, { signal: controlador.signal })
      .then(async (datosCarga) => {
        setCarga(datosCarga);
        
        // 2. Verificamos si el usuario ya está postulado a esta carga (UX)
        try {
          // Pedimos el historial del usuario actual
          const misPostulaciones = await obtenerMisPostulaciones({ signal: controlador.signal });
          // Buscamos si el ID de la carga actual existe en sus postulaciones
          const estaPostulado = misPostulaciones.some(p => String(p.id_carga) === String(id));
          setYaPostulado(estaPostulado);
        } catch (e) {
          // Si ocurre un error (ej. el usuario es Administrador y no tiene permiso a esta ruta),
          // capturamos el error silenciosamente y asumimos que no está postulado.
          setYaPostulado(false);
        }

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

  // ============================================================================
  // MANEJADORES DE EVENTOS
  // ============================================================================

  /**
   * Ejecuta la postulación del camionero a la carga actual.
   * Se dispara al presionar "Sí, postularme" dentro del modal de confirmación.
   */
  const handleConfirmarPostulacion = async () => {
    setProcesandoPostulacion(true);
    setMensajeModal({ texto: '', tipo: '' });

    try {
      // Llamada al endpoint POST /cargas/:id/postulaciones
      await postularACarga(id);
      
      setMensajeModal({ texto: '¡Te postulaste con éxito a esta carga!', tipo: 'exito' });
      
      // Actualizamos el estado local para que el botón principal cambie a gris 
      // y se deshabilite sin necesidad de recargar toda la página web.
      setYaPostulado(true); 
      
      // Cerramos el modal automáticamente tras 2 segundos de mostrar el éxito
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

  // Preparamos la descripción para evitar errores si viene vacía
  const descripcion =
    carga && typeof carga.observaciones === 'string' && carga.observaciones.trim()
      ? carga.observaciones
      : 'Sin descripción.';

  // ============================================================================
  // RENDERIZADO DEL COMPONENTE
  // ============================================================================

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

        {/* Pantallas de estado: Cargando, No Encontrada, Error */}
        {estadoPantalla === 'cargando' && <p className="dc-mensaje">Cargando carga...</p>}

        {estadoPantalla === 'no-encontrada' && (
          <div className="dc-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            No encontramos la carga #{id}. Puede que se haya eliminado o que la dirección sea incorrecta.
          </div>
        )}

        {estadoPantalla === 'error' && (
          <div className="dc-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            {mensajeError}
          </div>
        )}

        {/* Pantalla principal de Detalle de Carga */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="dc-card__titulo">Información de la carga</h2>
                
                {/* Botón de Postulación: Solo se renderiza si la carga está disponible.
                    Si el camionero ya se postuló, se desactiva y cambia a color gris. */}
                {carga.estado_actual === 'disponible' && (
                  <button 
                    className="dc-btn-postular" 
                    onClick={() => setModalAbierto(true)}
                    disabled={yaPostulado}
                    style={{ 
                      backgroundColor: yaPostulado ? '#a0aec0' : '#28a745', 
                      color: 'white', 
                      padding: '10px 20px', 
                      border: 'none', 
                      borderRadius: '5px', 
                      cursor: yaPostulado ? 'not-allowed' : 'pointer', 
                      fontWeight: 'bold' 
                    }}
                  >
                    {yaPostulado ? 'Postulado' : 'Postularse'}
                  </button>
                )}
              </div>

              <p className="dc-ruta">
                <IconoUbicacion width={18} height={18} />
                <span>{carga.origen}</span>
                <span className="dc-ruta__flecha" aria-hidden="true">→</span>
                <span>{carga.destino}</span>
              </p>

              <dl className="dc-datos">
                <div className="dc-dato">
                  <dt><IconoCalendario width={15} height={15} /> Fecha de retiro</dt>
                  <dd>{formatearFecha(carga.fecha)}</dd>
                </div>
                <div className="dc-dato">
                  <dt><IconoPeso width={15} height={15} /> Peso</dt>
                  <dd>{formatearPeso(carga.peso_kg)}</dd>
                </div>
                <div className="dc-dato">
                  <dt><IconoEtiqueta width={15} height={15} /> Tipo</dt>
                  <dd>{carga.tipo_carga}</dd>
                </div>
              </dl>

              <div className="dc-descripcion">
                <h3 className="dc-descripcion__titulo">
                  <IconoDocumento width={16} height={16} /> Descripción
                </h3>
                <p className="dc-descripcion__texto">{descripcion}</p>
              </div>
            </section>

            <HistorialCarga idCarga={carga.id_carga} />

            {/* Ventana Modal de Confirmación de Postulación */}
            {modalAbierto && (
              <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                <div className="modal-content" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '400px', width: '90%' }}>
                  <h3>Confirmar Postulación</h3>
                  <p>¿Estás seguro que deseás postularte para transportar esta carga desde <strong>{carga.origen}</strong> hasta <strong>{carga.destino}</strong>?</p>

                  {/* Mensaje de retroalimentación (éxito/error) del intento de postulación */}
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