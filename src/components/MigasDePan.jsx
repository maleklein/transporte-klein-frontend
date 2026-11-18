import { Link } from 'react-router-dom';
import { IconoChevronDerecha } from './Iconos';
import { usuarioActual } from '../api/sesion';
import { migasDesde } from '../utils/volver';
import './MigasDePan.css';

/**
 * Migas de pan de la pantalla: dónde está el usuario (Inicio › Cargas ›
 * Carga #45) y un enlace a cada pantalla anterior. Reemplazan al botón
 * "Volver a …": además de volver un paso, dicen dónde se está y dejan saltar
 * más de uno.
 *
 * Sólo en la computadora: en el celular no entran, y ahí vuelve la flecha ‹
 * de la barra superior (por eso llevan `bs-volver-pantalla`).
 *
 * Las migas salen de la misma cadena que el botón de volver (`utils/volver`),
 * así que cada una devuelve el `state` con el que se había entrado a esa
 * pantalla: los filtros y la página de un listado se mantienen.
 *
 * @param {object} props
 * @param {{ ruta: string, texto: string, estado?: object|null } | null} props.volver - lo que devuelve `destinoVolver`.
 * @param {string} props.actual - el nombre de la pantalla actual ("Carga #45").
 * @returns {JSX.Element}
 */
export default function MigasDePan({ volver, actual }) {
  const migas = migasDesde(volver, usuarioActual()?.rol);

  return (
    <nav className="mp-migas bs-volver-pantalla" aria-label="Ruta">
      <ol className="mp-lista">
        {migas.map(({ ruta, nombre, estado }, indice) => (
          <li key={`${indice}-${ruta}`} className="mp-miga">
            <Link className="mp-enlace" to={ruta} state={estado}>
              {nombre}
            </Link>
            <IconoChevronDerecha className="mp-separador" width={16} height={16} aria-hidden="true" />
          </li>
        ))}
        <li className="mp-miga">
          <span className="mp-actual" aria-current="page">
            {actual}
          </span>
        </li>
      </ol>
    </nav>
  );
}
