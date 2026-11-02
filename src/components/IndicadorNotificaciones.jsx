import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { IconoCampana } from './Iconos';
import { EVENTO_NOTIFICACIONES_CAMBIARON, listarNotificaciones } from '../api/notificaciones';
import './IndicadorNotificaciones.css';

/**
 * Cada cuánto se vuelve a preguntar al backend cuántas hay sin leer.
 *
 * El contador se actualiza consultando, no porque el servidor lo empuje: para
 * el alcance del proyecto alcanza y evita meter websockets (HU 12).
 */
const INTERVALO_CONSULTA_MS = 30_000;

/**
 * Acceso al centro de notificaciones (HU 12), con el contador de las que
 * faltan leer. Va en la barra superior de todas las pantallas con sesión, así
 * que lo ven tanto el administrador como el camionero.
 *
 * Con la pestaña en segundo plano no consulta: nadie está mirando el número,
 * y al volver a la pestaña se actualiza en el acto. También se actualiza
 * apenas se marca una como leída, sin esperar a la próxima vuelta.
 *
 * @returns {JSX.Element}
 */
export default function IndicadorNotificaciones() {
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    let controlador = null;

    const consultar = () => {
      if (document.hidden) return;

      // Si quedó un pedido anterior en vuelo, gana el último.
      controlador?.abort();
      controlador = new AbortController();

      listarNotificaciones({ soloNoLeidas: true }, { signal: controlador.signal })
        .then((datos) => setNoLeidas(datos.length))
        // Si falla, el contador se queda con lo último que supo: es un
        // indicador, no vale la pena tapar la pantalla con un error. Un 401
        // ya lo resuelve la capa de API mandando al login.
        .catch(() => {});
    };

    consultar();
    const intervalo = setInterval(consultar, INTERVALO_CONSULTA_MS);
    document.addEventListener('visibilitychange', consultar);
    window.addEventListener(EVENTO_NOTIFICACIONES_CAMBIARON, consultar);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', consultar);
      window.removeEventListener(EVENTO_NOTIFICACIONES_CAMBIARON, consultar);
      controlador?.abort();
    };
  }, []);

  // El backend devuelve 100 como máximo, así que de 99 para arriba el número
  // exacto ya no se conoce: "99+" dice justamente eso.
  const textoContador = noLeidas > 99 ? '99+' : String(noLeidas);

  return (
    <NavLink
      to="/notificaciones"
      className={({ isActive }) => `bs-enlace ni-enlace${isActive ? ' bs-enlace--activo' : ''}`}
    >
      <IconoCampana width={22} height={22} />
      Notificaciones
      {noLeidas > 0 && (
        <>
          {/* El número a la vista no se lee solo ("Notificaciones 3" no dice
              nada); el lector de pantalla oye la frase completa de al lado. */}
          <span className="ni-contador" aria-hidden="true">
            {textoContador}
          </span>
          <span className="ni-oculto">
            , {noLeidas > 99 ? 'más de 99' : noLeidas} sin leer
          </span>
        </>
      )}
    </NavLink>
  );
}
