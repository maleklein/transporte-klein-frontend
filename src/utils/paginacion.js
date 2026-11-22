/**
 * Paginación de los listados (cargas y usuarios): de a cuántos se muestran,
 * cómo se lee la página de la URL y qué rango se está viendo.
 */

/**
 * Elementos por página. Es el mismo número en la computadora y en el celular:
 * la página va en la URL (`?pagina=3`) y, con tamaños distintos, un link a la
 * página 3 mostraría cosas distintas en cada uno. En la computadora son una o
 * dos pantallas de tabla; en el celular, unas tres o cuatro de lista. Es el
 * mismo tamaño que el de las notificaciones y el que usa el backend para
 * `GET /cargas?pagina=N`.
 */
export const POR_PAGINA = 20;

/**
 * Página pedida en la URL. Cualquier cosa que no sea un entero mayor que 0
 * (vacío, "0", "dos", "1.5") es la primera.
 *
 * @param {URLSearchParams} parametros
 * @returns {number}
 */
export function paginaDeUrl(parametros) {
  const valor = parametros.get('pagina');
  const numero = Number(valor);
  return valor && Number.isInteger(numero) && numero > 0 ? numero : 1;
}

/**
 * Cuántas páginas hacen falta. Sin elementos hay igual una (vacía), así
 * "Página 1 de 1" nunca dice "de 0".
 *
 * @param {number} total
 * @param {number} [porPagina]
 * @returns {number}
 */
export function cantidadDePaginas(total, porPagina = POR_PAGINA) {
  return Math.max(1, Math.ceil(total / porPagina));
}

/**
 * Qué elementos se ven en una página, contando desde 1 ("21–40 de 86").
 *
 * @param {number} pagina
 * @param {number} total
 * @param {number} [porPagina]
 * @returns {{ desde: number, hasta: number }} con `desde` 0 si no hay ninguno.
 */
export function rangoDePagina(pagina, total, porPagina = POR_PAGINA) {
  if (total === 0) return { desde: 0, hasta: 0 };
  const desde = (pagina - 1) * porPagina + 1;
  return { desde, hasta: Math.min(pagina * porPagina, total) };
}

/**
 * Los elementos de una página, para paginar en el navegador una lista que ya
 * se tiene entera (usuarios).
 *
 * @template T
 * @param {T[]} lista
 * @param {number} pagina
 * @param {number} [porPagina]
 * @returns {T[]}
 */
export function elementosDePagina(lista, pagina, porPagina = POR_PAGINA) {
  return lista.slice((pagina - 1) * porPagina, pagina * porPagina);
}

/**
 * En qué página está el elemento de la posición `indice` (desde 0). Sirve
 * para ir a la página del usuario recién creado.
 *
 * @param {number} indice
 * @param {number} [porPagina]
 * @returns {number}
 */
export function paginaDeIndice(indice, porPagina = POR_PAGINA) {
  return Math.floor(indice / porPagina) + 1;
}
