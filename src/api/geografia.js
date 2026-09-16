/**
 * Capa de acceso al catálogo geográfico (provincias y localidades).
 *
 * Le pega a nuestro backend, no directamente a la API georef del gobierno.
 * El catálogo se siembra una vez del lado del servidor, así que la pantalla
 * funciona aunque datos.gob.ar esté caída, y lo que ofrece el selector es
 * exactamente lo que el backend va a aceptar: no puede haber una localidad
 * elegible que después rebote con un 400.
 */

import { ErrorDeApi } from './usuarios';
import { headersDeAuth, manejarNoAutorizado } from './sesion';

/** URL base del backend. Se puede pisar con la variable de entorno VITE_API_URL. */
const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Caché en memoria de lo ya pedido, para no volver a traer lo mismo.
 *
 * Guarda la promesa y no el resultado: si dos selectores piden las provincias
 * al mismo tiempo (origen y destino se montan juntos), los dos esperan el
 * mismo pedido en vez de disparar dos.
 *
 * El catálogo no cambia mientras dura una sesión, así que no hace falta
 * invalidarlo. Se pierde al recargar la página, que es lo correcto.
 */
const cacheProvincias = { promesa: null };
const cacheLocalidades = new Map();

/**
 * Hace un GET al backend y devuelve el arreglo, con el mismo manejo de errores
 * que el resto de la capa de API.
 *
 * @param {string} ruta - ruta relativa, ej '/provincias'.
 * @param {string} queFalló - qué decirle al usuario si el pedido no sale.
 * @returns {Promise<object[]>}
 * @throws {ErrorDeApi} si el backend falla o no hay conexión.
 */
async function pedirCatalogo(ruta, queFalló) {
    let respuesta;

    try {
        respuesta = await fetch(`${URL_API}${ruta}`, { headers: { ...headersDeAuth() } });
    } catch {
        throw new ErrorDeApi(
            'No se pudo conectar con el servidor. Verificá que el sistema esté encendido e intentá de nuevo.',
            null,
            0,
        );
    }

    let cuerpo = null;
    try {
        cuerpo = await respuesta.json();
    } catch {
        cuerpo = null;
    }

    if (!respuesta.ok) {
        // Un 401 significa que el token falta, venció o dejó de servir:
        // se limpia la sesión y se vuelve al login.
        manejarNoAutorizado(respuesta.status);
        throw new ErrorDeApi(cuerpo?.message ?? queFalló, null, respuesta.status);
    }

    return Array.isArray(cuerpo) ? cuerpo : [];
}

/**
 * GET /provincias — las 24 provincias, ordenadas por nombre.
 *
 * @returns {Promise<Array<{id: string, nombre: string}>>}
 * @throws {ErrorDeApi} si el backend falla o no hay conexión.
 */
export function listarProvincias() {
    if (!cacheProvincias.promesa) {
        cacheProvincias.promesa = pedirCatalogo(
            '/provincias',
            'No se pudo cargar la lista de provincias.',
        ).catch((error) => {
            // Si falla, se descarta la promesa para que el próximo intento
            // vuelva a pedir en vez de repetir el error para siempre.
            cacheProvincias.promesa = null;
            throw error;
        });
    }

    return cacheProvincias.promesa;
}

/**
 * GET /localidades?provincia=X — las localidades de una provincia, ordenadas
 * por nombre.
 *
 * Cada una trae su `departamento`, que hace falta para distinguir las que se
 * llaman igual dentro de la misma provincia (hay 68 casos en el país).
 *
 * @param {string} idProvincia - id de provincia de dos dígitos, ej '82'.
 * @returns {Promise<Array<{id: string, nombre: string, departamento: string|null}>>}
 * @throws {ErrorDeApi} si el backend falla o no hay conexión.
 */
export function listarLocalidades(idProvincia) {
    if (!idProvincia) return Promise.resolve([]);

    if (!cacheLocalidades.has(idProvincia)) {
        const promesa = pedirCatalogo(
            `/localidades?provincia=${encodeURIComponent(idProvincia)}`,
            'No se pudieron cargar las localidades de esa provincia.',
        ).catch((error) => {
            cacheLocalidades.delete(idProvincia);
            throw error;
        });

        cacheLocalidades.set(idProvincia, promesa);
    }

    return cacheLocalidades.get(idProvincia);
}
