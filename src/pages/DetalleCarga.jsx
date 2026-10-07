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
import { asignarCargaACamionero } from '../api/asignaciones';
import { ErrorDeApi } from '../api/usuarios';
import { formatearFecha, formatearPeso } from '../utils/carga';
import './DetalleCarga.css';

/**
 * Detalle de una carga (HU 2.5, HU 4 y HU 6), en la ruta /cargas/:id.
 *
 * Muestra la información de la carga. Si el usuario es camionero, muestra el flujo de postulación.
 * Si el usuario es administrador, muestra la lista de postulantes y permite la asignación (HU 6).
 */
export default function DetalleCarga() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Estados generales
  const [carga, setCarga] = useState(null);
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');
  
  // Simulamos obtener el rol del usuario logueado (Ajustar según cómo manejen la sesión en el proyecto)
  const [rolUsuario, setRolUsuario] = useState(localStorage.getItem('rol') || 'camionero');
  //const [rolUsuario, setRolUsuario] = useState('administrador');

  // Estados para Camionero (HU 4)
  const [modalPostulacionAbierto, setModalPostulacionAbierto] = useState(false);
  const [procesandoPostulacion, setProcesandoPostulacion] = useState(false);
  const [yaPostulado, setYaPostulado] = useState(false);

  // Estados para Administrador (HU 6)
  const [modalAsignacionAbierto, setModalAsignacionAbierto] = useState(false);
  const [procesandoAsignacion, setProcesandoAsignacion] = useState(false);
  const [camioneroSeleccionado, setCamioneroSeleccionado] = useState(null);
  
  const [mensajeModal, setMensajeModal] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPantalla('cargando');
    setMensajeError('');

    obtenerCarga(id, { signal: controlador.signal })
      .then(async (datosCarga) => {
        setCarga(datosCarga);
        
        // Verificamos historial solo si es camionero
        if (rolUsuario === 'camionero') {
          try {
            const misPostulaciones = await obtenerMisPostulaciones({ signal: controlador.signal });
            const estaPostulado = misPostulaciones.some(p => String(p.id_carga) === String(id));
            setYaPostulado(estaPostulado);
          } catch (e) {
            setYaPostulado(false);
          }
        }
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        if (error instanceof ErrorDeApi && error.estado === 404) {
          setEstadoPantalla('no-encontrada');
          return;
        }
        setMensajeError(error instanceof ErrorDeApi ? error.message : 'Error al cargar los datos.');
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, [id, rolUsuario]);

  // Manejador: Camionero se postula
  const handleConfirmarPostulacion = async () => {
    setProcesandoPostulacion(true);
    setMensajeModal({ texto: '', tipo: '' });

    try {
      await postularACarga(id);
      setMensajeModal({ texto: '¡Te postulaste con éxito a esta carga!', tipo: 'exito' });
      setYaPostulado(true); 
      setTimeout(() => setModalPostulacionAbierto(false), 2000);
    } catch (error) {
      setMensajeModal({ texto: error instanceof ErrorDeApi ? error.message : 'Error al postularse', tipo: 'error' });
    } finally {
      setProcesandoPostulacion(false);
    }
  };

  // Manejador: Administrador asigna la carga (HU 6)
  const handleConfirmarAsignacion = async () => {
    if (!camioneroSeleccionado) {
      setMensajeModal({ texto: 'Por favor, seleccioná un camionero primero.', tipo: 'error' });
      return;
    }

    setProcesandoAsignacion(true);
    setMensajeModal({ texto: '', tipo: '' });

    try {
      await asignarCargaACamionero(id, camioneroSeleccionado);
      setMensajeModal({ texto: '¡Carga asignada exitosamente!', tipo: 'exito' });
      
      // Actualizamos el estado visual de la carga para que desaparezcan los botones
      setCarga(prev => ({ ...prev, estado_actual: 'aceptada', id_camionero_asignado: camioneroSeleccionado }));
      
      setTimeout(() => setModalAsignacionAbierto(false), 2000);
    } catch (error) {
      setMensajeModal({ texto: error instanceof ErrorDeApi ? error.message : 'Error al asignar', tipo: 'error' });
    } finally {
      setProcesandoAsignacion(false);
    }
  };

  const descripcion = carga?.observaciones?.trim() ? carga.observaciones : 'Sin descripción.';

  // Mock de postulantes para armar la interfaz visual requerida en el SRS. 
  // En la vida real, esto vendría dentro de los datos de `carga`.
  const postulantesMock = [
    { id: 3, nombre: 'Roberto Maidana', vehiculo: 'Scania R450 + Carretón', patente: 'AD 482 KL', calificacion: '4.8' }
  ];

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
        {estadoPantalla === 'no-encontrada' && <div className="dc-aviso-error" role="alert">Carga no encontrada.</div>}
        {estadoPantalla === 'error' && <div className="dc-aviso-error" role="alert">{mensajeError}</div>}

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
                
                {/* Botón exclusivo para CAMIONEROS (HU 4) */}
                {rolUsuario === 'camionero' && carga.estado_actual === 'disponible' && (
                  <button 
                    className="dc-btn-postular" 
                    onClick={() => setModalPostulacionAbierto(true)}
                    disabled={yaPostulado}
                    style={{ 
                      backgroundColor: yaPostulado ? '#a0aec0' : '#28a745', 
                      color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', 
                      cursor: yaPostulado ? 'not-allowed' : 'pointer', fontWeight: 'bold' 
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
                  <dt><IconoCalendario width={15} height={15} /> Fecha</dt>
                  <dd>{formatearFecha(carga.fecha)}</dd>
                </div>
                <div className="dc-dato">
                  <dt><IconoPeso width={15} height={15} /> Peso</dt>
                  <dd>{formatearPeso(carga.peso_kg)}</dd>
                </div>
              </dl>
              <div className="dc-descripcion">
                <h3 className="dc-descripcion__titulo"><IconoDocumento width={16} height={16} /> Descripción</h3>
                <p className="dc-descripcion__texto">{descripcion}</p>
              </div>
            </section>

            {/* SECCIÓN EXCLUSIVA ADMINISTRADOR (HU 6) */}
            {rolUsuario === 'administrador' && carga.estado_actual === 'disponible' && (
              <section className="dc-card" style={{ marginTop: '20px' }}>
                <h2 className="dc-card__titulo">Camioneros postulados</h2>
                <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{postulantesMock[0].nombre}</strong>
                    <span style={{ color: '#f59e0b' }}>⭐ {postulantesMock[0].calificacion}</span>
                  </div>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#64748b' }}>
                    <IconoCamion width={14} height={14} /> {postulantesMock[0].vehiculo} <br/>
                    Patente: {postulantesMock[0].patente}
                  </p>
                </div>
                
                <button 
                  onClick={() => setModalAsignacionAbierto(true)}
                  style={{ width: '100%', padding: '12px', backgroundColor: '#1e3a8a', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Asignar Camionero
                </button>
              </section>
            )}

            <HistorialCarga idCarga={carga.id_carga} />

            {/* Modal Postulación Camionero (HU 4) */}
            {modalPostulacionAbierto && (
              <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                <div className="modal-content" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '400px', width: '90%' }}>
                  <h3>Confirmar Postulación</h3>
                  <p>¿Postularte para transportar esta carga de <strong>{carga.origen}</strong> a <strong>{carga.destino}</strong>?</p>
                  {mensajeModal.texto && <p style={{ color: mensajeModal.tipo === 'exito' ? 'green' : 'red', fontWeight: 'bold' }}>{mensajeModal.texto}</p>}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <button onClick={() => setModalPostulacionAbierto(false)} disabled={procesandoPostulacion} style={{ padding: '8px 16px', cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={handleConfirmarPostulacion} disabled={procesandoPostulacion} style={{ backgroundColor: '#28a745', color: 'white', padding: '8px 16px', border: 'none', cursor: 'pointer' }}>Sí, postularme</button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Asignación Administrador (HU 6) */}
            {modalAsignacionAbierto && (
              <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                <div className="modal-content" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', maxWidth: '450px', width: '90%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Asignar Camionero</h3>
                    <button onClick={() => setModalAsignacionAbierto(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
                  </div>
                  
                  <p style={{ color: '#475569', marginBottom: '20px' }}>Seleccione un camionero de la lista de postulantes para asignar esta carga.</p>

                  <div 
                    onClick={() => setCamioneroSeleccionado(postulantesMock[0].id)}
                    style={{ padding: '15px', border: camioneroSeleccionado === postulantesMock[0].id ? '2px solid #28a745' : '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '15px' }}
                  >
                    <input type="radio" checked={camioneroSeleccionado === postulantesMock[0].id} readOnly style={{ marginTop: '5px' }} />
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{postulantesMock[0].nombre}</strong>
                        <span style={{ color: '#f59e0b' }}>⭐ {postulantesMock[0].calificacion}</span>
                      </div>
                      <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        <IconoCamion width={12} height={12} /> {postulantesMock[0].vehiculo} | Patente: {postulantesMock[0].patente}
                      </p>
                    </div>
                  </div>

                  {mensajeModal.texto && <p style={{ color: mensajeModal.tipo === 'exito' ? 'green' : 'red', fontWeight: 'bold', marginTop: '15px' }}>{mensajeModal.texto}</p>}

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '25px' }}>
                    <button onClick={() => setModalAsignacionAbierto(false)} disabled={procesandoAsignacion} style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                      X Cancelar
                    </button>
                    <button onClick={handleConfirmarAsignacion} disabled={procesandoAsignacion} style={{ backgroundColor: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                      ✓ Confirmar Asignación
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