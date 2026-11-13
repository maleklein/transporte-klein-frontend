/**
 * Agrupa avisos por antigüedad, para que el centro de notificaciones (HU 12)
 * no los muestre todos juntos en una sola lista.
 *
 * Los grupos se cuentan por día de calendario en la hora local, no por horas:
 * un aviso de anoche a las 23:50 es de "Ayer" aunque hayan pasado diez minutos.
 */

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Grupos en el orden en que se muestran. `hasta` es el último día (contando
 * desde hoy, que es 0) que entra en el grupo; el último no tiene tope.
 */
const GRUPOS = [
  { clave: 'hoy', titulo: 'Hoy', hasta: 0 },
  { clave: 'ayer', titulo: 'Ayer', hasta: 1 },
  { clave: 'semana', titulo: 'Últimos 7 días', hasta: 6 },
  { clave: 'mes', titulo: 'Últimos 30 días', hasta: 29 },
  { clave: 'anteriores', titulo: 'Anteriores', hasta: Infinity },
];

/**
 * Cuántos días de calendario hay entre la fecha y hoy.
 *
 * Se compara el comienzo de cada día y se redondea, así un cambio de horario
 * (un día de 23 o 25 horas) no corre a nadie de grupo. Una fecha que llega
 * "del futuro", por un reloj desfasado, cuenta como de hoy.
 *
 * @param {Date} fecha
 * @param {Date} ahora
 * @returns {number} 0 para hoy, 1 para ayer, y así.
 */
function diasAtras(fecha, ahora) {
  const inicioDe = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.round((inicioDe(ahora) - inicioDe(fecha)) / MS_POR_DIA));
}

/**
 * Reparte los elementos en Hoy, Ayer, Últimos 7 días, Últimos 30 días y
 * Anteriores. Respeta el orden en que llegan dentro de cada grupo y deja
 * afuera los grupos vacíos.
 *
 * @template T
 * @param {T[]} elementos - lo que se quiere agrupar, por ejemplo los avisos.
 * @param {(elemento: T) => string} fechaDe - devuelve la fecha ISO de cada uno.
 * @param {Date} [ahora] - el momento de referencia; se puede fijar para probar.
 * @returns {{ clave: string, titulo: string, elementos: T[] }[]}
 */
export function agruparPorFecha(elementos, fechaDe, ahora = new Date()) {
  const grupos = GRUPOS.map((grupo) => ({ clave: grupo.clave, titulo: grupo.titulo, elementos: [] }));

  for (const elemento of elementos) {
    const fecha = new Date(fechaDe(elemento));
    // Una fecha ilegible no se pierde: va al final, con las más viejas.
    const dias = Number.isNaN(fecha.getTime()) ? Infinity : diasAtras(fecha, ahora);
    const indice = GRUPOS.findIndex((grupo) => dias <= grupo.hasta);
    grupos[indice].elementos.push(elemento);
  }

  return grupos.filter((grupo) => grupo.elementos.length > 0);
}
