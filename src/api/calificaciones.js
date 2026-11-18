import { headersDeAuth, manejarNoAutorizado } from './sesion';
import { ErrorDeApi } from './usuarios';
import { errorSinConexion, leerConReintentos } from './conexion';

const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
async function solicitar(ruta, opciones = {}) {
  let respuesta;
  try {
    // Las lecturas se reintentan solas; la calificación (POST) no.
    const pedir = opciones.method ? fetch : leerConReintentos;
    respuesta = await pedir(`${URL_API}${ruta}`, {
      ...opciones,
      headers: { ...headersDeAuth(), ...(opciones.body ? { 'Content-Type': 'application/json' } : {}) },
      cache: 'no-store',
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw errorSinConexion();
  }
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    manejarNoAutorizado(respuesta.status, cuerpo);
    throw new ErrorDeApi(cuerpo?.message ?? 'No se pudo completar la operación.', null, respuesta.status);
  }
  if (!cuerpo) throw new ErrorDeApi('El servidor devolvió una respuesta inesperada.', null, 0);
  return cuerpo;
}
export const obtenerCalificacionViaje = (id, signal) => solicitar(`/cargas/${encodeURIComponent(id)}/calificacion`, { signal });
export const emitirCalificacion = (datos) => solicitar('/calificaciones', { method: 'POST', body: JSON.stringify(datos) });
export const obtenerReputacion = (id, pagina, signal) => solicitar(`/usuarios/${encodeURIComponent(id)}/reputacion?pagina=${pagina}`, { signal });
