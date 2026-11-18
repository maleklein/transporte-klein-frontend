/**
 * Búsqueda de usuarios por nombre, apellido, DNI o email desde un solo campo
 * (HU 1.3).
 *
 * Lo escrito se separa en palabras y cada una tiene que aparecer en el
 * nombre, el apellido, el DNI o el email del usuario, en cualquier orden: "gauto carlos"
 * encuentra a Carlos Gauto y "carla 123" a Carla Romero si su DNI tiene 123.
 * No distingue mayúsculas ni tildes, y a un DNI escrito con puntos
 * ("46.604.678") se le sacan los puntos antes de buscar.
 */

/**
 * Texto en minúscula y sin acentos. No recorta espacios.
 *
 * @param {unknown} texto
 * @returns {string}
 */
const simplificar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Texto en minúscula y sin acentos, para buscar sin importar cómo se escribió:
 * "jose" encuentra a "José".
 *
 * @param {unknown} texto
 * @returns {string}
 */
export const normalizarBusqueda = (texto) => simplificar(texto).trim();

/**
 * Separa la búsqueda en palabras ya normalizadas. Una palabra hecha solo de
 * dígitos y puntos se toma como DNI y pierde los puntos.
 *
 * @param {string} busqueda
 * @returns {string[]}
 */
const palabrasDeBusqueda = (busqueda) =>
  normalizarBusqueda(busqueda)
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra) => (/^[\d.]+$/.test(palabra) ? palabra.replaceAll('.', '') : palabra))
    .filter(Boolean);

/**
 * Si un usuario coincide con lo escrito en el campo de búsqueda. Con el campo
 * vacío, coinciden todos.
 *
 * @param {{ nombre?: string, apellido?: string, dni?: string|number, email?: string }} usuario
 * @param {string} busqueda
 * @returns {boolean}
 */
export const coincideBusqueda = (usuario, busqueda) => {
  const palabras = palabrasDeBusqueda(busqueda);
  if (palabras.length === 0) return true;

  // Separados por espacios: como las palabras buscadas no tienen espacios,
  // una no puede coincidir con el final del apellido y el principio del DNI.
  const datos = normalizarBusqueda(
    `${usuario.nombre ?? ''} ${usuario.apellido ?? ''} ${usuario.dni ?? ''} ${usuario.email ?? ''}`,
  );
  return palabras.every((palabra) => datos.includes(palabra));
};

/**
 * Si la búsqueda encontró al usuario por su DNI o su email y no sólo por el
 * nombre, cuál de los dos. La lista del celular muestra nombre y rol, no el DNI
 * ni el email: con esto agrega el dato que coincidió, para que se vea por qué
 * apareció ese usuario.
 *
 * @param {{ nombre?: string, apellido?: string, dni?: string|number, email?: string }} usuario
 * @param {string} busqueda
 * @returns {'dni'|'email'|null} `null` si no hay búsqueda o alcanza con el nombre.
 */
export const datoQueCoincide = (usuario, busqueda) => {
  const nombre = normalizarBusqueda(`${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`);
  const resto = palabrasDeBusqueda(busqueda).filter((palabra) => !nombre.includes(palabra));
  if (resto.length === 0) return null;
  if (resto.some((palabra) => normalizarBusqueda(usuario.dni).includes(palabra))) return 'dni';
  if (resto.some((palabra) => normalizarBusqueda(usuario.email).includes(palabra))) return 'email';
  return null;
};

const PLURAL_ROL = { administrador: 'administradores', camionero: 'camioneros' };
const PLURAL_ESTADO = { activo: 'activos', inactivo: 'inactivos' };

/**
 * Qué decir cuando el listado queda vacío por la búsqueda o los filtros
 * (HU 1.3). Distingue tres casos:
 *
 * - La búsqueda no coincide con nadie, aunque se saquen Rol y Estado: el
 *   problema es lo escrito.
 * - La búsqueda coincide con alguien, pero Rol o Estado lo dejan afuera: lo
 *   dice, con cuántos hay si se sacan esos filtros.
 * - No hay búsqueda y Rol y Estado juntos no dejan a nadie.
 *
 * @param {object} datos
 * @param {string} datos.busqueda - lo escrito, ya recortado.
 * @param {string} datos.rol - 'administrador', 'camionero' o ''.
 * @param {string} datos.estado - 'activo', 'inactivo' o ''.
 * @param {number} datos.coincidenSinFiltros - cuántos coinciden con la búsqueda sin Rol ni Estado.
 * @returns {{ titulo: string, ayuda: string }}
 */
export const avisoSinResultados = ({ busqueda, rol, estado, coincidenSinFiltros }) => {
  // "camioneros inactivos", "administradores", "usuarios activos"...
  const quienes = [PLURAL_ROL[rol] ?? 'usuarios', PLURAL_ESTADO[estado]].filter(Boolean).join(' ');
  const conBusqueda = `que coincidan con “${busqueda}”`;

  if (busqueda && coincidenSinFiltros > 0 && (rol || estado)) {
    const filtros = rol && estado ? 'los filtros de rol y estado' : `el filtro de ${rol ? 'rol' : 'estado'}`;
    const cuantos =
      coincidenSinFiltros === 1 ? 'hay 1 usuario que coincide' : `hay ${coincidenSinFiltros} usuarios que coinciden`;
    return {
      titulo: `No hay ${quienes} ${conBusqueda}.`,
      ayuda: `Si sacás ${filtros}, ${cuantos}.`,
    };
  }

  if (busqueda) {
    return {
      titulo: `No hay usuarios ${conBusqueda}.`,
      ayuda: 'Revisá cómo está escrito o buscá por una parte del nombre, del apellido, del DNI o del email.',
    };
  }

  return {
    titulo: `No hay ${quienes}.`,
    ayuda: `Probá con otro ${[rol && 'rol', estado && 'estado'].filter(Boolean).join(' o ')}.`,
  };
};

/**
 * Parte un texto en tramos, marcando los que coinciden con alguna palabra de
 * la búsqueda, para resaltarlos en el listado: con "carla 123", en "Carla
 * Romero" se marca "Carla" y en "31234567", "123". Compara sin mayúsculas ni
 * tildes, pero devuelve el texto original ("gomez" marca "Gómez").
 *
 * @param {unknown} texto - lo que se muestra (nombre y apellido, el DNI con puntos o el email).
 * @param {string} busqueda - lo escrito en el campo de búsqueda.
 * @returns {{ texto: string, coincide: boolean }[]} los tramos en orden; juntos forman el texto.
 */
export const tramosResaltados = (texto, busqueda) => {
  const original = String(texto ?? '');
  const palabras = palabrasDeBusqueda(busqueda);
  if (!original || palabras.length === 0) return [{ texto: original, coincide: false }];

  // Se simplifica letra por letra para saber de qué letra del original viene
  // cada letra del texto simplificado ("é" pasa a "e" y sigue en su lugar).
  // Los puntos entre dígitos se saltean: el DNI se muestra como "45.168.258"
  // y la búsqueda "45168" tiene que encontrarlo.
  const esPuntoDeMiles = (i) => original[i] === '.' && /\d/.test(original[i - 1] ?? '') && /\d/.test(original[i + 1] ?? '');
  let simplificado = '';
  const origen = [];
  for (let i = 0; i < original.length; i += 1) {
    if (esPuntoDeMiles(i)) continue;
    for (const letra of simplificar(original[i])) {
      simplificado += letra;
      origen.push(i);
    }
  }

  const marcadas = new Array(original.length).fill(false);
  for (const palabra of palabras) {
    let desde = simplificado.indexOf(palabra);
    while (desde !== -1) {
      for (let k = desde; k < desde + palabra.length; k += 1) marcadas[origen[k]] = true;
      desde = simplificado.indexOf(palabra, desde + 1);
    }
  }
  // Un punto de miles en medio de lo marcado también se marca ("45.168").
  for (let i = 0; i < original.length; i += 1) {
    if (esPuntoDeMiles(i) && marcadas[i - 1] && marcadas[i + 1]) marcadas[i] = true;
  }

  const tramos = [];
  for (let i = 0; i < original.length; i += 1) {
    const ultimo = tramos.at(-1);
    if (ultimo && ultimo.coincide === marcadas[i]) ultimo.texto += original[i];
    else tramos.push({ texto: original[i], coincide: marcadas[i] });
  }
  return tramos;
};
