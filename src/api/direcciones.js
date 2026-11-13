/**
 * Sugerencias de calles y direcciones para el campo "Dirección" de una carga,
 * tomadas de la API georef del gobierno (datos.gob.ar).
 *
 * A diferencia de provincias y localidades (`geografia.js`), esto no pasa por
 * nuestro backend ni se guarda un catálogo: son cientos de miles de calles, y
 * la dirección es texto libre que no se valida contra nada. georef sólo ayuda a
 * escribirla. Si no responde, tarda o no encuentra nada, devuelve una lista
 * vacía y el campo sigue funcionando a mano.
 *
 * Los ids de localidad del sistema son los de las localidades censales de
 * georef (ocho dígitos), así que sirven tal cual para filtrar.
 */

const URL_GEOREF = 'https://apis.datos.gob.ar/georef/api';

/** Si georef no contesta en este tiempo, se sigue sin sugerencias. */
const ESPERA_MAXIMA_MS = 4000;

/** Cuántas sugerencias se piden como máximo. */
const MAXIMO = 8;

/**
 * Pasa a formato de título el texto que devuelve georef, que viene todo en
 * mayúsculas ("AV PELLEGRINI" → "Av Pellegrini"). Las abreviaturas de una
 * letra con punto ("J.B. JUSTO") quedan legibles igual.
 *
 * @param {string} texto
 * @returns {string}
 */
export function formatoTitulo(texto) {
  return String(texto ?? '')
    .toLocaleLowerCase('es-AR')
    .replace(/(^|[\s.(-])(\p{L})/gu, (_, antes, letra) => antes + letra.toLocaleUpperCase('es-AR'));
}

/**
 * Pide a georef y devuelve el JSON, o null ante cualquier problema.
 *
 * @param {string} ruta - ruta con su query string, ej '/calles?nombre=san'.
 * @param {AbortSignal} [signal] - para cancelar si el usuario sigue escribiendo.
 * @returns {Promise<object|null>}
 */
async function pedirGeoref(ruta, signal) {
  const limite = AbortSignal.timeout(ESPERA_MAXIMA_MS);
  // AbortSignal.any falta en navegadores viejos: ahí sólo corta el tiempo máximo.
  const senal = signal && AbortSignal.any ? AbortSignal.any([signal, limite]) : limite;
  try {
    const respuesta = await fetch(`${URL_GEOREF}${ruta}`, { signal: senal });
    if (!respuesta.ok) return null;
    return await respuesta.json();
  } catch (error) {
    // Lo cancelamos nosotros porque el usuario siguió escribiendo: que lo
    // sepa quien llamó, para no pisar la lista con un resultado viejo.
    if (signal?.aborted) throw error;
    return null;
  }
}

/**
 * Sugerencias para lo que va escribiendo el usuario en una localidad.
 *
 * Si el texto ya trae un número ("pellegrini 1200") busca direcciones
 * completas, con la altura; si no, sólo calles, para que elija una y siga
 * con el número.
 *
 * @param {string} texto - lo escrito en el campo.
 * @param {string} idLocalidad - id de la localidad elegida (ocho dígitos).
 * @param {object} [opciones]
 * @param {AbortSignal} [opciones.signal]
 * @returns {Promise<Array<{texto: string, esCalle: boolean}>>} vacío si no hay o si georef no respondió.
 * @throws {DOMException} `AbortError` sólo si lo canceló `signal`.
 */
export async function sugerirDirecciones(texto, idLocalidad, { signal } = {}) {
  const consulta = texto.trim();
  if (consulta.length < 3 || !/^\d{8}$/.test(idLocalidad ?? '')) return [];

  const params = new URLSearchParams({ localidad_censal: idLocalidad, max: String(MAXIMO) });

  if (/\d/.test(consulta)) {
    params.set('direccion', consulta);
    const cuerpo = await pedirGeoref(`/direcciones?${params}`, signal);
    return (cuerpo?.direcciones ?? [])
      .filter((direccion) => direccion.calle?.nombre)
      .map((direccion) => ({
        texto: formatoTitulo(
          [direccion.calle.nombre, direccion.altura?.valor].filter(Boolean).join(' '),
        ),
        esCalle: false,
      }));
  }

  params.set('nombre', consulta);
  params.set('campos', 'nombre');
  const cuerpo = await pedirGeoref(`/calles?${params}`, signal);
  return (cuerpo?.calles ?? []).map((calle) => ({ texto: formatoTitulo(calle.nombre), esCalle: true }));
}
