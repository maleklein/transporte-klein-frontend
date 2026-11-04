/**
 * Handler de `onMouseDown` para los botones del pie de un formulario.
 *
 * Evita que el botón tome el foco al apretarlo. Sin esto, apretar el botón
 * saca el foco del campo que lo tenía, ese campo dispara su `onBlur`, aparece
 * su mensaje de error y todo lo que está debajo baja ~29px. Como el corrimiento
 * pasa entre el `mousedown` y el `mouseup`, el `mouseup` cae fuera del botón,
 * el navegador no genera el `click` y el primer intento de enviar no hace nada:
 * el usuario tiene que apretar dos veces.
 *
 * Sólo cambia el comportamiento del mouse. La navegación por teclado (Tab +
 * Enter/Espacio) no pasa por acá y sigue funcionando igual.
 *
 * @param {import('react').MouseEvent} evento
 * @returns {void}
 */
export function evitarFoco(evento) {
  evento.preventDefault();
}
