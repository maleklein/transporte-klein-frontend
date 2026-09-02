import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listarUsuarios, ErrorDeApi } from '../api/usuarios';
import {
  IconoAlerta,
  IconoCamion,
  IconoCerrar,
  IconoEditar,
  IconoOjo,
  IconoUsuarioMas,
} from '../components/Iconos';
import './Usuarios.css';

/** Filtros en blanco. Sirve para inicializar el estado y el botón "Limpiar filtros". */
const FILTROS_VACIOS = { nombre: '', dni: '', rol: '', estado: '' };

/** Espera antes de aplicar lo tipeado en nombre/DNI, para no pegarle al backend en cada tecla. */
const RETRASO_BUSQUEDA_MS = 350;

/**
 * Pantalla de gestión de usuarios (HU 1.1, HU 1.2 y HU 1.3).
 *
 * Al entrar pide `GET /usuarios` sin filtros. Cada vez que cambia la búsqueda
 * por nombre/DNI o los filtros de rol/estado, vuelve a pedir con los query
 * params correspondientes y actualiza la tabla. Cada fila tiene una acción
 * para ver la ficha de solo lectura y otra para editar el usuario.
 *
 * @returns {JSX.Element}
 */
export default function Usuarios() {
  const navigate = useNavigate();
  const location = useLocation();

  // `filtros` son los filtros ya aplicados (los que disparan el pedido).
  // `nombreTexto`/`dniTexto` son lo que hay escrito en esos inputs ahora
  // mismo; se vuelcan a `filtros` con un pequeño retraso (debounce).
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [nombreTexto, setNombreTexto] = useState('');
  const [dniTexto, setDniTexto] = useState('');

  const [usuarios, setUsuarios] = useState([]);
  const [idDestacado, setIdDestacado] = useState(null);
  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  // Guarda el id_usuario ya destacado para que el efecto sea idempotente
  // ante el doble-invoke de <StrictMode> en desarrollo.
  const idProcesadoRef = useRef(null);

  const hayFiltrosAplicados = Boolean(
    filtros.nombre || filtros.dni || filtros.rol || filtros.estado,
  );

  // Vuelca lo tipeado en nombre a los filtros aplicados, con debounce.
  useEffect(() => {
    const id = setTimeout(() => {
      setFiltros((previos) =>
        previos.nombre === nombreTexto ? previos : { ...previos, nombre: nombreTexto },
      );
    }, RETRASO_BUSQUEDA_MS);
    return () => clearTimeout(id);
  }, [nombreTexto]);

  // Vuelca lo tipeado en DNI a los filtros aplicados, con debounce.
  useEffect(() => {
    const id = setTimeout(() => {
      setFiltros((previos) => (previos.dni === dniTexto ? previos : { ...previos, dni: dniTexto }));
    }, RETRASO_BUSQUEDA_MS);
    return () => clearTimeout(id);
  }, [dniTexto]);

  // Pide los usuarios cada vez que cambian los filtros aplicados. Si llega un
  // cambio antes de que responda el pedido anterior, lo cancela (gana el último).
  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPantalla('cargando');
    setMensajeError('');

    listarUsuarios(filtros, { signal: controlador.signal })
      .then((datos) => {
        setUsuarios(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setMensajeError(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudo cargar el listado de usuarios. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, [filtros]);

  // Las pantallas de alta y edición vuelven acá pasando el usuario creado o
  // actualizado por router state, para poder resaltar su fila.
  useEffect(() => {
    const usuario = location.state?.usuarioCreado ?? location.state?.usuarioActualizado;
    if (!usuario) return;
    if (idProcesadoRef.current === usuario.id_usuario) return;

    idProcesadoRef.current = usuario.id_usuario;
    setIdDestacado(usuario.id_usuario);

    // Limpia el state para no volver a destacarlo si el usuario navega con atrás/adelante.
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  /**
   * Deja los filtros en blanco y vuelve a traer el listado completo.
   *
   * @returns {void}
   */
  const limpiarFiltros = () => {
    setNombreTexto('');
    setDniTexto('');
    setFiltros(FILTROS_VACIOS);
  };

  /**
   * Navega a la ficha de solo lectura de un usuario, llevando sus datos por
   * router state (no hay `GET /usuarios/:id` individual, así que se reusan
   * los datos que ya trajo el listado).
   *
   * @param {object} usuario - la fila del listado sobre la que se hizo click.
   * @returns {void}
   */
  const irAlDetalle = (usuario) => {
    navigate('/usuarios/detalle', { state: { usuario } });
  };

  /**
   * Navega a la pantalla de edición de un usuario, llevando sus datos por
   * router state.
   *
   * @param {object} usuario - la fila del listado sobre la que se hizo click.
   * @returns {void}
   */
  const irAEditar = (usuario) => {
    navigate('/usuarios/editar', { state: { usuario } });
  };

  // Incluye lo tipeado en nombre/DNI aunque el debounce todavía no lo haya aplicado.
  const hayAlgunFiltro =
    hayFiltrosAplicados || nombreTexto.trim() !== '' || dniTexto.trim() !== '';

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      <main className="us-contenido">
        <div className="us-encabezado">
          <h1>Gestión de Usuarios</h1>
          <button
            type="button"
            className="ds-boton ds-boton--primario"
            onClick={() => navigate('/usuarios/nuevo')}
          >
            <IconoUsuarioMas />
            Nuevo Usuario
          </button>
        </div>

        {/* Búsqueda y filtros (HU 1.3): combinables entre sí. Cada cambio vuelve a pedir GET /usuarios. */}
        <div className="us-filtros">
          <div className="us-filtro">
            <label className="ds-campo__label" htmlFor="us-nombre">
              Nombre
            </label>
            <input
              id="us-nombre"
              type="text"
              className="ds-campo__input"
              placeholder="Buscar por nombre..."
              autoComplete="off"
              value={nombreTexto}
              onChange={(evento) => setNombreTexto(evento.target.value)}
            />
          </div>

          <div className="us-filtro">
            <label className="ds-campo__label" htmlFor="us-dni">
              DNI
            </label>
            <input
              id="us-dni"
              type="text"
              className="ds-campo__input"
              placeholder="Buscar por DNI..."
              inputMode="numeric"
              autoComplete="off"
              value={dniTexto}
              onChange={(evento) => setDniTexto(evento.target.value)}
            />
          </div>

          <div className="us-filtro">
            <label className="ds-campo__label" htmlFor="us-rol">
              Rol
            </label>
            <select
              id="us-rol"
              className="ds-campo__input"
              value={filtros.rol}
              onChange={(evento) =>
                setFiltros((previos) => ({ ...previos, rol: evento.target.value }))
              }
            >
              <option value="">Todos los roles</option>
              <option value="administrador">Administrador</option>
              <option value="camionero">Camionero</option>
            </select>
          </div>

          <div className="us-filtro">
            <label className="ds-campo__label" htmlFor="us-estado">
              Estado
            </label>
            <select
              id="us-estado"
              className="ds-campo__input"
              value={filtros.estado}
              onChange={(evento) =>
                setFiltros((previos) => ({ ...previos, estado: evento.target.value }))
              }
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <button
            type="button"
            className="ds-boton ds-boton--secundario us-limpiar"
            onClick={limpiarFiltros}
            disabled={!hayAlgunFiltro}
          >
            <IconoCerrar />
            Limpiar filtros
          </button>
        </div>

        {estadoPantalla === 'ok' && usuarios.length > 0 && (
          <p className="us-contador">
            {usuarios.length} {usuarios.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
          </p>
        )}

        {estadoPantalla === 'error' && (
          <div className="us-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            {mensajeError}
          </div>
        )}

        {estadoPantalla === 'cargando' && <p className="us-vacio">Cargando usuarios...</p>}

        {estadoPantalla === 'ok' && (
          <div className="us-tabla-caja">
            {usuarios.length === 0 ? (
              <p className="us-vacio">
                {hayAlgunFiltro ? (
                  'No hay usuarios que coincidan con los filtros aplicados. Probá con otros valores o limpiá los filtros.'
                ) : (
                  <>
                    Todavía no hay usuarios cargados. Usá el botón <strong>Nuevo Usuario</strong> para
                    dar de alta el primero.
                  </>
                )}
              </p>
            ) : (
              <table className="us-tabla">
                <thead>
                  <tr>
                    <th scope="col">Nombre y apellido</th>
                    <th scope="col">DNI</th>
                    <th scope="col">Email</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Datos del vehículo</th>
                    <th scope="col">
                      <span className="us-columna-oculta">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr
                      key={usuario.id_usuario}
                      className={usuario.id_usuario === idDestacado ? 'us-fila--nueva' : undefined}
                    >
                      <td>
                        {usuario.nombre} {usuario.apellido}
                      </td>
                      <td>{usuario.dni}</td>
                      <td>{usuario.email}</td>
                      <td>
                        <span
                          className={`ds-etiqueta-rol${
                            usuario.rol === 'camionero' ? ' ds-etiqueta-rol--camionero' : ''
                          }`}
                        >
                          {usuario.rol === 'camionero' ? 'Camionero' : 'Administrador'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`ds-etiqueta-estado${
                            usuario.estado === 'inactivo' ? ' ds-etiqueta-estado--inactivo' : ''
                          }`}
                        >
                          {usuario.estado === 'inactivo' ? 'Inactivo' : 'Activo'}
                        </span>
                      </td>
                      <td>
                        {usuario.camionero
                          ? `${usuario.camionero.ubicacion} — ${usuario.camionero.tipo_vehiculo} (${usuario.camionero.capacidad_kg} kg)`
                          : '—'}
                      </td>
                      <td>
                        <div className="us-acciones">
                          <button
                            type="button"
                            className="ds-boton ds-boton--secundario us-boton-accion"
                            onClick={() => irAlDetalle(usuario)}
                            aria-label={`Ver ficha de ${usuario.nombre} ${usuario.apellido}`}
                          >
                            <IconoOjo width={18} height={18} />
                            Ver
                          </button>
                          <button
                            type="button"
                            className="ds-boton ds-boton--secundario us-boton-accion"
                            onClick={() => irAEditar(usuario)}
                            aria-label={`Editar a ${usuario.nombre} ${usuario.apellido}`}
                          >
                            <IconoEditar width={18} height={18} />
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </>
  );
}
