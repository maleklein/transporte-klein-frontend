import { useState } from 'react';
import Campo from './Campo';
import { entradaDni, formatearDni } from '../utils/formatoUsuario';

/**
 * Campo de DNI: mientras se escribe muestra exactamente lo que se tipea, y al
 * salir del campo lo muestra con puntos ("45.168.258"). Siempre entrega sólo
 * los dígitos ("45168258"), que es como se guarda.
 *
 * Antes ponía los puntos mientras se escribía, pero como el DNI tiene 7 u 8
 * dígitos se agrupaban desde la derecha y cambiaban de lugar con cada número
 * nuevo (1.234 → 12.345 → 123.456), y confundía. Las guías de formularios
 * (USWDS, NHS, Agesic) formatean en vivo sólo los números de largo fijo, y
 * coinciden en aceptar el número con o sin separadores: si la persona escribe
 * los puntos, se aceptan.
 *
 * Al entrar al campo se ve lo mismo que antes de entrar (con puntos, si ya
 * tenía un DNI), para que nada se mueva al tocarlo.
 *
 * @param {object} props - las mismas de `Campo`, salvo `value` y `onChange`.
 * @param {string} props.value - el DNI, sólo dígitos.
 * @param {function(string): void} props.onCambio - recibe el DNI nuevo, sólo dígitos.
 * @param {function} [props.onFocus]
 * @param {function} [props.onBlur]
 * @returns {JSX.Element}
 */
export default function CampoDni({ value, onCambio, onFocus, onBlur, ...props }) {
  // Lo escrito mientras el campo tiene el foco; null cuando no lo tiene, y
  // entonces se muestra el DNI con puntos.
  const [texto, setTexto] = useState(null);

  return (
    <Campo
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={texto ?? formatearDni(value)}
      onFocus={(evento) => {
        setTexto(formatearDni(value));
        onFocus?.(evento);
      }}
      onChange={(evento) => {
        const entrada = entradaDni(evento.target.value);
        setTexto(entrada.texto);
        onCambio(entrada.digitos);
      }}
      onBlur={(evento) => {
        setTexto(null);
        onBlur?.(evento);
      }}
    />
  );
}
