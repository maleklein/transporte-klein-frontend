import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  IconoCalendario,
  IconoCamion,
  IconoCheck,
  IconoCorreo,
  IconoDocumento,
  IconoEditar,
  IconoEtiqueta,
  IconoPeso,
  IconoUbicacion,
  IconoUsuario,
} from '../components/Iconos';
import { ultimaVersionDe } from '../api/usuarios';
import BarraSuperior from '../components/BarraSuperior';
import MigasDePan from '../components/MigasDePan';
import ReputacionUsuario from '../components/ReputacionUsuario';
import { formatearFecha } from '../utils/carga';
import { formatearDni } from '../utils/formatoUsuario';
import { destinoVolver, volverA } from '../utils/volver';
import './DetalleCarga.css';
import './DetalleUsuario.css';

/**
 * Ficha de solo lectura de un usuario (HU 1.3), en la ruta /usuarios/detalle.
 *
 * Muestra todos los datos del usuario seleccionado en el listado: datos
 * personales, rol, estado y, solo si es camionero, sus datos de vehículo y su
 * reputación. No tiene ningún campo editable: para modificar los datos está el
 * botón "Editar" del encabezado (HU 1.2), como en el detalle de una carga. Al
 * guardar o cancelar, la edición vuelve acá; si guardó, trae el usuario
 * actualizado y el aviso en `avisoExito`.
 *
 * Los datos llegan por router state desde el listado — `GET /usuarios` no
 * expone un endpoint individual por id, así que no se puede recargar por URL:
 * si se entra directo o se refresca, se vuelve al listado.
 *
 * @returns {JSX.Element}
 */
export default function DetalleUsuario() {
  const location = useLocation();
  const navigate = useNavigate();
  // Si se lo editó en esta sesión, la versión guardada (ver `ultimaVersionDe`).
  const usuario = ultimaVersionDe(location.state?.usuario);
  // Vuelve al listado con la búsqueda y los filtros que tenía (`/usuarios?buscar=...`).
  const volver = destinoVolver(location, { ruta: '/usuarios', texto: 'Volver a Usuarios' });

  // Aviso que deja la edición al volver. Se guarda al entrar y se saca del
  // historial: si no, volvería a aparecer con atrás y adelante.
  const [avisoExito] = useState(location.state?.avisoExito ?? '');
  useEffect(() => {
    if (!location.state?.avisoExito) return;
    const { avisoExito: _usado, ...resto } = location.state;
    navigate(location.pathname, { replace: true, state: resto });
  }, [location, navigate]);

  if (!usuario) return <Navigate to="/usuarios" replace />;

  const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;

  /**
   * Abre la edición. Le pasa el `state` de la ficha para que, al volver,
   * la ficha siga sabiendo a dónde volver (el listado con sus filtros), y las
   * migas digan Usuarios › Ana Suárez › Editar usuario.
   *
   * @returns {void}
   */
  const irAEditar = () => {
    const { avisoExito: _usado, ...estadoFicha } = location.state;
    navigate('/usuarios/editar', {
      state: {
        usuario,
        ...volverA('/usuarios/detalle', 'Volver a la ficha', estadoFicha, nombreCompleto),
      },
    });
  };

  const esCamionero = usuario.rol === 'camionero';

  return (
    <>
      <BarraSuperior volver={volver} />

      <main className="dc-contenido">
        <MigasDePan volver={volver} actual={nombreCompleto} />

        <header className="dc-encabezado">
          <div className="dc-encabezado__identidad">
            <h1 className="dc-titulo">
              <IconoUsuario width={26} height={26} />
              {nombreCompleto}
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
          </div>

          <div className="dc-encabezado__acciones">
            <button type="button" className="ds-boton ds-boton--secundario" onClick={irAEditar}>
              <IconoEditar />
              Editar
            </button>
          </div>
        </header>

        {avisoExito && (
          <div className="ds-aviso ds-aviso--exito" role="status">
            <IconoCheck width={20} height={20} />
            {avisoExito}
          </div>
        )}

        <section className="dc-card">
          <h2 className="dc-card__titulo">Datos personales</h2>

          <dl className="dc-datos">
            <div className="dc-dato">
              <dt>
                <IconoDocumento width={15} height={15} />
                DNI
              </dt>
              <dd>{formatearDni(usuario.dni)}</dd>
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

        {esCamionero && (
          <ReputacionUsuario key={usuario.id_usuario} idUsuario={usuario.id_usuario} />
        )}
      </main>
    </>
  );
}
