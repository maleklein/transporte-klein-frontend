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
 * Lo que se deja escribir en el campo DNI: números, y puntos o espacios si la
 * persona los pone (el número se escribe de muchas maneras, y el campo acepta
 * todas). Lo demás se descarta. Los puntos no se agregan mientras se escribe:
 * como el DNI tiene 7 u 8 dígitos, agrupar mientras se escribe los corría de
 * lugar con cada número nuevo. Se agregan al salir del campo (`formatearDni`).
 *
 * @param {string} texto - lo que quedó escrito en el campo.
 * @returns {{ texto: string, digitos: string }} lo que se muestra y lo que se guarda.
 */
export function entradaDni(texto) {
  const permitido = String(texto ?? '').replace(/[^\d. ]/g, '');
  return { texto: permitido, digitos: permitido.replace(/\D/g, '') };
}
