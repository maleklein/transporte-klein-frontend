import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  IconoCalendario,
  IconoCamion,
  IconoCorreo,
  IconoDocumento,
  IconoEtiqueta,
  IconoFlechaAtras,
  IconoPeso,
  IconoUbicacion,
  IconoUsuario,
} from '../components/Iconos';
import { formatearFecha } from '../utils/carga';
import './DetalleCarga.css';
import './DetalleUsuario.css';

/**
 * Ficha de solo lectura de un usuario (HU 1.3), en la ruta /usuarios/detalle.
 *
 * Muestra todos los datos del usuario seleccionado en el listado: datos
 * personales, rol, estado y, si es camionero, sus datos de vehículo. No tiene
 * ningún campo editable — para modificar los datos hay que ir a "Editar"
 * desde el listado (HU 1.2).
 *
 * Los datos llegan por router state desde el listado — `GET /usuarios` no
 * expone un endpoint individual por id, así que no se puede recargar por URL:
 * si se entra directo o se refresca, se vuelve al listado.
 *
 * @returns {JSX.Element}
 */
export default function DetalleUsuario() {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = location.state?.usuario;

  if (!usuario) return <Navigate to="/usuarios" replace />;

  const esCamionero = usuario.rol === 'camionero';

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      <main className="dc-contenido">
        <button type="button" className="dc-volver" onClick={() => navigate('/usuarios')}>
          <IconoFlechaAtras width={20} height={20} />
          Volver a Usuarios
        </button>

        <header className="dc-encabezado">
          <h1 className="dc-titulo">
            <IconoUsuario width={26} height={26} />
            {usuario.nombre} {usuario.apellido}
          </h1>
          <div className="du-badges">
            <span
              className={`ds-etiqueta-rol${esCamionero ? ' ds-etiqueta-rol--camionero' : ''}`}
            >
              {esCamionero ? 'Camionero' : 'Administrador'}
            </span>
            <span
              className={`ds-etiqueta-estado${
                usuario.estado === 'inactivo' ? ' ds-etiqueta-estado--inactivo' : ''
              }`}
            >
              {usuario.estado === 'inactivo' ? 'Inactivo' : 'Activo'}
            </span>
          </div>
        </header>

        <section className="dc-card">
          <h2 className="dc-card__titulo">Datos personales</h2>

          <dl className="dc-datos">
            <div className="dc-dato">
              <dt>
                <IconoDocumento width={15} height={15} />
                DNI
              </dt>
              <dd>{usuario.dni}</dd>
            </div>
            <div className="dc-dato">
              <dt>
                <IconoCorreo width={15} height={15} />
                Email
              </dt>
              <dd>{usuario.email}</dd>
            </div>
            <div className="dc-dato">
              <dt>
                <IconoCalendario width={15} height={15} />
                Alta
              </dt>
              <dd>{usuario.creado_en ? formatearFecha(usuario.creado_en) : '—'}</dd>
            </div>
            <div className="dc-dato">
              <dt>
                <IconoCalendario width={15} height={15} />
                Última actualización
              </dt>
              <dd>{usuario.actualizado_en ? formatearFecha(usuario.actualizado_en) : '—'}</dd>
            </div>
          </dl>
        </section>

        {esCamionero && (
          <section className="dc-card du-card-vehiculo">
            <h2 className="dc-card__titulo">
              <IconoCamion width={20} height={20} />
              Datos del vehículo
            </h2>

            <dl className="dc-datos">
              <div className="dc-dato">
                <dt>
                  <IconoUbicacion width={15} height={15} />
                  Ubicación
                </dt>
                <dd>{usuario.camionero?.ubicacion ?? '—'}</dd>
              </div>
              <div className="dc-dato">
                <dt>
                  <IconoCamion width={15} height={15} />
                  Tipo de vehículo
                </dt>
                <dd>{usuario.camionero?.tipo_vehiculo ?? '—'}</dd>
              </div>
              <div className="dc-dato">
                <dt>
                  <IconoPeso width={15} height={15} />
                  Capacidad
                </dt>
                <dd>
                  {usuario.camionero?.capacidad_kg
                    ? `${Number(usuario.camionero.capacidad_kg).toLocaleString('es-AR')} kg`
                    : '—'}
                </dd>
              </div>
              <div className="dc-dato">
                <dt>
                  <IconoEtiqueta width={15} height={15} />
                  Disponibilidad
                </dt>
                <dd>{usuario.camionero?.disponibilidad ? 'Disponible' : 'No disponible'}</dd>
              </div>
            </dl>
          </section>
        )}
      </main>
    </>
  );
}
