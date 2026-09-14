import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IconoCamion, 
  IconoUbicacion, 
  IconoCalendario, 
  IconoEtiqueta, 
  IconoFlechaAtras 
} from '../components/Iconos';
import { obtenerMisPostulaciones } from '../api/cargas';
import { formatearFecha } from '../utils/carga';
// Importamos tu nuevo archivo de estilos
import './Postulaciones.css'; 

export default function Postulaciones() {
  const navigate = useNavigate();
  const [postulaciones, setPostulaciones] = useState([]);
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');

  useEffect(() => {
    const controlador = new AbortController();
    
    obtenerMisPostulaciones({ signal: controlador.signal })
      .then((datos) => {
        setPostulaciones(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, []);

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      {/* Usamos las clases que definiste en el CSS */}
      <main className="pos-contenido">
        <button type="button" className="dc-volver" onClick={() => navigate('/cargas')}>
          <IconoFlechaAtras width={20} height={20} />
          Ir a buscar cargas
        </button>

        <h1 className="pos-titulo">Mis Postulaciones</h1>

        {estadoPantalla === 'cargando' && <p className="pos-mensaje-cargando">Cargando tu historial de postulaciones...</p>}
        
        {estadoPantalla === 'error' && (
          <p className="pos-aviso-error">Hubo un error al cargar tus postulaciones.</p>
        )}

        {estadoPantalla === 'ok' && postulaciones.length === 0 && (
          <p className="pos-mensaje-vacio">Aún no te has postulado a ninguna carga.</p>
        )}

        {estadoPantalla === 'ok' && postulaciones.length > 0 && (
          <div className="pos-lista">
            {postulaciones.map((p) => (
              <div key={p.id_postulacion} className="pos-card">
                
                <div className="pos-card-header">
                  <strong className="pos-card-tipo">
                    <IconoEtiqueta width={20} height={20} /> {p.tipo_carga}
                  </strong>
                  <span className={`pos-badge pos-badge--${p.estado.toLowerCase()}`}>
                    {p.estado}
                  </span>
                </div>

                <div className="pos-card-body">
                  <p className="pos-card-dato">
                    <IconoUbicacion width={18} height={18} /> 
                    <strong>{p.origen}</strong> <span aria-hidden="true">→</span> <strong>{p.destino}</strong>
                  </p>
                  <p className="pos-card-dato">
                    <IconoCalendario width={18} height={18} />
                    Retiro programado: {formatearFecha(p.fecha_retiro)}
                  </p>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}