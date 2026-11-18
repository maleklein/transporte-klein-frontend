import { useEffect, useRef, useState } from 'react';
import BarraSuperior from './BarraSuperior';
import { IconoReintentar, IconoSinConexion } from './Iconos';
import './PantallaSinConexion.css';

/**
 * Pantalla de "Sin conexión": reemplaza a una pantalla que no pudo cargar sus
 * datos porque no hay conexión con el sistema. Es la misma en todo el sistema,
 * como una página 404, y deja la barra superior para ir a otra sección o
 * cerrar sesión.
 *
 * El sistema sigue probando solo (`ControlConexion`); el botón Reintentar
 * prueba en el momento.
 *
 * @param {object} props
 * @param {number|null} props.proximoIntento - timestamp del próximo intento automático.
 * @param {boolean} props.probando - true mientras se está probando si volvió.
 * @param {function} props.alReintentar - prueba en el momento.
 * @returns {JSX.Element}
 */
export default function PantallaSinConexion({ proximoIntento, probando, alReintentar }) {
  const segundos = useSegundosHasta(proximoIntento);
  const titulo = useRef(null);

  // El foco va al título, para que un lector de pantalla lo anuncie y el
  // teclado arranque desde acá.
  useEffect(() => {
    titulo.current?.focus();
  }, []);

  let estado = '';
  if (probando) estado = 'Intentando conectar…';
  else if (segundos > 0) estado = `Intentando de nuevo en ${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}…`;

  return (
    <>
      <BarraSuperior />
      <main className="psc-contenido">
        <section className="psc-pantalla" aria-labelledby="psc-titulo">
          <div className="psc-icono">
            <IconoSinConexion width={60} height={60} strokeWidth={1.8} />
          </div>
          <p className="psc-antetitulo">Sin conexión</p>
          <h1 className="psc-titulo" id="psc-titulo" tabIndex={-1} ref={titulo}>
            No se pudo conectar con el sistema
          </h1>
          <p className="psc-texto">
            Puede que se haya cortado internet o que el sistema no esté respondiendo. Revisá tu conexión y volvé a
            intentar.
          </p>
          <p className="psc-estado">
            {estado && <span className="ds-ruedita" aria-hidden="true" />}
            {estado}
          </p>
          <button type="button" className="ds-boton ds-boton--primario" onClick={alReintentar} disabled={probando}>
            <IconoReintentar />
            Reintentar
          </button>
        </section>
      </main>
    </>
  );
}

/**
 * Segundos que faltan hasta `momento`, actualizados cada segundo.
 *
 * @param {number|null} momento - timestamp.
 * @returns {number} los segundos, redondeados para arriba; 0 si ya pasó o no hay.
 */
function useSegundosHasta(momento) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!momento) return undefined;
    setAhora(Date.now());
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [momento]);

  return momento ? Math.max(0, Math.ceil((momento - ahora) / 1000)) : 0;
}
