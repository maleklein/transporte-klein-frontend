import { IconoChevronDerecha, IconoChevronIzquierda } from './Iconos';
import './Paginacion.css';

/**
 * Anterior / "Página 2 de 5" / Siguiente, debajo de un listado (cargas y
 * usuarios). No se dibuja si todo entra en una página.
 *
 * Los botones están siempre en su lugar y se deshabilitan en la primera y en
 * la última página, igual que "Limpiar filtros": la barra no cambia de forma
 * al pasar de página y no se corre el botón que se estaba por volver a tocar.
 *
 * @param {object} props
 * @param {number} props.pagina - la página que se ve, desde 1.
 * @param {number} props.cantidad - cuántas páginas hay.
 * @param {(pagina: number) => void} props.alCambiar
 * @param {string} props.etiqueta - para el lector de pantalla ("Páginas del listado de cargas").
 * @param {boolean} [props.deshabilitada] - mientras se carga la página pedida.
 * @returns {JSX.Element|null}
 */
export default function Paginacion({ pagina, cantidad, alCambiar, etiqueta, deshabilitada = false }) {
  if (cantidad <= 1) return null;

  return (
    <nav className="ds-paginacion" aria-label={etiqueta}>
      <button
        type="button"
        className="ds-boton ds-boton--secundario"
        disabled={deshabilitada || pagina <= 1}
        onClick={() => alCambiar(pagina - 1)}
      >
        <IconoChevronIzquierda width={20} height={20} aria-hidden="true" />
        Anterior
      </button>
      <span className="ds-paginacion__pagina">
        Página {pagina} de {cantidad}
      </span>
      <button
        type="button"
        className="ds-boton ds-boton--secundario"
        disabled={deshabilitada || pagina >= cantidad}
        onClick={() => alCambiar(pagina + 1)}
      >
        Siguiente
        <IconoChevronDerecha width={20} height={20} aria-hidden="true" />
      </button>
    </nav>
  );
}
