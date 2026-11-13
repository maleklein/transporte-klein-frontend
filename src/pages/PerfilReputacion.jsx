import { Link, useParams } from 'react-router-dom';
import BarraSuperior from '../components/BarraSuperior';
import ReputacionUsuario from '../components/ReputacionUsuario';
import { IconoFlechaAtras, IconoUsuario } from '../components/Iconos';
import { rutaInicio, usuarioActual } from '../api/sesion';
import './DetalleCarga.css';

export default function PerfilReputacion() {
  const { id } = useParams();
  // "Mi perfil" cuando es el propio, como el botón de la barra; el de otro
  // (un administrador mirando a un camionero) sigue siendo "Perfil del usuario".
  const esPropio = String(usuarioActual()?.id) === String(id);
  return <>
    <BarraSuperior />
    <main className="dc-contenido">
      <Link className="dc-volver" to={rutaInicio(usuarioActual()?.rol)}><IconoFlechaAtras />Volver al inicio</Link>
      <h1 className="ds-titulo-pagina pr-titulo">
        <IconoUsuario width={26} height={26} />
        {esPropio ? 'Mi perfil' : 'Perfil del usuario'}
      </h1>
      <ReputacionUsuario key={id} idUsuario={id} mostrarIdentidad />
    </main>
  </>;
}
