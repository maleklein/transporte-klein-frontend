import { Link } from 'react-router-dom';
import { IconoAjustes, IconoCamion, IconoGrafico } from './Iconos';
import IndicadorNotificaciones from './IndicadorNotificaciones';
import { usuarioActual } from '../api/sesion';
import './BarraSuperior.css';

/**
 * Barra superior de las pantallas con sesión: la marca, los accesos del
 * administrador al panel de métricas (HU 13) y a los parámetros operativos
 * (HU 10) y, a la derecha, el acceso a las notificaciones (HU 12).
 *
 * Antes cada pantalla copiaba su propia barra con la marca sola. Se junta acá
 * para que las notificaciones aparezcan en todas, en el panel del
 * administrador y en el del camionero, sin repetir el acceso en cada una.
 * Los estilos base de la barra (`.us-navbar`) siguen en `pages/Usuarios.css`,
 * donde nacieron.
 *
 * @returns {JSX.Element}
 */
export default function BarraSuperior() {
  const esAdministrador = usuarioActual()?.rol === 'administrador';

  return (
    <nav className="us-navbar bs-barra" aria-label="Principal">
      <IconoCamion width={28} height={28} />
      <span className="us-navbar__marca">Transporte Klein</span>
      {esAdministrador && (
        <Link to="/metricas" className="bs-enlace-metricas">
          <IconoGrafico width={20} height={20} />
          Métricas
        </Link>
      )}
      {esAdministrador && (
        <Link to="/parametros" className="bs-enlace-metricas">
          <IconoAjustes width={20} height={20} />
          Parámetros
        </Link>
      )}
      {usuarioActual() && <IndicadorNotificaciones />}
    </nav>
  );
}
