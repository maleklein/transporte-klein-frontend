import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { iniciarSesion, rutaInicio, tomarAvisoDeSesion } from './api/sesion';
import Campo from './components/Campo';
import { IconoAlerta, IconoCamion, IconoFlechaDerecha, IconoOjo, IconoOjoTachado } from './components/Iconos';
import { validarEmail } from './utils/validarUsuario';
import './login.css';

/**
 * Pantalla de inicio de sesión (HU 1.4), en la ruta `/`.
 *
 * Toma email y contraseña, llama a `POST /auth/login` a través de
 * `iniciarSesion` (que además guarda el token en la sesión) y, si todo sale
 * bien, manda al panel de inicio del rol. Si el backend rechaza las
 * credenciales o la cuenta está inactiva, muestra el mensaje que devolvió el
 * backend en un aviso arriba del formulario.
 *
 * Usa las mismas piezas que el resto de los formularios (`Campo`, `ds-aviso`,
 * `ds-boton`) y sigue las guías de formularios de inicio de sesión (web.dev,
 * GOV.UK):
 * - Los campos tienen `autoComplete` para que el navegador y el celular
 *   guarden y completen la contraseña.
 * - Los errores de un campo se muestran debajo de ese campo, con el mismo
 *   texto que en el alta de usuarios, y no en el globito del navegador.
 * - La contraseña se puede mostrar con el ojo para revisarla antes de ingresar. Al
 *   enviar vuelve a ocultarse, para que el navegador no la guarde como texto.
 *
 * @returns {JSX.Element}
 */
const IniciarSesion = () => {
    const navigate = useNavigate();
    const refCorreo = useRef(null);
    const refClave = useRef(null);

    const [correo, asignarCorreo] = useState('');
    const [clave, asignarClave] = useState('');
    const [claveVisible, asignarClaveVisible] = useState(false);
    // Errores de cada campo, que se muestran debajo del campo al enviar.
    const [errores, asignarErrores] = useState({});
    // Si la sesión se cerró sola (la cuenta quedó dada de baja), arranca
    // explicando por qué, en vez de dejar el login sin motivo aparente.
    const [mensajeError, asignarMensajeError] = useState(tomarAvisoDeSesion);
    const [enviando, asignarEnviando] = useState(false);

    const manejarEnvio = async (evento) => {
        evento.preventDefault(); // Evita que la página se recargue al enviar el formulario
        asignarClaveVisible(false);
        asignarMensajeError('');

        const nuevosErrores = {
            correo: validarEmail(correo),
            clave: clave ? undefined : 'Ingresá la contraseña.',
        };
        asignarErrores(nuevosErrores);
        // El foco va al primer campo con error, para corregirlo directamente.
        if (nuevosErrores.correo) {
            refCorreo.current?.focus();
            return;
        }
        if (nuevosErrores.clave) {
            refClave.current?.focus();
            return;
        }

        asignarEnviando(true);
        try {
            // iniciarSesion pega a POST /auth/login, valida y deja la sesión
            // guardada. Devuelve el usuario logueado ({ id, email, rol }).
            // Si algo falla, tira un Error con un mensaje mostrable.
            const usuario = await iniciarSesion(correo.trim(), clave);

            // Login OK: cada rol arranca en su panel de inicio (HU 15/16/17).
            navigate(rutaInicio(usuario.rol));
        } catch (error) {
            asignarMensajeError(error.message);
        } finally {
            asignarEnviando(false);
        }
    };

    // Al corregir un campo, se va su error: no queda en rojo algo que ya está bien.
    const cambiarCorreo = (evento) => {
        asignarCorreo(evento.target.value);
        if (errores.correo) asignarErrores((previos) => ({ ...previos, correo: undefined }));
    };
    const cambiarClave = (evento) => {
        asignarClave(evento.target.value);
        if (errores.clave) asignarErrores((previos) => ({ ...previos, clave: undefined }));
    };

    return (
        <main className="login-pagina">
          <div className="login-contenido">
            <div className="tarjeta-login">
              {/* La marca, arriba de los campos y centrada. Es el título de
                  la pantalla. */}
              <div className="login-encabezado">
                  <IconoCamion width={48} height={48} className="login-logo" />
                  <h1 className="login-marca">Transporte Klein</h1>
              </div>

              {/* noValidate: los errores los muestra cada campo con el estilo del
                  sistema, no el globito del navegador. */}
              <form onSubmit={manejarEnvio} noValidate>
                  {mensajeError && (
                      <div className="ds-aviso ds-aviso--error" role="alert">
                          <IconoAlerta width={22} height={22} />
                          {mensajeError}
                      </div>
                  )}

                  {/* id, name y autoComplete le dicen al navegador (y al llavero
                      del celular) que este es el usuario del login, para que
                      ofrezca guardar y autocompletar la contraseña. */}
                  <Campo
                      id="login-correo"
                      etiqueta="Correo electrónico"
                      obligatorio={false}
                      error={errores.correo}
                      refInput={refCorreo}
                      name="email"
                      type="email"
                      autoComplete="username"
                      inputMode="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={correo}
                      onChange={cambiarCorreo}
                  />

                  <Campo
                      id="login-clave"
                      etiqueta="Contraseña"
                      obligatorio={false}
                      error={errores.clave}
                  >
                      {({ id, idError, tieneError }) => (
                          <div className="login-clave ds-filtro-control">
                              <input
                                  id={id}
                                  ref={refClave}
                                  name="password"
                                  type={claveVisible ? 'text' : 'password'}
                                  autoComplete="current-password"
                                  autoCapitalize="none"
                                  spellCheck={false}
                                  className={`ds-campo__input${tieneError ? ' ds-campo__input--error' : ''}`}
                                  aria-invalid={tieneError}
                                  aria-describedby={tieneError ? idError : undefined}
                                  value={clave}
                                  onChange={cambiarClave}
                              />
                              {/* El ojo, dentro del campo y a la derecha, en el
                                  mismo lugar que la × de los filtros. type="button"
                                  para que no envíe el formulario; el aria-label
                                  dice qué hace, para el lector de pantalla. */}
                              <button
                                  type="button"
                                  className="ds-boton-en-campo"
                                  aria-controls={id}
                                  aria-label={claveVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                  // Que el clic no le saque el foco al campo: en el
                                  // celular, el teclado sigue abierto.
                                  onMouseDown={(evento) => evento.preventDefault()}
                                  onClick={() => asignarClaveVisible((visible) => !visible)}
                              >
                                  {/* El ojo muestra lo que hace: abierto para
                                      mostrar la contraseña, tachado para ocultarla. */}
                                  {claveVisible
                                      ? <IconoOjoTachado width={20} height={20} />
                                      : <IconoOjo width={20} height={20} />}
                              </button>
                          </div>
                      )}
                  </Campo>

                  <button
                      type="submit"
                      className="ds-boton ds-boton--primario login-ingresar"
                      disabled={enviando}
                  >
                      {enviando ? 'Ingresando...' : 'Iniciar sesión'}
                      {!enviando && <IconoFlechaDerecha width={20} height={20} />}
                  </button>
              </form>
            </div>
          </div>
        </main>
    );
};

export default IniciarSesion;
