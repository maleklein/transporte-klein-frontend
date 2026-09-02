import { useState } from 'react';
import './index.css';

const IniciarSesion = () => {
    //Variables de estado
    const [correo, asignarCorreo] = useState('');
    const [clave, asignarClave] = useState('');
    const [mensajeError, asignarMensajeError] = useState('');

    //Función que se ejecuta al apretar el botón
    const manejarEnvio = async (evento) => {
        evento.preventDefault(); //Evita que la página se recargue al enviar el formulario

        try {
            //Hacemos la petición al backend local
            const respuesta = await fetch('http://localhost:3000/autenticacion/iniciar-sesion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ correo, clave }) //Enviamos los datos en español
            });

            const datos = await respuesta.json();

            //Si el backend nos devuelve un error (credenciales incorrectas)
            if (!respuesta.ok) {
                asignarMensajeError(datos.error);
                return;
            }

            // Si todo salió bien
            asignarMensajeError('');
            alert(`¡Inicio de sesión exitoso! Bienvenido, ${datos.usuario.nombre}`);
            console.log("Token recibido:", datos.token);

            //MAS ADELANTE ACA VA EL CÓDIGO PARA REDIRECCIONAR A LA PÁGINA PRINCIPAL DE LA APP

        } catch (error) {
            asignarMensajeError('Error de red: No se pudo conectar con el servidor.');
        }
    };

    return (
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

                <button type="submit" className="boton-ingresar">
                    ➔ Iniciar Sesión
                </button>
            </form>
        </div>
    );
};

export default IniciarSesion;