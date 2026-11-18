import { useLayoutEffect, useRef } from 'react';
import Campo from './Campo';
import { editarDni, formatearDni } from '../utils/formatoUsuario';

/**
 * Campo de DNI que muestra los puntos mientras se escribe ("45.168.258"),
 * pero entrega sólo los dígitos ("45168258"), que es como se guarda.
 *
 * Al agregar o sacar puntos React reemplaza el texto del campo y el cursor
 * saltaría al final; por eso, después de cada cambio se lo vuelve a poner
 * después del mismo dígito (ver `editarDni`).
 *
 * @param {object} props - las mismas de `Campo`, salvo `value` y `onChange`.
 * @param {string} props.value - el DNI, sólo dígitos.
 * @param {function(string): void} props.onCambio - recibe el DNI nuevo, sólo dígitos.
 * @returns {JSX.Element}
 */
export default function CampoDni({ value, onCambio, ...props }) {
  const refInput = useRef(null);
  const cursorPendiente = useRef(null);

  // Después de cada render: si el último cambio dejó una posición de cursor, se aplica.
  useLayoutEffect(() => {
    const input = refInput.current;
    if (cursorPendiente.current !== null && input && document.activeElement === input) {
      input.setSelectionRange(cursorPendiente.current, cursorPendiente.current);
    }
    cursorPendiente.current = null;
  });

  const alCambiar = (evento) => {
    const input = evento.target;
    const edicion = editarDni({
      texto: input.value,
      cursor: input.selectionStart ?? input.value.length,
      digitosPrevios: value,
      tipo: evento.nativeEvent?.inputType,
    });
    cursorPendiente.current = edicion.cursor;
    onCambio(edicion.digitos);
  };

  return (
    <Campo
      {...props}
      refInput={refInput}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatearDni(value)}
      onChange={alCambiar}
    />
  );
}
