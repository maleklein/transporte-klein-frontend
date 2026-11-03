import { Link, useParams } from 'react-router-dom';
import BarraSuperior from '../components/BarraSuperior';
import ReputacionUsuario from '../components/ReputacionUsuario';
import { IconoFlechaAtras } from '../components/Iconos';
import { rutaInicio, usuarioActual } from '../api/sesion';
import './DetalleCarga.css';

export default function PerfilReputacion() {
  const { id } = useParams();
  return <>
    <BarraSuperior />
    <main className="dc-contenido">
      <Link className="dc-volver" to={rutaInicio(usuarioActual()?.rol)}><IconoFlechaAtras />Volver al inicio</Link>
      <h1>Perfil del usuario</h1>
      <ReputacionUsuario key={id} idUsuario={id} mostrarIdentidad />
    </main>
  </>;
}
