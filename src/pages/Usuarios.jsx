import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { listarUsuarios, ErrorDeApi } from '../api/usuarios';
import {
  IconoAlerta,
  IconoBuscar,
  IconoCerrar,
  IconoChevronDerecha,
  IconoUsuario,
  IconoUsuarioMas,
} from '../components/Iconos';
import AvisoExito from '../components/AvisoExito';
import BarraSuperior from '../components/BarraSuperior';
import MigasDePan from '../components/MigasDePan';
import BotonQuitarFiltro from '../components/BotonQuitarFiltro';
import ComboBox from '../components/ComboBox';
import TextoResaltado from '../components/TextoResaltado';
import { avisoSinResultados, coincideBusqueda, datoQueCoincide } from '../utils/buscarUsuarios';
import { formatearDni } from '../utils/formatoUsuario';
import { destinoVolver, volverA } from '../utils/volver';
import { useAvisoSinConexion } from '../components/contextoConexion';
import './DetalleCarga.css';
import './Usuarios.css';

const OPCIONES_ROL = [
  { valor: 'administrador', etiqueta: 'Administrador' },
  { valor: 'camionero', etiqueta: 'Camionero' },
];
const OPCIONES_ESTADO = [
  { valor: 'activo', etiqueta: 'Activo' },
  { valor: 'inactivo', etiqueta: 'Inactivo' },
];
const ROLES = OPCIONES_ROL.map((opcion) => opcion.valor);
const ESTADOS = OPCIONES_ESTADO.map((opcion) => opcion.valor);

/**
 * Lee la búsqueda y los filtros de la URL (`/usuarios?buscar=gauto&rol=camionero`).
 * Un rol o estado que no existe se ignora, como si no hubiera filtro.
 *
 * @param {URLSearchParams} parametros
 * @returns {{ buscar: string, rol: string, estado: string }}
 */
const filtrosDeUrl = (parametros) => {
  const rol = parametros.get('rol') ?? '';
  const estado = parametros.get('estado') ?? '';
  return {
    buscar: parametros.get('buscar') ?? '',
    rol: ROLES.includes(rol) ? rol : '',
    estado: ESTADOS.includes(estado) ? estado : '',
  };
};

/**
 * Cómo se lee el rol en el listado.
 *
 * @param {string} rol
 * @returns {string}
 */
const nombreRol = (rol) => (rol === 'camionero' ? 'Camionero' : 'Administrador');

/**
 * Si un usuario pasa los filtros. La búsqueda mira nombre, apellido, DNI y email a
 * la vez (ver `coincideBusqueda`); rol y estado tienen que ser iguales.
 *
 * @param {object} usuario
 * @param {{ buscar: string, rol: string, estado: string }} filtros
 * @returns {boolean}
 */
const cumpleFiltros = (usuario, filtros) => {
  if (!coincideBusqueda(usuario, filtros.buscar)) return false;
  if (filtros.rol && usuario.rol !== filtros.rol) return false;
  if (filtros.estado && usuario.estado !== filtros.estado) return false;
  return true;
};

/**
 * Pantalla de gestión de usuarios (HU 1.1, HU 1.2 y HU 1.3).
 *
 * Al entrar pide `GET /usuarios` una sola vez, y la búsqueda (nombre, apellido, DNI o email) y
 * los filtros de rol y estado se aplican sobre esa lista, sin volver a pedirla:
 * así filtrar es instantáneo y no aparece "Cargando usuarios..." a cada cambio.
 * Tocar un usuario abre su ficha de solo lectura, y desde la ficha se edita.
 * En la computadora es una tabla con todos los datos; en el celular, donde la
 * tabla no entra, una lista con el nombre, el rol y el estado (como Ajustes
 * del iPhone), y el resto de los datos está en la ficha.
 *
 * La búsqueda y los filtros viven en la URL, que es su única fuente: así, al
 * volver de la ficha o de la edición, el listado sigue como se lo dejó. Entrar
 * desde "Usuarios" de la barra abre el listado sin filtros.
 *
 * @returns {JSX.Element}
 */
export default function Usuarios() {
  const navigate = useNavigate();
  const location = useLocation();

  const [parametrosUrl, setParametrosUrl] = useSearchParams();
  const filtros = useMemo(() => filtrosDeUrl(parametrosUrl), [parametrosUrl]);
  const busqueda = filtros.buscar.trim();
  // Para devolverle el foco al campo de búsqueda al quitarla con la ×.
  const refBuscar = useRef(null);

  const [usuarios, setUsuarios] = useState([]);
  const [idDestacado, setIdDestacado] = useState(null);
  // El aviso que deja el alta al volver ("El usuario Ana Suárez se registró correctamente.").
  const [avisoExito, setAvisoExito] = useState('');
  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  // Guarda el id_usuario ya destacado para que el efecto sea idempotente
  // ante el doble-invoke de <StrictMode> en desarrollo.
  const idProcesadoRef = useRef(null);

  const hayAlgunFiltro = Boolean(busqueda || filtros.rol || filtros.estado);

  const usuariosVisibles = useMemo(
    () => usuarios.filter((usuario) => cumpleFiltros(usuario, filtros)),
    [usuarios, filtros],
  );

  // Con el listado vacío por la búsqueda o los filtros: qué decir y qué salida
  // ofrecer. Para eso cuenta cuántos coinciden con la búsqueda sin Rol ni Estado.
  const aviso =
    hayAlgunFiltro && usuarios.length > 0 && usuariosVisibles.length === 0
      ? avisoSinResultados({
          busqueda,
          rol: filtros.rol,
          estado: filtros.estado,
          coincidenSinFiltros: usuarios.filter((usuario) => coincideBusqueda(usuario, filtros.buscar))
            .length,
        })
      : null;

  const avisarSiFaltaConexion = useAvisoSinConexion();

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
        if (avisarSiFaltaConexion(error)) return;
        setMensajeError(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudo cargar el listado de usuarios. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, [avisarSiFaltaConexion]);

  /**
   * Cambia un filtro escribiéndolo en la URL. `replace` para no llenar el
   * historial con un paso por cada letra. El texto se guarda tal cual, sin
   * recortar: si no, no se podría escribir el espacio entre dos palabras.
   *
   * @param {string} campo - 'buscar', 'rol' o 'estado'.
   * @returns {function(evento: Event): void}
   */
  // A dónde vuelve esta pantalla (el inicio, si se entró desde el panel). Se
  // separa del resto del `state` (el usuario recién creado o editado) para
  // conservarlo al filtrar, al limpiar el aviso y al ir y volver de la ficha.
  const destino = destinoVolver(location, null);
  const estadoPropio = destino ? { volverA: destino } : null;

  const alCambiarFiltro = (campo) => (evento) => {
    const { value } = evento.target;
    setParametrosUrl(
      (previos) => {
        const siguientes = new URLSearchParams(previos);
        if (value) siguientes.set(campo, value);
        else siguientes.delete(campo);
        return siguientes;
      },
      { replace: true, state: estadoPropio },
    );
  };

  // El alta vuelve acá pasando el usuario creado por router state, para
  // resaltar su fila y avisar. (La edición vuelve a la ficha, no acá.)
  useEffect(() => {
    const usuario = location.state?.usuarioCreado;
    if (!usuario) return;
    if (idProcesadoRef.current === usuario.id_usuario) return;

    idProcesadoRef.current = usuario.id_usuario;
    setIdDestacado(usuario.id_usuario);
    setAvisoExito(`El usuario ${usuario.nombre} ${usuario.apellido} se registró correctamente.`);

    // Limpia el state para no volver a destacarlo si el usuario navega con
    // atrás/adelante. Con `search`, para no perder la búsqueda y los filtros.
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: location.state?.volverA ? { volverA: location.state.volverA } : null,
    });
  }, [location.state, location.pathname, location.search, navigate]);

  /**
   * Deja los filtros en blanco: vuelve a verse el listado completo.
   *
   * @returns {void}
   */
  const limpiarFiltros = () => setParametrosUrl({}, { replace: true, state: estadoPropio });

  // Lo que se lleva la ficha y la edición para volver al listado tal como estaba.
  const volverAlListado = volverA(`/usuarios${location.search}`, 'Volver a Usuarios', estadoPropio);

  /**
   * Navega a la ficha de un usuario (`/usuarios/:id`). Le pasa los datos que
   * ya trajo el listado para que se vean enseguida; la ficha igual los pide
   * al backend y muestra lo que diga la base.
   *
   * @param {object} usuario - la fila del listado sobre la que se hizo click.
   * @returns {void}
   */
  const irAlDetalle = (usuario) => {
    navigate(`/usuarios/${usuario.id_usuario}`, { state: { usuario, ...volverAlListado } });
  };

  return (
    <>
      <BarraSuperior volver={destino} />

      <main className="us-contenido">
        <MigasDePan volver={destino} actual="Usuarios" />

        <div className="us-encabezado">
          <h1 className="ds-titulo-pagina">
            <IconoUsuario width={26} height={26} />
            Gestión de Usuarios
          </h1>
          <button
            type="button"
            className="ds-boton ds-boton--primario"
            onClick={() => navigate('/usuarios/nuevo', { state: volverAlListado })}
          >
            <IconoUsuarioMas />
            Nuevo Usuario
          </button>
        </div>

        {/* Búsqueda y filtros (HU 1.3): combinables entre sí, sobre la lista ya cargada. */}
        <div className="us-filtros">
          <div className="us-filtro us-filtro--buscar">
            <label className="ds-campo__label" htmlFor="us-buscar">
              Buscar
            </label>
            <div className="us-buscar ds-filtro-control">
              <IconoBuscar className="us-buscar__icono" width={20} height={20} />
              <input
                id="us-buscar"
                ref={refBuscar}
                type="search"
                className={`ds-campo__input us-buscar__input${filtros.buscar ? ' ds-campo__input--activo' : ''}`}
                placeholder="Nombre, apellido, DNI o correo electrónico..."
                autoComplete="off"
                value={filtros.buscar}
                onChange={alCambiarFiltro('buscar')}
              />
              {filtros.buscar && (
                <BotonQuitarFiltro
                  etiqueta="Buscar"
                  alQuitar={() => {
                    alCambiarFiltro('buscar')({ target: { value: '' } });
                    refBuscar.current?.focus();
                  }}
                />
              )}
            </div>
          </div>

          <div className="us-filtro">
            <label className="ds-campo__label" htmlFor="us-rol">
              Rol
            </label>
            <ComboBox
              id="us-rol"
              buscable={false}
              opciones={OPCIONES_ROL}
              valor={filtros.rol}
              alElegir={(valor) => alCambiarFiltro('rol')({ target: { value: valor } })}
              marcador="Todos los roles"
              textoOpcionVacia="Todos los roles"
              etiquetaFiltro="Rol"
            />
          </div>

          <div className="us-filtro">
            <label className="ds-campo__label" htmlFor="us-estado">
              Estado
            </label>
            <ComboBox
              id="us-estado"
              buscable={false}
              opciones={OPCIONES_ESTADO}
              valor={filtros.estado}
              alElegir={(valor) => alCambiarFiltro('estado')({ target: { value: valor } })}
              marcador="Todos los estados"
              textoOpcionVacia="Todos los estados"
              etiquetaFiltro="Estado"
            />
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

        {avisoExito && <AvisoExito alCerrar={() => setAvisoExito('')}>{avisoExito}</AvisoExito>}

        {/*
          El contador es una región "status": el lector de pantalla anuncia
          cuántos usuarios quedaron cada vez que cambia la búsqueda. Con cero
          resultados se oculta a la vista (ya está el aviso de abajo), pero
          sigue anunciándose.
        */}
        {estadoPantalla === 'ok' && (
          <p
            className={usuariosVisibles.length > 0 ? 'us-contador' : 'us-solo-lectores'}
            role="status"
          >
            {aviso
              ? `${aviso.titulo} ${aviso.ayuda}`
              : `${usuariosVisibles.length} ${
                  usuariosVisibles.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'
                }${busqueda ? ` para “${busqueda}”` : ''}`}
          </p>
        )}

        {estadoPantalla === 'error' && (
          <div className="ds-aviso ds-aviso--error" role="alert">
            <IconoAlerta width={22} height={22} />
            {mensajeError}
          </div>
        )}

        {estadoPantalla === 'cargando' && <p className="us-vacio">Cargando usuarios...</p>}

        {estadoPantalla === 'ok' && (
          <div className="us-tabla-caja">
            {aviso ? (
              <div className="us-sin-resultados">
                <IconoBuscar className="us-sin-resultados__icono" width={28} height={28} />
                <p className="us-sin-resultados__titulo">{aviso.titulo}</p>
                <p className="us-sin-resultados__ayuda">{aviso.ayuda}</p>
              </div>
            ) : usuariosVisibles.length === 0 ? (
              <p className="us-vacio">
                Todavía no hay usuarios cargados. Usá el botón <strong>Nuevo Usuario</strong> para
                dar de alta el primero.
              </p>
            ) : (
              <table className="us-tabla">
                <thead>
                  <tr>
                    <th scope="col">Nombre y apellido</th>
                    <th scope="col">DNI</th>
                    <th scope="col">Correo electrónico</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Datos del vehículo</th>
                    <th scope="col">
                      <span className="us-columna-oculta">Ficha</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosVisibles.map((usuario) => (
                    // Toda la fila abre la ficha con el mouse. Con el teclado y el
                    // lector de pantalla, el botón es el nombre.
                    <tr
                      key={usuario.id_usuario}
                      className={`us-fila${usuario.id_usuario === idDestacado ? ' us-fila--nueva' : ''}`}
                      onClick={() => irAlDetalle(usuario)}
                    >
                      <td>
                        <button
                          type="button"
                          className="us-abrir"
                          onClick={(evento) => {
                            evento.stopPropagation();
                            irAlDetalle(usuario);
                          }}
                        >
                          <span className="us-solo-lectores">Ver ficha de </span>
                          <TextoResaltado
                            texto={`${usuario.nombre} ${usuario.apellido}`}
                            busqueda={filtros.buscar}
                          />
                        </button>
                      </td>
                      <td>
                        <TextoResaltado texto={formatearDni(usuario.dni)} busqueda={filtros.buscar} />
                      </td>
                      <td>
                        <TextoResaltado texto={usuario.email} busqueda={filtros.buscar} />
                      </td>
                      <td>
                        <span
                          className={`ds-etiqueta-rol${
                            usuario.rol === 'camionero' ? ' ds-etiqueta-rol--camionero' : ''
                          }`}
                        >
                          {nombreRol(usuario.rol)}
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
                      <td className="us-flecha">
                        <IconoChevronDerecha width={22} height={22} aria-hidden="true" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/*
              En el celular, una lista en lugar de la tabla: nombre, rol y
              estado, y se toca para abrir la ficha. Si la búsqueda encontró al
              usuario por el DNI o el email, ese dato se agrega al rol, para que
              se vea por qué apareció. Se dibujan las dos y el CSS muestra una.
            */}
            {!aviso && usuariosVisibles.length > 0 && (
              <ul className="us-lista">
                {usuariosVisibles.map((usuario) => {
                  const dato = datoQueCoincide(usuario, filtros.buscar);
                  return (
                    <li key={usuario.id_usuario}>
                      <button
                        type="button"
                        className={`us-item${usuario.id_usuario === idDestacado ? ' us-fila--nueva' : ''}`}
                        onClick={() => irAlDetalle(usuario)}
                      >
                        <span className="us-item__texto">
                          <span className="us-item__nombre">
                            <TextoResaltado
                              texto={`${usuario.nombre} ${usuario.apellido}`}
                              busqueda={filtros.buscar}
                            />
                          </span>
                          <span className="us-item__dato">
                            {nombreRol(usuario.rol)}
                            {dato && (
                              <>
                                {' · '}
                                <TextoResaltado
                                  texto={dato === 'dni' ? formatearDni(usuario.dni) : usuario.email}
                                  busqueda={filtros.buscar}
                                />
                              </>
                            )}
                          </span>
                        </span>
                        <span
                          className={`ds-etiqueta-estado${
                            usuario.estado === 'inactivo' ? ' ds-etiqueta-estado--inactivo' : ''
                          }`}
                        >
                          {usuario.estado === 'inactivo' ? 'Inactivo' : 'Activo'}
                        </span>
                        <IconoChevronDerecha className="us-item__flecha" width={22} height={22} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </main>
    </>
  );
}
