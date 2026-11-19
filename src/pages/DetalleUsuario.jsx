import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  IconoAlerta,
  IconoCalendario,
  IconoCamion,
  IconoCorreo,
  IconoDocumento,
  IconoEditar,
  IconoEtiqueta,
  IconoPeso,
  IconoUbicacion,
  IconoUsuario,
} from '../components/Iconos';
import { ErrorDeApi, obtenerUsuario } from '../api/usuarios';
import AvisoExito from '../components/AvisoExito';
import BarraSuperior from '../components/BarraSuperior';
import MigasDePan from '../components/MigasDePan';
import ReputacionUsuario from '../components/ReputacionUsuario';
import { useAvisoSinConexion } from '../components/contextoConexion';
import { formatearFecha } from '../utils/carga';
import { formatearDni } from '../utils/formatoUsuario';
import { destinoVolver, volverA } from '../utils/volver';
import './DetalleCarga.css';
import './DetalleUsuario.css';

/**
 * Ficha de solo lectura de un usuario (HU 1.3), en la ruta /usuarios/:id.
 *
 * Muestra todos los datos del usuario: datos personales, rol, estado y, solo
 * si es camionero, sus datos de vehículo y su reputación. No tiene ningún
 * campo editable: para modificar los datos está el botón "Editar" del
 * encabezado (HU 1.2), como en el detalle de una carga. Al guardar o cancelar,
 * la edición vuelve acá; si guardó, trae el aviso en `avisoExito`.
 *
 * Pide el usuario al backend (`GET /usuarios/:id`), así que se puede recargar
 * o abrir con la dirección. Si llega desde el listado o la edición con el
 * usuario en el `state`, lo muestra enseguida y lo reemplaza por lo que diga
 * la base: si "atrás" vuelve a una ficha con datos viejos, se corrigen solos.
 *
 * Una ficha por id: con `key`, pasar de un usuario a otro arranca de cero.
 *
 * @returns {JSX.Element}
 */
export default function DetalleUsuario() {
  const { id } = useParams();
  return <FichaUsuario key={id} id={id} />;
}

/**
 * @param {object} props
 * @param {string} props.id - el id de la dirección.
 * @returns {JSX.Element}
 */
function FichaUsuario({ id }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Vuelve al listado con la búsqueda y los filtros que tenía (`/usuarios?buscar=...`).
  const volver = destinoVolver(location, { ruta: '/usuarios', texto: 'Volver a Usuarios' });
  const avisarSiFaltaConexion = useAvisoSinConexion();

  // Lo que trajo el listado o la edición, si es este usuario: se ve enseguida.
  const previo = location.state?.usuario;
  const [usuario, setUsuario] = useState(previo && String(previo.id_usuario) === id ? previo : null);
  // 'cargando' | 'ok' | 'no-encontrado' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState(usuario ? 'ok' : 'cargando');
  const [mensajeError, setMensajeError] = useState('');

  // Aviso que deja la edición al volver. Se guarda al entrar y se saca del
  // historial: si no, volvería a aparecer con atrás y adelante.
  const [avisoExito, setAvisoExito] = useState(location.state?.avisoExito ?? '');
  useEffect(() => {
    if (!location.state?.avisoExito) return;
    const { avisoExito: _usado, ...resto } = location.state;
    navigate(location.pathname, { replace: true, state: resto });
  }, [location, navigate]);

  useEffect(() => {
    const controlador = new AbortController();
    obtenerUsuario(id, { signal: controlador.signal })
      .then((datos) => {
        setUsuario(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        if (avisarSiFaltaConexion(error)) return;
        // 400 es un id que no es número (`/usuarios/abc`): para quien lo abre, tampoco existe.
        if (error instanceof ErrorDeApi && [400, 404].includes(error.estado)) {
          setEstadoPantalla('no-encontrado');
          return;
        }
        setMensajeError(
          error instanceof ErrorDeApi ? error.message : 'No se pudo cargar la ficha del usuario. Intentá de nuevo.',
        );
        // Si ya se ve el usuario que trajo el listado, un error al confirmarlo no lo tapa.
        setEstadoPantalla((anterior) => (anterior === 'ok' ? 'ok' : 'error'));
      });
    return () => controlador.abort();
  }, [id, avisarSiFaltaConexion]);

  if (estadoPantalla !== 'ok' || !usuario) {
    return (
      <>
        <BarraSuperior volver={volver} />
        <main className="dc-contenido">
          <MigasDePan volver={volver} actual="Usuario" />
          {estadoPantalla === 'cargando' && <p className="dc-mensaje">Cargando usuario...</p>}
          {estadoPantalla === 'no-encontrado' && (
            <div className="ds-aviso ds-aviso--error" role="alert">
              <IconoAlerta width={22} height={22} />
              No encontramos ese usuario. Puede que la dirección sea incorrecta.
            </div>
          )}
          {estadoPantalla === 'error' && (
            <div className="ds-aviso ds-aviso--error" role="alert">
              <IconoAlerta width={22} height={22} />
              {mensajeError}
            </div>
          )}
        </main>
      </>
    );
  }

  const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`;

  /**
   * Abre la edición con el usuario que se está viendo. Le pasa a dónde volver
   * (esta ficha, con lo que la ficha necesita para volver al listado), así
   * las migas dicen Usuarios › Ana Suárez › Editar usuario.
   *
   * @returns {void}
   */
  const irAEditar = () => {
    const estadoFicha = { usuario, ...(location.state?.volverA ? { volverA: location.state.volverA } : {}) };
    navigate(`/usuarios/${id}/editar`, {
      state: {
        usuario,
        ...volverA(`/usuarios/${id}`, 'Volver a la ficha', estadoFicha, nombreCompleto),
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

        {avisoExito && <AvisoExito alCerrar={() => setAvisoExito('')}>{avisoExito}</AvisoExito>}

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
                Correo electrónico
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
