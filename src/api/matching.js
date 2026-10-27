import { ErrorDeApi } from './usuarios';
import { headersDeAuth, manejarNoAutorizado } from './sesion';

const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** HU 5: solo consulta recomendaciones; la asignación conserva su endpoint. */
export async function obtenerSugeridos(idCarga, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}/matching/${encodeURIComponent(idCarga)}`, {
      headers: { ...headersDeAuth() },
      signal: opciones.signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ErrorDeApi('No se pudo conectar con el servidor para obtener sugerencias.', null, 0);
  }

  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    manejarNoAutorizado(respuesta.status);
    throw new ErrorDeApi(cuerpo?.message ?? 'No se pudieron obtener las sugerencias.', null, respuesta.status);
  }
  if (!Array.isArray(cuerpo?.sugeridos)) {
    throw new ErrorDeApi('El servidor devolvió sugerencias con un formato inesperado.', null, respuesta.status);
  }
  return cuerpo;
}
