import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listarUsuarios, ErrorDeApi } from '../api/usuarios';
import {
  IconoAlerta,
  IconoCheck,
  IconoCerrar,
  IconoEditar,
  IconoOjo,
  IconoUsuario,
  IconoUsuarioMas,
} from '../components/Iconos';
import BarraSuperior from '../components/BarraSuperior';
import './Usuarios.css';

/** Filtros en blanco. Sirve para inicializar el estado y el botón "Limpiar filtros". */
const FILTROS_VACIOS = { nombre: '', dni: '', rol: '', estado: '' };

/**
 * Texto en minúscula y sin acentos, para buscar sin importar cómo se escribió:
 * "jose" encuentra a "José".
 *
 * @param {string} texto
 * @returns {string}
 */
const normalizarBusqueda = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * Si un usuario pasa los filtros. Nombre y DNI buscan en cualquier parte del
 * texto; el nombre, también en el apellido.
 *
 * @param {object} usuario
 * @param {typeof FILTROS_VACIOS} filtros
 * @returns {boolean}
 */
const cumpleFiltros = (usuario, filtros) => {
  const nombre = normalizarBusqueda(filtros.nombre);
  if (nombre && !normalizarBusqueda(`${usuario.nombre} ${usuario.apellido}`).includes(nombre)) {
    return false;
  }
  const dni = filtros.dni.trim();
  if (dni && !String(usuario.dni).includes(dni)) return false;
  if (filtros.rol && usuario.rol !== filtros.rol) return false;
  if (filtros.estado && usuario.estado !== filtros.estado) return false;
  return true;
};

/**
 * Pantalla de gestión de usuarios (HU 1.1, HU 1.2 y HU 1.3).
 *
 * Al entrar pide `GET /usuarios` una sola vez, y la búsqueda por nombre/DNI y
 * los filtros de rol y estado se aplican sobre esa lista, sin volver a pedirla:
 * así filtrar es instantáneo y no aparece "Cargando usuarios..." a cada cambio.
 * Cada fila tiene una acción para ver la ficha de solo lectura y otra para
 * editar el usuario.
 *
 * @returns {JSX.Element}
 */
export default function Usuarios() {
  const navigate = useNavigate();
  const location = useLocation();

  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  const [usuarios, setUsuarios] = useState([]);
  const [idDestacado, setIdDestacado] = useState(null);
  // Qué se acaba de hacer al volver del alta o la edición ("Se guardaron los cambios de...").
  const [avisoExito, setAvisoExito] = useState('');
  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  // Guarda el id_usuario ya destacado para que el efecto sea idempotente
  // ante el doble-invoke de <StrictMode> en desarrollo.
  const idProcesadoRef = useRef(null);

  const hayAlgunFiltro = Boolean(
    filtros.nombre.trim() || filtros.dni.trim() || filtros.rol || filtros.estado,
  );

  const usuariosVisibles = useMemo(
    () => usuarios.filter((usuario) => cumpleFiltros(usuario, filtros)),
    [usuarios, filtros],
  );

  // Pide los usuarios una sola vez, al entrar.
  useEffect(() => {
    const controlador = new AbortController();

    listarUsuarios({}, { signal: controlador.signal })
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
  }, []);

  /**
   * Cambia un filtro.
   *
   * @param {string} campo - 'nombre', 'dni', 'rol' o 'estado'.
   * @returns {function(evento: Event): void}
   */
  const alCambiarFiltro = (campo) => (evento) => {
    const { value } = evento.target;
    setFiltros((previos) => ({ ...previos, [campo]: value }));
  };

  // Las pantallas de alta y edición vuelven acá pasando el usuario creado o
  // actualizado por router state, para poder resaltar su fila.
  useEffect(() => {
    const usuario = location.state?.usuarioCreado ?? location.state?.usuarioActualizado;
    if (!usuario) return;
    if (idProcesadoRef.current === usuario.id_usuario) return;

    idProcesadoRef.current = usuario.id_usuario;
    setIdDestacado(usuario.id_usuario);
    setAvisoExito(
      location.state?.usuarioCreado
        ? `Se registró a ${usuario.nombre} ${usuario.apellido}.`
        : `Se guardaron los cambios de ${usuario.nombre} ${usuario.apellido}.`,
    );

    // Limpia el state para no volver a destacarlo si el usuario navega con atrás/adelante.
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  /**
   * Deja los filtros en blanco: vuelve a verse el listado completo.
   *
   * @returns {void}
   */
  const limpiarFiltros = () => setFiltros(FILTROS_VACIOS);

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


  return (
    <>
      <BarraSuperior />

      <main className="us-contenido">
        <div className="us-encabezado">
          <h1 className="ds-titulo-pagina">
            <IconoUsuario width={26} height={26} />
            Gestión de Usuarios
          </h1>
          <button
            type="button"
            className="ds-boton ds-boton--primario"
            onClick={() => navigate('/usuarios/nuevo')}
          >
            <IconoUsuarioMas />
            Nuevo Usuario
          </button>
        </div>

        {/* Búsqueda y filtros (HU 1.3): combinables entre sí, sobre la lista ya cargada. */}
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
              value={filtros.nombre}
              onChange={alCambiarFiltro('nombre')}
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
              value={filtros.dni}
              onChange={alCambiarFiltro('dni')}
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
              onChange={alCambiarFiltro('rol')}
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
              onChange={alCambiarFiltro('estado')}
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

        {avisoExito && (
          <div className="us-aviso-exito" role="status">
            <IconoCheck width={20} height={20} />
            {avisoExito}
          </div>
        )}

        {estadoPantalla === 'ok' && usuariosVisibles.length > 0 && (
          <p className="us-contador">
            {usuariosVisibles.length}{' '}
            {usuariosVisibles.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
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
            {usuariosVisibles.length === 0 ? (
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
                  {usuariosVisibles.map((usuario) => (
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
