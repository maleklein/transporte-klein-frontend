import { createContext, useCallback, useContext } from 'react';
import { esErrorDeConexion } from '../utils/conexion';

/**
 * Estado de la conexión con el sistema, que comparte `ControlConexion` con
 * las pantallas y la barra superior.
 *
 * El valor por defecto no hace nada, para que un componente fuera de
 * `ControlConexion` (el login, por ejemplo) pueda usar los hooks sin romperse.
 */
export const ContextoConexion = createContext({
  pantallaCaida: false,
  conexionInestable: false,
  avisarSinConexion: () => {},
  avisarConexionInestable: () => {},
});

/**
 * Estado de la conexión, para la barra superior.
 *
 * @returns {{pantallaCaida: boolean, conexionInestable: boolean, avisarConexionInestable: function}}
 */
export function useConexion() {
  return useContext(ContextoConexion);
}

/**
 * Para la carga inicial de una pantalla o de una de sus partes: devuelve una
 * función que, si el error es por falta de conexión, reemplaza la pantalla
 * por la de "Sin conexión" y devuelve true. Si es otro error, devuelve false
 * y la pantalla lo muestra como siempre.
 *
 *     .catch((error) => {
 *       if (avisarSiFaltaConexion(error)) return;
 *       setMensajeError(...);
 *     });
 *
 * Solo para leer los datos que la pantalla todavía no mostró. Si falla una
 * acción (guardar, postularse) o una recarga de algo que ya está a la vista
 * (otro filtro, "Mostrar más"), se avisa al lado de lo que se tocó, para no
 * sacarle la pantalla de adelante al usuario.
 *
 * La función no cambia entre renders, así que se puede poner en las
 * dependencias de un efecto. Quien la usa tiene que cancelar su pedido al
 * salir de la pantalla (AbortController), como ya hacen todas: si no, un
 * pedido que termina tarde taparía la pantalla nueva.
 *
 * @returns {(error: unknown) => boolean}
 */
export function useAvisoSinConexion() {
  const { avisarSinConexion } = useContext(ContextoConexion);
  return useCallback(
    (error) => {
      if (!esErrorDeConexion(error)) return false;
      avisarSinConexion();
      return true;
    },
    [avisarSinConexion],
  );
}
