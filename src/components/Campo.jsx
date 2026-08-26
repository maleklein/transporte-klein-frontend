import { IconoAlerta } from './Iconos';

/**
 * Campo de formulario reutilizable (label + input + mensaje de error).
 * Se define fuera de los componentes de página a propósito: si estuviera adentro,
 * React lo volvería a montar en cada tecla y el input perdería el foco.
 *
 * @param {object} props
 * @param {string} props.id - id del input, usado también para asociar label/error.
 * @param {string} props.etiqueta - texto del label.
 * @param {string} [props.error] - mensaje de error a mostrar, si hay.
 * @param {boolean} [props.obligatorio=true] - si se marca el campo como obligatorio.
 * @param {function} [props.children] - render prop `({id, idError, tieneError}) => JSX`
 *   para reemplazar el `<input>` por un control distinto (ej: `<select>`, `<textarea>`).
 * @param {import('react').Ref} [props.refInput] - ref a reenviar al `<input>`.
 * @param {object} propsInput - resto de props que se pasan directo al `<input>`.
 * @returns {JSX.Element}
 */
export default function Campo({
  id,
  etiqueta,
  error,
  obligatorio = true,
  children,
  refInput,
  ...propsInput
}) {
  // Id del mensaje de error, para que el input lo referencie con aria-describedby
  // y el lector de pantalla lo lea junto con el campo.
  const idError = `${id}-error`;

  return (
    <div className="ds-campo">
      {/* El label va siempre arriba del campo, no como placeholder */}
      <label className="ds-campo__label" htmlFor={id}>
        {etiqueta}
        {obligatorio && (
          <span className="ds-campo__obligatorio" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children ? (
        children({ id, idError, tieneError: Boolean(error) })
      ) : (
        <input
          id={id}
          ref={refInput}
          className={`ds-campo__input${error ? ' ds-campo__input--error' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? idError : undefined}
          {...propsInput}
        />
      )}

      {error && (
        <span className="ds-campo__error" id={idError} role="alert">
          <IconoAlerta />
          {error}
        </span>
      )}
    </div>
  );
}
