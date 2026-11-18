/**
 * Cómo se muestran los datos de un usuario.
 */

/**
 * El DNI con puntos de miles, como se escribe en la Argentina: 45168258 →
 * "45.168.258". Si fuera más largo se separa igual, como cualquier número
 * (1000000000 → "1.000.000.000").
 *
 * Sólo para mostrar: el DNI se guarda y se envía sin puntos. Si no son todos
 * números (no debería pasar), se devuelve tal cual.
 *
 * @param {string|number|null|undefined} dni
 * @returns {string}
 */
export function formatearDni(dni) {
  const texto = String(dni ?? '').trim();
  if (!/^\d+$/.test(texto)) return texto;
  return texto.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * La posición del cursor justo después de los primeros `cantidad` dígitos de
 * un texto con puntos: en "45.168.258", después de 3 dígitos es la 4 ("45.1|").
 *
 * @param {string} texto
 * @param {number} cantidad
 * @returns {number}
 */
function posicionTrasDigitos(texto, cantidad) {
  if (cantidad <= 0) return 0;
  let vistos = 0;
  for (let i = 0; i < texto.length; i += 1) {
    if (/\d/.test(texto[i])) vistos += 1;
    if (vistos === cantidad) return i + 1;
  }
  return texto.length;
}

/**
 * Lo que queda en el campo DNI después de que el usuario escribe, pega o
 * borra: el campo muestra el DNI con puntos ("45.168.258") mientras se
 * escribe, pero se guarda sólo con los dígitos.
 *
 * - Todo lo que no es un dígito se descarta (los puntos se vuelven a poner).
 * - El cursor queda después del mismo dígito que antes, aunque se agreguen o
 *   saquen puntos: no salta al final.
 * - Borrar sólo un punto (Backspace justo después de él, o Supr justo antes)
 *   borra el dígito de al lado; si no, el punto volvería a aparecer y parecería
 *   que la tecla no hace nada.
 *
 * @param {object} edicion
 * @param {string} edicion.texto - lo que quedó escrito en el campo (`input.value`).
 * @param {number} edicion.cursor - dónde quedó el cursor (`input.selectionStart`).
 * @param {string} edicion.digitosPrevios - el DNI que había antes, sólo dígitos.
 * @param {string} [edicion.tipo] - `inputType` del evento (`deleteContentBackward`, `deleteContentForward`...).
 * @returns {{ digitos: string, texto: string, cursor: number }} lo que se guarda, lo que se muestra y dónde va el cursor.
 */
export function editarDni({ texto, cursor, digitosPrevios, tipo }) {
  let digitos = texto.replace(/\D/g, '');
  let digitosAntes = texto.slice(0, cursor).replace(/\D/g, '').length;

  const borroSoloUnPunto = digitos === digitosPrevios && texto.length < formatearDni(digitosPrevios).length;
  if (borroSoloUnPunto && tipo === 'deleteContentBackward' && digitosAntes > 0) {
    digitos = digitos.slice(0, digitosAntes - 1) + digitos.slice(digitosAntes);
    digitosAntes -= 1;
  } else if (borroSoloUnPunto && tipo === 'deleteContentForward') {
    digitos = digitos.slice(0, digitosAntes) + digitos.slice(digitosAntes + 1);
  }

  const formateado = formatearDni(digitos);
  return { digitos, texto: formateado, cursor: posicionTrasDigitos(formateado, digitosAntes) };
}
