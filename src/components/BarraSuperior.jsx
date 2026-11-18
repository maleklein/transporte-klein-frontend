import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  IconoAjustes,
  IconoAlerta,
  IconoCaja,
  IconoCamion,
  IconoCerrar,
  IconoCerrarSesion,
  IconoChevronIzquierda,
  IconoGrafico,
  IconoInicio,
  IconoMenu,
  IconoUsuario,
} from './Iconos';
import IndicadorNotificaciones from './IndicadorNotificaciones';
import { cerrarSesion, usuarioActual } from '../api/sesion';
import { seccionDeOrigen } from '../utils/volver';
import './BarraSuperior.css';

/**
 * Accesos de la navegación por rol (HU 15). `activo` decide cuándo ese acceso
 * es la sección actual, para resaltarlo.
 *
 * El de Cargas cubre todo lo que está debajo de `/cargas`: el listado, el
 * detalle, la edición y el alta. "Nueva carga" no va en la barra: es una
 * acción de Gestión de Cargas (su botón) y del panel de inicio, igual que
 * "Nuevo Usuario" está sólo en Gestión de Usuarios. Así la barra tiene sólo
 * secciones, y en el celular el menú es más corto.
 */
const ACCESOS_ADMINISTRADOR = [
  {
    to: '/panel-administrador',
    texto: 'Inicio',
    Icono: IconoInicio,
    activo: (ruta) => ruta === '/panel-administrador',
  },
  {
    to: '/usuarios',
    texto: 'Usuarios',
    Icono: IconoUsuario,
    activo: (ruta) => ruta.startsWith('/usuarios'),
  },
  {
    to: '/cargas',
    texto: 'Cargas',
    Icono: IconoCaja,
    activo: (ruta) => ruta === '/cargas' || ruta.startsWith('/cargas/'),
  },
  {
    to: '/metricas',
    texto: 'Métricas',
    Icono: IconoGrafico,
    activo: (ruta) => ruta === '/metricas',
  },
  {
    to: '/parametros',
    texto: 'Parámetros',
    Icono: IconoAjustes,
    activo: (ruta) => ruta === '/parametros',
  },
];

const ACCESOS_CAMIONERO = [
  {
    to: '/panel-camionero',
    texto: 'Inicio',
    Icono: IconoInicio,
    activo: (ruta) => ruta === '/panel-camionero',
  },
  {
    to: '/cargas',
    texto: 'Cargas disponibles',
    Icono: IconoCaja,
    activo: (ruta) => ruta === '/cargas' || ruta.startsWith('/cargas/'),
  },
  {
    to: '/mis-viajes',
    texto: 'Mis viajes',
    Icono: IconoCamion,
    activo: (ruta) => ruta === '/mis-viajes',
  },
];

/**
 * Barra superior de las pantallas con sesión: la marca, la navegación
 * principal por rol (HU 15) y, a la derecha, el acceso a las notificaciones
 * (HU 12).
 *
 * En la computadora los accesos van todos a la vista. En el celular (720 px o
 * menos) no entran: ocupaban seis renglones y casi media pantalla
 * (corrección del profesor del 17/11, punto 9). Ahí la barra queda en un solo
 * renglón, como en las apps: a la izquierda el botón de menú (sólo el ícono),
 * que despliega los accesos debajo; en el centro "Transporte Klein"; a la
 * derecha la campana, con un punto rojo si hay notificaciones sin leer. No se
 * usa una barra fija abajo: en el navegador del celular ya hay una barra
 * abajo y quitaría más lugar.
 *
 * Los estilos base de la barra (`.us-navbar`) siguen en `pages/Usuarios.css`,
 * donde nacieron.
 *
 * En las pantallas que tienen a dónde volver (el detalle de una carga, por
 * ejemplo), en el celular el botón de menú pasa a ser una flecha ‹ que lleva
 * a la pantalla anterior, y las migas de pan de la pantalla se esconden: es
 * lo que se espera de una pantalla de detalle en el celular, y ahorra un
 * renglón.
 *
 * También muestra, debajo de la barra, el aviso de "sin permiso" que deja
 * `RutaProtegida` cuando redirige a un usuario que abrió una pantalla de otro
 * rol (HU 15).
 *
 * @param {object} [props]
 * @param {{ ruta: string, texto: string, estado?: object|null } | null} [props.volver] - a dónde vuelve la pantalla, el mismo de sus migas de pan (ver `utils/volver`). Si viene, en el celular reemplaza al menú.
 * @returns {JSX.Element}
 */
export default function BarraSuperior({ volver = null } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = usuarioActual();
  const accesos = !usuario ? [] : usuario.rol === 'camionero' ? ACCESOS_CAMIONERO : ACCESOS_ADMINISTRADOR;
  const avisoAcceso = location.state?.avisoAcceso;
  const rutaPerfil = usuario ? `/perfiles/${usuario.id}` : null;

  const [menuAbierto, setMenuAbierto] = useState(false);

  // Al cambiar de pantalla el menú se cierra solo.
  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  // Escape cierra el menú.
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const alPresionar = (evento) => {
      if (evento.key === 'Escape') setMenuAbierto(false);
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [menuAbierto]);

  /**
   * Cierra la sesión y manda al login. El `replace` evita que "atrás" vuelva
   * a una pantalla protegida.
   */
  const salir = () => {
    cerrarSesion();
    navigate('/', { replace: true });
  };

  // Si se llegó desde una sección de la barra (Mis viajes → una carga), se
  // resalta esa, igual que en las migas; si no, la que corresponde a la dirección.
  const origen = usuario ? seccionDeOrigen(volver, usuario.rol) : null;
  const accesoOrigen = accesos.find(({ to }) => to === origen);

  /** Los accesos como enlaces, con la sección actual resaltada. */
  const enlaces = (claseExtra = '') =>
    accesos.map(({ to, texto, Icono, activo }) => {
      const esActivo = accesoOrigen ? to === accesoOrigen.to : activo(location.pathname);
      return (
        <Link
          key={to}
          to={to}
          className={`bs-enlace${claseExtra}${esActivo ? ' bs-enlace--activo' : ''}`}
          aria-current={esActivo ? 'page' : undefined}
        >
          <Icono width={20} height={20} />
          {texto}
        </Link>
      );
    });

  const enPerfil = location.pathname === rutaPerfil;

  return (
    <>
      <nav className="us-navbar bs-barra" aria-label="Principal">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>

        {/* En la computadora, todos a la vista. En el celular, `bs-solo-escritorio` los esconde. */}
        {enlaces(' bs-solo-escritorio')}
        {usuario && (
          <Link
            to={rutaPerfil}
            className={`bs-enlace bs-solo-escritorio${enPerfil ? ' bs-enlace--activo' : ''}`}
            aria-current={enPerfil ? 'page' : undefined}
          >
            <IconoUsuario width={20} height={20} />
            Mi perfil
          </Link>
        )}
        {usuario && <IndicadorNotificaciones />}
        {usuario && (
          <button type="button" className="bs-enlace bs-solo-escritorio" onClick={salir}>
            <IconoCerrarSesion width={20} height={20} />
            Cerrar sesión
          </button>
        )}

        {/* Sólo en el celular, a la izquierda (lo ubica el CSS): la flecha para
            volver, si la pantalla tiene a dónde volver; si no, el menú. */}
        {usuario && volver && (
          <button
            type="button"
            className="bs-enlace bs-solo-celular bs-menu-boton"
            aria-label={volver.texto}
            onClick={() => navigate(volver.ruta, { state: volver.estado ?? null })}
          >
            <IconoChevronIzquierda width={26} height={26} />
          </button>
        )}
        {usuario && !volver && (
          <button
            type="button"
            className="bs-enlace bs-solo-celular bs-menu-boton"
            aria-label={menuAbierto ? 'Cerrar el menú' : 'Menú'}
            aria-expanded={menuAbierto}
            aria-controls="bs-menu"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            {menuAbierto ? <IconoCerrar width={24} height={24} /> : <IconoMenu width={24} height={24} />}
          </button>
        )}
      </nav>

      {/* Celular: los accesos se despliegan debajo de la barra. */}
      {usuario && !volver && (
        <div className="bs-menu bs-solo-celular" id="bs-menu" hidden={!menuAbierto}>
          {enlaces()}
          <Link
            to={rutaPerfil}
            className={`bs-enlace${enPerfil ? ' bs-enlace--activo' : ''}`}
            aria-current={enPerfil ? 'page' : undefined}
          >
            <IconoUsuario width={20} height={20} />
            Mi perfil
          </Link>
          <button type="button" className="bs-enlace" onClick={salir}>
            <IconoCerrarSesion width={20} height={20} />
            Cerrar sesión
          </button>
        </div>
      )}


      {avisoAcceso && (
        <p className="bs-aviso-acceso" role="alert">
          <IconoAlerta width={18} height={18} />
          {avisoAcceso}
        </p>
      )}
    </>
  );
}
