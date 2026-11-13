import { Link, useLocation, useParams } from 'react-router-dom';
import BarraSuperior from '../components/BarraSuperior';
import ReputacionUsuario from '../components/ReputacionUsuario';
import { IconoFlechaAtras, IconoUsuario } from '../components/Iconos';
import { usuarioActual } from '../api/sesion';
import { destinoVolver } from '../utils/volver';
import './DetalleCarga.css';

/**
 * Perfil y reputación de un usuario (HU 11), en /perfiles/:id.
 *
 * El botón de volver aparece sólo si se llegó desde otra pantalla (por
 * ejemplo, la contraparte de un viaje): "Mi perfil" está en la barra superior
 * y desde ahí no hay a dónde volver.
 *
 * @returns {JSX.Element}
 */
export default function PerfilReputacion() {
  const { id } = useParams();
  const location = useLocation();
  const volver = destinoVolver(location, null);
  // "Mi perfil" cuando es el propio, como el botón de la barra; el de otro
  // (un administrador mirando a un camionero) sigue siendo "Perfil del usuario".
  const esPropio = String(usuarioActual()?.id) === String(id);
  return <>
    <BarraSuperior />
    <main className="dc-contenido">
      {volver && (
        <Link className="dc-volver" to={volver.ruta} state={volver.estado}>
          <IconoFlechaAtras />
          {volver.texto}
        </Link>
      )}
      <h1 className="ds-titulo-pagina pr-titulo">
        <IconoUsuario width={26} height={26} />
        {esPropio ? 'Mi perfil' : 'Perfil del usuario'}
      </h1>
      <ReputacionUsuario key={id} idUsuario={id} mostrarIdentidad />
    </main>
  </>;
}
