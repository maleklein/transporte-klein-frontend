import { ErrorDeApi } from './usuarios';

// Ajustá la URL base según cómo tengan configurado el proyecto (ej. cliente Axios o fetch)
const BASE_URL = 'http://localhost:3000'; 

export async function asignarCargaACamionero(id_carga, id_camionero) {
  const token = localStorage.getItem('token'); // Asumiendo que guardan el token acá
  
  const respuesta = await fetch(`${BASE_URL}/asignaciones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ id_carga, id_camionero })
  });

  if (!respuesta.ok) {
    const error = await respuesta.json();
    throw new ErrorDeApi(respuesta.status, error.message || 'Error al asignar la carga');
  }

  return respuesta.json();
}