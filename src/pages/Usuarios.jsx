import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconoCamion, IconoUsuarioMas } from '../components/Iconos';
import './Usuarios.css';

/**
 * Pantalla de gestión de usuarios (HU 1.1).
 *
 * Nota sobre la lista: el backend todavía no expone GET /usuarios (devuelve 404),
 * así que la tabla arranca vacía y se completa con los usuarios que se dan de alta
 * en esta sesión, usando la respuesta 201 del POST. Cuando exista el endpoint de
 * listado, basta con cargarlo acá con un useEffect.
 *
 * @returns {JSX.Element}
 */
export default function Usuarios() {
  const navigate = useNavigate();
  const location = useLocation();

  const [usuarios, setUsuarios] = useState([]);
  const [idReciente, setIdReciente] = useState(null);

  // La pantalla de alta (/usuarios/nuevo) vuelve para acá pasando el usuario
  // recién creado por router state, ya que no hay GET /usuarios para recargar la lista.
  useEffect(() => {
    const usuarioCreado = location.state?.usuarioCreado;
    if (!usuarioCreado) return;

    setUsuarios((previos) => [usuarioCreado, ...previos]);
    setIdReciente(usuarioCreado.id_usuario);

    // Limpia el state para no volver a agregarlo si el usuario navega con atrás/adelante.
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      <main className="us-contenido">
        <div className="us-encabezado">
          <h1>Gestión de Usuarios</h1>
          <button
            type="button"
            className="ds-boton ds-boton--primario"
            onClick={() => navigate('/usuarios/nuevo')}
          >
            <IconoUsuarioMas />
            Nuevo Usuario
          </button>
        </div>

        <div className="us-tabla-caja">
          {usuarios.length === 0 ? (
            <p className="us-vacio">
              Todavía no hay usuarios cargados. Usá el botón <strong>Nuevo Usuario</strong> para
              dar de alta el primero.
            </p>
          ) : (
            <table className="us-tabla">
              <thead>
                <tr>
                  <th scope="col">Nombre y apellido</th>
                  <th scope="col">DNI</th>
                  <th scope="col">Email</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Datos del vehículo</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr
                    key={usuario.id_usuario}
                    className={usuario.id_usuario === idReciente ? 'us-fila--nueva' : undefined}
                  >
                    <td>
                      {usuario.nombre} {usuario.apellido}
                    </td>
                    <td>{usuario.dni}</td>
                    <td>{usuario.email}</td>
                    <td>
                      <span
                        className={`us-etiqueta-rol${
                          usuario.rol === 'camionero' ? ' us-etiqueta-rol--camionero' : ''
                        }`}
                      >
                        {usuario.rol === 'camionero' ? 'Camionero' : 'Administrador'}
                      </span>
                    </td>
                    <td>
                      {usuario.camionero
                        ? `${usuario.camionero.ubicacion} — ${usuario.camionero.tipo_vehiculo} (${usuario.camionero.capacidad_kg} kg)`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
