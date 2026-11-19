import { IconoCerrar } from './Iconos';

/**
 * La × que quita un filtro aplicado, dentro de su campo, a la derecha.
 *
 * Va como hermana del campo y no adentro: un `<button>` dentro de otro (el
 * campo "Creada" y el de fecha son botones) es HTML inválido y se rompe con el
 * teclado. El contenedor de los dos lleva `ds-filtro-control`, que la ubica.
 *
 * Al quitar el filtro la × desaparece: `alQuitar` tiene que devolverle el
 * foco al campo, para no dejarlo en la nada y que se pueda seguir con el
 * teclado.
 *
 * @param {object} props
 * @param {string} props.etiqueta - nombre del filtro, para el lector de pantalla ("Rol" → "Quitar filtro Rol").
 * @param {function(): void} props.alQuitar - deja el filtro en blanco y enfoca el campo.
 * @param {string} [props.textoLector] - lo que lee el lector de pantalla, si no es un filtro ("Quitar fecha de retiro").
 * @returns {JSX.Element}
 */
export default function BotonQuitarFiltro({ etiqueta, alQuitar, textoLector }) {
  return (
    <button
      type="button"
      className="ds-boton-en-campo"
      // Sólo para el lector de pantalla: sin `title`, para que al pasar el
      // mouse no aparezca un cartel ("Quitar filtro Estado"). La × se entiende sola.
      aria-label={textoLector ?? `Quitar filtro ${etiqueta}`}
      // Que el clic no le saque el foco al campo: si es un desplegable abierto,
      // se cerraría por el blur antes de que llegue el clic.
      onMouseDown={(evento) => evento.preventDefault()}
      onClick={alQuitar}
    >
      <IconoCerrar width={20} height={20} />
    </button>
  );
}
