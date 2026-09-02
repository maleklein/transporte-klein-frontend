import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { iniciarSesion } from './api/sesion';
import './login.css';

/**
 * Pantalla de inicio de sesión (HU 1.4), en la ruta `/`.
 *
 * Toma correo y contraseña, llama a `POST /auth/login` a través de
 * `iniciarSesion` (que además guarda el token en la sesión) y, si todo sale
 * bien, manda al listado de cargas. Si el backend rechaza las credenciales o la
 * cuenta está inactiva, muestra el mensaje que devolvió el backend.
 *
 * @returns {JSX.Element}
 */
const IniciarSesion = () => {
    const navigate = useNavigate();

    //Variables de estado
    const [correo, asignarCorreo] = useState('');
    const [clave, asignarClave] = useState('');
    const [mensajeError, asignarMensajeError] = useState('');
    const [enviando, asignarEnviando] = useState(false);

    //Función que se ejecuta al apretar el botón
    const manejarEnvio = async (evento) => {
        evento.preventDefault(); //Evita que la página se recargue al enviar el formulario

        asignarMensajeError('');
        asignarEnviando(true);

        try {
            // iniciarSesion pega a POST /auth/login, valida y deja la sesión
            // guardada. Devuelve el usuario logueado ({ id, email, rol }).
            // Si algo falla, tira un Error con un mensaje mostrable.
            const usuario = await iniciarSesion(correo, clave);

            // Login OK: cada rol arranca en su pantalla. El administrador
            // gestiona usuarios; el camionero ve el listado de cargas.
            navigate(usuario.rol === 'administrador' ? '/usuarios' : '/cargas');
        } catch (error) {
            asignarMensajeError(error.message);
        } finally {
            asignarEnviando(false);
        }
    };

    return (
        <div className="login-pagina">
          <div className="tarjeta-login">
            <h1 className="titulo">Transporte Klein</h1>
            <p className="subtitulo">Sistema de Gestión de Cargas</p>

            <form onSubmit={manejarEnvio}>
                <div className="grupo-input">
                    <label>Correo Electrónico</label>
                    <input
                        type="email"
                        value={correo}
                        onChange={(evento) => {
                            asignarCorreo(evento.target.value);

                            //borro cualquier error previo para que el navegador no se confunda
                            evento.target.setCustomValidity('');

                            //Evalúo si el texto actual es inválido (le falta el @ o está vacío)
                            if (!evento.target.validity.valid) {
                                // Si está mal, volvemos a poner nuestro mensaje
                                evento.target.setCustomValidity('Formato de correo inválido.');
                            }
                        }}
                        onInvalid={(evento) => {
                            evento.target.setCustomValidity('Formato de correo inválido.');
                        }}
                        required
                    />
                </div>

                <div className="grupo-input">
                    <label>Contraseña</label>
                    <input
                        type="password"
                        value={clave}
                        onChange={(evento) => asignarClave(evento.target.value)}
                        required
                    />
                </div>

                {/* Si hay un error, mostramos el mensaje en rojo */}
                {mensajeError && <p className="mensaje-error">{mensajeError}</p>}

                <button type="submit" className="boton-ingresar" disabled={enviando}>
                    {enviando ? 'Ingresando...' : '➔ Iniciar Sesión'}
                </button>
            </form>
          </div>
        </div>
    );
};

export default IniciarSesion;
