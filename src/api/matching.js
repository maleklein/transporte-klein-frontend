import { ErrorDeApi } from './usuarios';
import { headersDeAuth, manejarNoAutorizado } from './sesion';
import { errorSinConexion, leerConReintentos } from './conexion';

const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** HU 5: solo consulta recomendaciones; la asignación conserva su endpoint. */
export async function obtenerSugeridos(idCarga, opciones = {}) {
  let respuesta;
  try {
    respuesta = await leerConReintentos(`${URL_API}/matching/${encodeURIComponent(idCarga)}`, {
      headers: { ...headersDeAuth() },
      signal: opciones.signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw errorSinConexion();
  }

  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    manejarNoAutorizado(respuesta.status, cuerpo);
    throw new ErrorDeApi(cuerpo?.message ?? 'No se pudieron obtener las sugerencias.', null, respuesta.status);
  }
  if (!Array.isArray(cuerpo?.sugeridos)) {
    throw new ErrorDeApi('El servidor devolvió sugerencias con un formato inesperado.', null, respuesta.status);
  }
  return cuerpo;
}
