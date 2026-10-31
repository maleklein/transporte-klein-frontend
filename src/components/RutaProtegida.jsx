import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { rutaInicio, usuarioActual } from '../api/sesion';

/**
 * Layout route (HU 15) que protege un grupo de rutas por sesión y, opcionalmente,
 * por rol.
 *
 * Sin sesión guardada, manda al login. Con sesión pero sin el rol pedido, no
 * muestra la pantalla: manda al inicio del rol del usuario y deja un aviso
 * para que `BarraSuperior` lo muestre ahí.
 *
 * Sólo mira si hay una sesión guardada, no si el token sigue vigente; eso lo
 * termina de resolver el primer pedido que haga la pantalla protegida
 * (`manejarNoAutorizado` en `api/sesion.js`), igual que ya pasa en toda la app.
 *
 * @param {object} props
 * @param {string[]} [props.roles] - roles que pueden entrar; sin esta prop, alcanza con tener sesión.
 * @returns {JSX.Element}
 */
export default function RutaProtegida({ roles }) {
  const location = useLocation();
  const usuario = usuarioActual();

  if (!usuario) {
    return <Navigate to="/" replace state={{ desde: location.pathname }} />;
  }

  if (roles && !roles.includes(usuario.rol)) {
    return (
      <Navigate
        to={rutaInicio(usuario.rol)}
        replace
        state={{ avisoAcceso: 'No tenés permiso para acceder a esa pantalla.' }}
      />
    );
  }

  return <Outlet />;
}
