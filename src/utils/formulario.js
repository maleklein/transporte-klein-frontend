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

/**
 * Si dos juegos de valores de un formulario son distintos: lo que está escrito
 * contra lo que había al entrar. Compara campo por campo, con los valores como
 * texto, así un número escrito "1200" y uno guardado 1200 cuentan como iguales,
 * y un campo vacío es igual a uno que no está.
 *
 * Lo usa el aviso de salir sin guardar (`useAvisoSalirSinGuardar`).
 *
 * @param {object|null} actuales
 * @param {object|null} originales
 * @returns {boolean} false si falta alguno de los dos (todavía no se cargó el formulario).
 */
export function valoresCambiaron(actuales, originales) {
  if (!actuales || !originales) return false;
  const claves = new Set([...Object.keys(actuales), ...Object.keys(originales)]);
  return [...claves].some((clave) => String(actuales[clave] ?? '') !== String(originales[clave] ?? ''));
}
