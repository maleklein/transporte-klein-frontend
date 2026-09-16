import { useEffect, useRef } from 'react';
import { IconoAlerta } from './Iconos';
import { evitarFoco } from '../utils/formulario';
import './DialogoConfirmacion.css';

/**
 * Diálogo de confirmación para acciones que no se pueden deshacer.
 *
 * Usa el `<dialog>` nativo del navegador en vez de armar un modal a mano:
 * eso ya trae el foco atrapado adentro, el cierre con Escape, el fondo
 * oscurecido y el rol de accesibilidad correcto, sin que haya que mantenerlo.
 *
 * El botón de confirmar arranca sin el foco puesto encima (lo toma el de
 * cancelar) para que un Enter de más no ejecute la acción sin querer.
 *
 * @param {object} props
 * @param {boolean} props.abierto - si el diálogo está visible.
 * @param {string} props.titulo - qué se está por hacer.
 * @param {string} props.mensaje - la explicación, incluida la advertencia de que no se puede deshacer.
 * @param {string} [props.textoConfirmar='Confirmar'] - texto del botón que ejecuta la acción.
 * @param {string} [props.textoCancelar='Volver'] - texto del botón que cierra sin hacer nada.
 * @param {boolean} [props.peligroso=false] - pinta el botón de confirmar en rojo.
 * @param {boolean} [props.ocupado=false] - deshabilita los botones mientras la acción está en curso.
 * @param {function} props.alConfirmar - se llama al confirmar.
 * @param {function} props.alCancelar - se llama al cerrar sin confirmar (botón, Escape o clic en el fondo).
 * @returns {JSX.Element}
 */
export default function DialogoConfirmacion({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Volver',
  peligroso = false,
  ocupado = false,
  alConfirmar,
  alCancelar,
}) {
  const refDialogo = useRef(null);

  // `showModal()` es lo que activa el comportamiento modal del navegador; no
  // alcanza con renderizar el elemento. Por eso se abre y cierra desde acá.
  useEffect(() => {
    const dialogo = refDialogo.current;
    if (!dialogo) return;

    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={refDialogo}
      className="dg-dialogo"
      // El navegador dispara "cancel" con Escape. Se intercepta para avisarle
      // al padre, que es quien maneja el estado de abierto/cerrado.
      onCancel={(evento) => {
        evento.preventDefault();
        if (!ocupado) alCancelar();
      }}
      // Clic en el fondo oscurecido: el target es el propio <dialog> sólo
      // cuando se hizo clic afuera de su contenido.
      onClick={(evento) => {
        if (evento.target === refDialogo.current && !ocupado) alCancelar();
      }}
    >
      <div className="dg-contenido">
        <h2 className="dg-titulo">
          {peligroso && <IconoAlerta width={22} height={22} />}
          {titulo}
        </h2>

        <p className="dg-mensaje">{mensaje}</p>

        <div className="dg-acciones">
          <button
            type="button"
            className="ds-boton ds-boton--secundario"
            onClick={alCancelar}
            onMouseDown={evitarFoco}
            disabled={ocupado}
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            className={`ds-boton ${peligroso ? 'ds-boton--cancelar' : 'ds-boton--primario'}`}
            onClick={alConfirmar}
            onMouseDown={evitarFoco}
            disabled={ocupado}
          >
            {ocupado ? 'Aplicando...' : textoConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
