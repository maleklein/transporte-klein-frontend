import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { editarUsuario, ErrorDeApi } from '../api/usuarios';
import {
  IconoAlerta,
  IconoCamion,
  IconoCerrar,
  IconoCheck,
  IconoEditar,
  IconoGuardar,
} from '../components/Iconos';
import Campo from '../components/Campo';
import { evitarFoco } from '../utils/formulario';
import './AltaUsuario.css';
import './EditarUsuario.css';

/**
 * Arma los valores iniciales del formulario a partir del usuario que llegó
 * por router state (los datos ya cargados que trae el listado).
 *
 * @param {object} usuario - usuario a editar, tal como lo devuelve `GET /usuarios`.
 * @returns {object} valores iniciales del formulario.
 */
function valoresIniciales(usuario) {
  return {
    nombre: usuario.nombre ?? '',
    apellido: usuario.apellido ?? '',
    email: usuario.email ?? '',
    estado: usuario.estado ?? 'activo',
    ubicacion: usuario.camionero?.ubicacion ?? '',
    tipo_vehiculo: usuario.camionero?.tipo_vehiculo ?? '',
    capacidad_kg: usuario.camionero?.capacidad_kg ?? '',
  };
}

/**
 * Reglas de validación del formulario de edición, evaluadas en tiempo real.
 * A diferencia del alta, no incluye contraseña ni rol: el backend no permite
 * modificarlos desde este endpoint.
 *
 * @param {ReturnType<typeof valoresIniciales>} valores - valores actuales del formulario.
 * @param {boolean} esCamionero - si el usuario que se edita es camionero.
 * @returns {object} mapa `{ campo: mensaje }` con un error por cada campo inválido.
 */
function validar(valores, esCamionero) {
  const errores = {};

  if (!valores.nombre.trim()) {
    errores.nombre = 'Ingresá el nombre.';
  }

  if (!valores.apellido.trim()) {
    errores.apellido = 'Ingresá el apellido.';
  }

  if (!valores.email.trim()) {
    errores.email = 'Ingresá el email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valores.email.trim())) {
    errores.email = 'Escribí un email válido. Ejemplo: nombre@mail.com';
  }

  if (esCamionero) {
    if (!valores.ubicacion.trim()) {
      errores.ubicacion = 'Ingresá la ubicación del camionero.';
    }
    if (!valores.tipo_vehiculo.trim()) {
      errores.tipo_vehiculo = 'Ingresá el tipo de vehículo.';
    }
    if (!String(valores.capacidad_kg).trim()) {
      errores.capacidad_kg = 'Ingresá la capacidad en kilos.';
    } else if (!(Number(valores.capacidad_kg) > 0)) {
      errores.capacidad_kg = 'La capacidad debe ser un número mayor a cero.';
    }
  }

  return errores;
}

/**
 * Convierte los valores del formulario en el payload que espera `PUT /usuarios/:id`.
 * Nunca incluye `dni`, `rol` ni `contraseña`: el backend rechaza el pedido si vienen.
 *
 * @param {ReturnType<typeof valoresIniciales>} valores - valores actuales del formulario.
 * @param {boolean} esCamionero - si el usuario que se edita es camionero.
 * @returns {object} payload listo para `editarUsuario`.
 */
function armarPayload(valores, esCamionero) {
  const payload = {
    nombre: valores.nombre.trim(),
    apellido: valores.apellido.trim(),
    email: valores.email.trim(),
    estado: valores.estado,
  };

  if (esCamionero) {
    payload.ubicacion = valores.ubicacion.trim();
    payload.tipo_vehiculo = valores.tipo_vehiculo.trim();
    payload.capacidad_kg = Number(valores.capacidad_kg);
  }

  return payload;
}

/**
 * Pantalla de edición de usuarios (HU 1.2), en la ruta /usuarios/editar.
 *
 * El usuario a editar llega por router state desde el listado (no hay
 * `GET /usuarios/:id` individual). Si se entra directo a la ruta sin ese
 * state (por ejemplo, refrescando la página), se vuelve al listado.
 *
 * Muestra el formulario precargado con los datos actuales, mantiene el DNI
 * bloqueado (no editable), valida los datos, los envía al backend y, al
 * cancelar o al guardar con éxito, navega de vuelta a /usuarios.
 *
 * @returns {JSX.Element}
 */
export default function EditarUsuario() {
  const navigate = useNavigate();
  const location = useLocation();
  // Puede no venir (ej: se entró directo a la URL sin pasar por el listado).
  // Los hooks de abajo se llaman igual, sin condicionarlos a esto, y recién
  // al final del componente se decide si hay que redirigir.
  const usuario = location.state?.usuario;
  const esCamionero = usuario?.rol === 'camionero';

  const [valores, setValores] = useState(() => (usuario ? valoresIniciales(usuario) : null));
  const [tocados, setTocados] = useState({});
  const [erroresBackend, setErroresBackend] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const refPrimerCampo = useRef(null);
  const refTemporizador = useRef(null);

  const erroresValidacion = usuario ? validar(valores, esCamionero) : {};
  const formularioValido = Object.keys(erroresValidacion).length === 0;

  /**
   * Decide qué mensaje de error mostrar para un campo: prioriza el error
   * del backend y, si no hay, el de validación local, pero solo una vez que
   * el usuario tocó el campo o intentó enviar.
   *
   * @param {string} campo - nombre del campo (ej: "email", "estado").
   * @returns {string|undefined} mensaje de error a mostrar, o undefined si no hay.
   */
  const errorDe = (campo) => {
    if (erroresBackend[campo]) return erroresBackend[campo];
    if (tocados[campo] || intentoEnviar) return erroresValidacion[campo];
    return undefined;
  };

  useEffect(() => {
    const foco = setTimeout(() => refPrimerCampo.current?.focus(), 60);
    return () => clearTimeout(foco);
  }, []);

  useEffect(() => () => clearTimeout(refTemporizador.current), []);

  /**
   * Cancela la edición y vuelve al listado de usuarios, sin guardar nada.
   *
   * @returns {void}
   */
  const cancelar = () => navigate('/usuarios');

  /**
   * Maneja el cambio en un campo del formulario y limpia errores previos.
   *
   * @param {string} campo - nombre del campo a actualizar.
   * @returns {function(evento: Event): void}
   */
  const alCambiar = (campo) => (evento) => {
    const { value } = evento.target;
    setValores((previos) => ({ ...previos, [campo]: value }));

    setErroresBackend((previos) => {
      if (!previos[campo]) return previos;
      const siguientes = { ...previos };
      delete siguientes[campo];
      return siguientes;
    });

    setErrorGeneral('');
  };

  /**
   * Marca un campo como "tocado" cuando el usuario sale de él.
   *
   * @param {string} campo - nombre del campo.
   * @returns {function(): void}
   */
  const alSalirDelCampo = (campo) => () => {
    setTocados((previos) => ({ ...previos, [campo]: true }));
  };

  /**
   * Maneja el envío del formulario: valida, guarda los cambios contra el
   * backend y, si sale bien, muestra el mensaje de éxito y vuelve al
   * listado de usuarios. Si falla, muestra el error correspondiente.
   */
  const alEnviar = async (evento) => {
    evento.preventDefault();
    setIntentoEnviar(true);
    setErrorGeneral('');

    if (!formularioValido) {
      const primerCampoConError = Object.keys(erroresValidacion)[0];
      document.getElementById(`eu-${primerCampoConError}`)?.focus();
      return;
    }

    setEnviando(true);

    try {
      const usuarioActualizado = await editarUsuario(
        usuario.id_usuario,
        armarPayload(valores, esCamionero),
      );

      setMensajeExito(
        `Los datos de ${usuarioActualizado.nombre} ${usuarioActualizado.apellido} se guardaron correctamente.`,
      );

      refTemporizador.current = setTimeout(() => {
        navigate('/usuarios', { state: { usuarioActualizado } });
      }, 1800);
    } catch (error) {
      const esDeApi = error instanceof ErrorDeApi;
      const mensaje = esDeApi
        ? error.message
        : 'Ocurrió un error inesperado al guardar los cambios.';

      if (esDeApi && error.campo) {
        setErroresBackend({ [error.campo]: mensaje });
        setTocados((previos) => ({ ...previos, [error.campo]: true }));
        document.getElementById(`eu-${error.campo}`)?.focus();
      } else {
        setErrorGeneral(mensaje);
      }

      setEnviando(false);
    }
  };

  if (!usuario) return <Navigate to="/usuarios" replace />;

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      <main className="au-contenido">
        <h1 className="au-titulo">
          <IconoEditar width={26} height={26} />
          Editar Usuario
        </h1>

        <form onSubmit={alEnviar} noValidate className="au-formulario">
          <div className="au-body">
            {mensajeExito && (
              <div className="au-aviso au-aviso--exito" role="status">
                <IconoCheck />
                {mensajeExito}
              </div>
            )}

            {errorGeneral && (
              <div className="au-aviso au-aviso--error" role="alert">
                <IconoAlerta width={22} height={22} />
                {errorGeneral}
              </div>
            )}

            <div className="ds-fila-2">
              <Campo
                id="eu-nombre"
                etiqueta="Nombre"
                error={errorDe('nombre')}
                refInput={refPrimerCampo}
                type="text"
                placeholder="Ej: Carlos"
                value={valores.nombre}
                onChange={alCambiar('nombre')}
                onBlur={alSalirDelCampo('nombre')}
                autoComplete="given-name"
              />
              <Campo
                id="eu-apellido"
                etiqueta="Apellido"
                error={errorDe('apellido')}
                type="text"
                placeholder="Ej: Gauto"
                value={valores.apellido}
                onChange={alCambiar('apellido')}
                onBlur={alSalirDelCampo('apellido')}
                autoComplete="family-name"
              />
            </div>

            <div className="ds-fila-2">
              {/* DNI bloqueado: la HU 1.2 exige que no se pueda modificar desde acá. */}
              <Campo id="eu-dni" etiqueta="DNI" obligatorio={false} type="text" value={usuario.dni} disabled />
              <Campo
                id="eu-email"
                etiqueta="Email"
                error={errorDe('email')}
                type="email"
                placeholder="Ej: carlos.gauto@mail.com"
                value={valores.email}
                onChange={alCambiar('email')}
                onBlur={alSalirDelCampo('email')}
                autoComplete="email"
              />
            </div>
            <p className="eu-nota">El DNI no se puede modificar.</p>

            <Campo id="eu-estado" etiqueta="Estado" error={errorDe('estado')}>
              {({ id, idError, tieneError }) => (
                <select
                  id={id}
                  className={`ds-campo__input${tieneError ? ' ds-campo__input--error' : ''}`}
                  aria-invalid={tieneError}
                  aria-describedby={tieneError ? idError : undefined}
                  value={valores.estado}
                  onChange={alCambiar('estado')}
                  onBlur={alSalirDelCampo('estado')}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              )}
            </Campo>

            {esCamionero && (
              <div className="au-bloque-camionero">
                <h3 className="au-bloque-camionero__titulo">
                  <IconoCamion />
                  Datos adicionales del camionero
                </h3>

                <div className="ds-fila-2">
                  <Campo
                    id="eu-ubicacion"
                    etiqueta="Ubicación"
                    error={errorDe('ubicacion')}
                    type="text"
                    placeholder="Ej: Paraná, Entre Ríos"
                    value={valores.ubicacion}
                    onChange={alCambiar('ubicacion')}
                    onBlur={alSalirDelCampo('ubicacion')}
                  />
                  <Campo
                    id="eu-tipo_vehiculo"
                    etiqueta="Tipo de vehículo"
                    error={errorDe('tipo_vehiculo')}
                    type="text"
                    placeholder="Ej: Camión 3/4"
                    value={valores.tipo_vehiculo}
                    onChange={alCambiar('tipo_vehiculo')}
                    onBlur={alSalirDelCampo('tipo_vehiculo')}
                  />
                </div>

                <Campo
                  id="eu-capacidad_kg"
                  etiqueta="Capacidad (kg)"
                  error={errorDe('capacidad_kg')}
                  type="number"
                  min="1"
                  placeholder="Ej: 2500"
                  value={valores.capacidad_kg}
                  onChange={alCambiar('capacidad_kg')}
                  onBlur={alSalirDelCampo('capacidad_kg')}
                />
              </div>
            )}
          </div>

          <div className="au-footer">
            <button
              type="button"
              className="ds-boton ds-boton--cancelar"
              onClick={cancelar}
              onMouseDown={evitarFoco}
              disabled={enviando}
            >
              <IconoCerrar />
              Cancelar
            </button>
            <button
              type="submit"
              className="ds-boton ds-boton--confirmar"
              onMouseDown={evitarFoco}
              disabled={enviando || Boolean(mensajeExito)}
            >
              <IconoGuardar />
              {enviando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
