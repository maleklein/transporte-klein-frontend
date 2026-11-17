import { tramosResaltados } from '../utils/buscarUsuarios';
import './TextoResaltado.css';

/**
 * Muestra un texto con las partes que coinciden con la búsqueda resaltadas
 * (HU 1.3): así se ve por qué apareció cada usuario en el listado.
 *
 * @param {object} props
 * @param {string} props.texto - lo que se muestra.
 * @param {string} props.busqueda - lo escrito en el campo de búsqueda.
 * @returns {JSX.Element}
 */
export default function TextoResaltado({ texto, busqueda }) {
  return (
    <>
      {tramosResaltados(texto, busqueda).map((tramo, i) =>
        tramo.coincide ? (
          <mark key={i} className="texto-resaltado">
            {tramo.texto}
          </mark>
        ) : (
          tramo.texto
        ),
      )}
    </>
  );
}
