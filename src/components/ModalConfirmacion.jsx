import { useEffect, useId, useRef } from 'react';
import { IconoAlerta } from './Iconos';
import { evitarFoco } from '../utils/formulario';
import './ModalConfirmacion.css';

/**
 * Diálogo modal de confirmación, genérico para cualquier acción que conviene
 * frenar con una pregunta antes de aplicarla (lo necesita HU 2.4, para
 * cancelar una carga desde el encabezado del detalle).
 *
 * Es el primer modal del proyecto: las confirmaciones que ya existían (HU 7,
 * dentro de `ProgresoCarga`) se resuelven en línea, a propósito, porque
 * taparían el mismo recorrido que el usuario necesita seguir viendo para
 * decidir. Acá la acción vive en el encabezado y no compite con nada que haga
 * falta mirar, así que un modal no esconde información relevante.
 *
 * El foco arranca en "Volver" y no en el botón de confirmar, mismo criterio
 * que ya usa `ProgresoCarga` para sus confirmaciones: un Enter de más no
 * debería ejecutar la acción peligrosa.
 *
 * @param {object} props
 * @param {boolean} props.abierto
 * @param {string} props.titulo
 * @param {string} props.detalle
 * @param {string} [props.error] - mensaje a mostrar dentro del modal (p.ej. un 409 del backend), sin cerrarlo.
 * @param {string} [props.textoConfirmar='Confirmar']
 * @param {string} [props.textoVolver='Volver']
 * @param {boolean} [props.aplicando=false] - deshabilita los botones y cambia el texto de "Confirmar" mientras se espera al backend.
 * @param {boolean} [props.peligroso=true] - si el botón de confirmar va en rojo lleno o con el estilo primario.
 * @param {function} props.alConfirmar
 * @param {function} props.alCancelar - cierra el modal sin aplicar nada (click en "Volver", Escape o click afuera).
 * @returns {JSX.Element|null}
 */
export default function ModalConfirmacion({
  abierto,
  titulo,
  detalle,
  error = '',
  textoConfirmar = 'Confirmar',
  textoVolver = 'Volver',
  aplicando = false,
  peligroso = true,
  alConfirmar,
  alCancelar,
}) {
  const idBase = useId();
  const refVolver = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    refVolver.current?.focus({ preventScroll: true });

    const alPresionarTecla = (evento) => {
      if (evento.key === 'Escape') alCancelar();
    };
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [abierto, alCancelar]);

  if (!abierto) return null;

  return (
    <div
      className="mc-fondo"
      onClick={(evento) => {
        // Sólo cuenta el click en el fondo mismo, no uno que burbujeó desde la caja.
        if (evento.target === evento.currentTarget) alCancelar();
      }}
    >
      <div
        className="mc-caja"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idBase}-titulo`}
        aria-describedby={`${idBase}-detalle`}
      >
        <h2 className="mc-caja__titulo" id={`${idBase}-titulo`}>
          {titulo}
        </h2>
        <p className="mc-caja__detalle" id={`${idBase}-detalle`}>
          {detalle}
        </p>

        {error && (
          <p className="mc-caja__error" role="alert">
            <IconoAlerta width={18} height={18} />
            {error}
          </p>
        )}

        <div className="mc-caja__acciones">
          <button
            type="button"
            className={`ds-boton ${peligroso ? 'mc-boton-peligro' : 'ds-boton--primario'}`}
            onClick={alConfirmar}
            onMouseDown={evitarFoco}
            disabled={aplicando}
          >
            {aplicando ? 'Aplicando...' : textoConfirmar}
          </button>
          <button
            type="button"
            className="ds-boton ds-boton--secundario"
            ref={refVolver}
            onClick={alCancelar}
            onMouseDown={evitarFoco}
            disabled={aplicando}
          >
            {textoVolver}
          </button>
        </div>
      </div>
    </div>
  );
}
