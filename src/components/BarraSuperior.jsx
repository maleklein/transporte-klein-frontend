import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  IconoAjustes,
  IconoAlerta,
  IconoCaja,
  IconoCajaMas,
  IconoCamion,
  IconoCerrarSesion,
  IconoGrafico,
  IconoInicio,
  IconoUsuario,
} from './Iconos';
import IndicadorNotificaciones from './IndicadorNotificaciones';
import { cerrarSesion, usuarioActual } from '../api/sesion';
import './BarraSuperior.css';

/**
 * Accesos de la navegación por rol (HU 15). `activo` decide cuándo ese acceso
 * es la sección actual, para resaltarlo.
 *
 * El de Cargas cubre el listado y el detalle (`/cargas`, `/cargas/:id`,
 * `/cargas/:id/editar`), pero no `/cargas/nueva`: esa tiene su propio acceso
 * ("Nueva carga") y no tendría sentido resaltar los dos a la vez.
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
    activo: (ruta) => ruta === '/cargas' || (ruta.startsWith('/cargas/') && ruta !== '/cargas/nueva'),
  },
  {
    to: '/cargas/nueva',
    texto: 'Nueva carga',
    Icono: IconoCajaMas,
    activo: (ruta) => ruta === '/cargas/nueva',
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
 * Antes cada pantalla copiaba su propia barra con la marca sola. Se junta acá
 * para que la navegación y las notificaciones aparezcan en todas, en el panel
 * del administrador y en el del camionero, sin repetir el acceso en cada una.
 * Los estilos base de la barra (`.us-navbar`) siguen en `pages/Usuarios.css`,
 * donde nacieron.
 *
 * También muestra, debajo de la barra, el aviso de "sin permiso" que deja
 * `RutaProtegida` cuando redirige a un usuario que abrió una pantalla de otro
 * rol (HU 15). El aviso vive acá y no en cada pantalla porque todas las
 * pantallas con sesión ya incluyen esta barra, así que alcanza para que se
 * vea sin importar qué pantalla sea el destino.
 *
 * @returns {JSX.Element}
 */
export default function BarraSuperior() {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = usuarioActual();
  const accesos = !usuario ? [] : usuario.rol === 'administrador' ? ACCESOS_ADMINISTRADOR : ACCESOS_CAMIONERO;
  const avisoAcceso = location.state?.avisoAcceso;

  /**
   * Cierra la sesión y manda al login.
   *
   * Sólo borra la sesión guardada: no hay estado de autenticación propio en
   * React, cada pantalla lo lee de `usuarioActual()` al renderizar, así que
   * una vez borrada la sesión no hay nada más que "resetear". El `replace`
   * evita que "atrás" vuelva a una pantalla protegida; `RutaProtegida` de
   * todas formas la volvería a mandar al login, pero así ni se ve el salto.
   * El temporizador del contador de notificaciones (`IndicadorNotificaciones`)
   * se detiene solo: al navegar, ese componente se desmonta y limpia su
   * propio `setInterval`.
   */
  const salir = () => {
    cerrarSesion();
    navigate('/', { replace: true });
  };

  return (
    <>
      <nav className="us-navbar bs-barra" aria-label="Principal">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>

        {accesos.map(({ to, texto, Icono, activo }) => {
          const esActivo = activo(location.pathname);
          return (
            <Link
              key={to}
              to={to}
              className={`bs-enlace${esActivo ? ' bs-enlace--activo' : ''}`}
              aria-current={esActivo ? 'page' : undefined}
            >
              <Icono width={20} height={20} />
              {texto}
            </Link>
          );
        })}

        {usuario && <Link to={`/perfiles/${usuario.id}`} className={`bs-enlace${location.pathname === `/perfiles/${usuario.id}` ? ' bs-enlace--activo' : ''}`} aria-current={location.pathname === `/perfiles/${usuario.id}` ? 'page' : undefined}>
          <IconoUsuario width={20} height={20} />Mi perfil
        </Link>}
        {usuario && <IndicadorNotificaciones />}
        {usuario && (
          <button type="button" className="bs-enlace" onClick={salir}>
            <IconoCerrarSesion width={20} height={20} />
            Cerrar sesión
          </button>
        )}
      </nav>

      {avisoAcceso && (
        <p className="bs-aviso-acceso" role="alert">
          <IconoAlerta width={18} height={18} />
          {avisoAcceso}
        </p>
      )}
    </>
  );
}
