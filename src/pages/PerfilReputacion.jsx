import { useLocation, useParams } from 'react-router-dom';
import BarraSuperior from '../components/BarraSuperior';
import MigasDePan from '../components/MigasDePan';
import ReputacionUsuario from '../components/ReputacionUsuario';
import { IconoUsuario } from '../components/Iconos';
import { usuarioActual } from '../api/sesion';
import { destinoVolver } from '../utils/volver';
import './DetalleCarga.css';

/**
 * Perfil y reputación de un usuario (HU 11), en /perfiles/:id.
 *
 * Las migas muestran desde dónde se llegó (por ejemplo, Inicio › Cargas ›
 * Carga #29 › Perfil del usuario, desde la contraparte de un viaje). Desde
 * "Mi perfil" de la barra superior quedan en Inicio › Mi perfil.
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
    <BarraSuperior volver={volver} />
    <main className="dc-contenido">
      <MigasDePan volver={volver} actual={esPropio ? 'Mi perfil' : 'Perfil del usuario'} />
      <h1 className="ds-titulo-pagina pr-titulo">
        <IconoUsuario width={26} height={26} />
        {esPropio ? 'Mi perfil' : 'Perfil del usuario'}
      </h1>
      <ReputacionUsuario key={id} idUsuario={id} mostrarIdentidad />
    </main>
  </>;
}
