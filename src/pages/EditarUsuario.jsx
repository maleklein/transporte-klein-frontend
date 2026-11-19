import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { editarUsuario, ErrorDeApi, obtenerUsuario } from '../api/usuarios';
import { usuarioActual } from '../api/sesion';
import {
  IconoAlerta,
  IconoCamion,
  IconoCerrar,
  IconoEditar,
  IconoGuardar,
} from '../components/Iconos';
import { useAvisoSalirSinGuardar } from '../components/AvisoSalirSinGuardar';
import BarraSuperior from '../components/BarraSuperior';
import MigasDePan from '../components/MigasDePan';
import Campo from '../components/Campo';
import CampoDni from '../components/CampoDni';
import ComboBox from '../components/ComboBox';
import { evitarFoco, valoresCambiaron } from '../utils/formulario';
import { destinoVolver, volverA } from '../utils/volver';
import { aplicarMayusculaInicial, validarNombreApellido } from '../utils/validarNombreApellido';
import {
  validarCapacidadKg,
  validarDni,
  validarEmail,
  validarTipoVehiculo,
  validarUbicacion,
} from '../utils/validarUsuario';
import AvisoSinConexion from '../components/AvisoSinConexion';
import { useAvisoSinConexion } from '../components/contextoConexion';
import { avisoSinConexion, esErrorDeConexion } from '../utils/conexion';
import './AltaUsuario.css';
import './EditarUsuario.css';

/**
 * Arma los valores iniciales del formulario a partir del usuario que llegó
 * por router state (los datos que ya tenía la ficha, que vienen del listado).
 *
 * @param {object} usuario - usuario a editar, tal como lo devuelve `GET /usuarios`.
 * @returns {object} valores iniciales del formulario.
 */
function valoresIniciales(usuario) {
  return {
    nombre: usuario.nombre ?? '',
    apellido: usuario.apellido ?? '',
    // Sólo los dígitos: los puntos los pone el campo al mostrarlo.
    dni: String(usuario.dni ?? '').replace(/\D/g, ''),
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

  const errorNombre = validarNombreApellido(valores.nombre, 'nombre');
  if (errorNombre) {
    errores.nombre = errorNombre;
  }

  const errorApellido = validarNombreApellido(valores.apellido, 'apellido');
  if (errorApellido) {
    errores.apellido = errorApellido;
  }

  const errorDni = validarDni(valores.dni);
  if (errorDni) {
    errores.dni = errorDni;
  }

  const errorEmail = validarEmail(valores.email);
  if (errorEmail) {
    errores.email = errorEmail;
  }

  if (esCamionero) {
    const errorUbicacion = validarUbicacion(valores.ubicacion);
    if (errorUbicacion) {
      errores.ubicacion = errorUbicacion;
    }

    const errorTipoVehiculo = validarTipoVehiculo(valores.tipo_vehiculo);
    if (errorTipoVehiculo) {
      errores.tipo_vehiculo = errorTipoVehiculo;
    }

    const errorCapacidad = validarCapacidadKg(valores.capacidad_kg);
    if (errorCapacidad) {
      errores.capacidad_kg = errorCapacidad;
    }
  }

  return errores;
}

/**
 * Convierte los valores del formulario en el payload que espera `PUT /usuarios/:id`.
 * Nunca incluye `rol` ni `contraseña`: el backend rechaza el pedido si vienen.
 *
 * @param {ReturnType<typeof valoresIniciales>} valores - valores actuales del formulario.
 * @param {boolean} esCamionero - si el usuario que se edita es camionero.
 * @returns {object} payload listo para `editarUsuario`.
 */
function armarPayload(valores, esCamionero) {
  const payload = {
    nombre: valores.nombre.trim(),
    apellido: valores.apellido.trim(),
    dni: valores.dni.trim(),
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

/** Campos que se escriben con mayúscula inicial en cada palabra. */
const CAMPOS_CON_MAYUSCULA = ['nombre', 'apellido'];

/**
 * Pantalla de edición de usuarios (HU 1.2), en la ruta /usuarios/:id/editar.
 *
 * Se entra desde el botón "Editar" de la ficha del usuario, que le pasa por
 * router state el usuario y a dónde volver. Si se entra directo a la ruta (o
 * se recarga), pide el usuario al backend (`GET /usuarios/:id`) y vuelve a su
 * ficha.
 *
 * Muestra el formulario precargado con los datos actuales, valida lo que se
 * escribe y lo envía al backend. Al cancelar vuelve a la ficha tal como
 * estaba; al guardar, a la ficha con los datos nuevos y el aviso, como la
 * edición de una carga vuelve a su detalle. El rol y la contraseña no se
 * editan desde acá.
 *
 * @returns {JSX.Element}
 */
export default function EditarUsuario() {
  const { id } = useParams();
  const location = useLocation();
  const avisarSiFaltaConexion = useAvisoSinConexion();

  // Desde la ficha llega el usuario que se estaba viendo; si no, se pide.
  const previo = location.state?.usuario;
  const [usuario, setUsuario] = useState(previo && String(previo.id_usuario) === id ? previo : null);
  // 'cargando' | 'ok' | 'no-encontrado' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState(usuario ? 'ok' : 'cargando');
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    if (usuario) return undefined;
    const controlador = new AbortController();
    obtenerUsuario(id, { signal: controlador.signal })
      .then((datos) => {
        setUsuario(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        if (avisarSiFaltaConexion(error)) return;
        if (error instanceof ErrorDeApi && [400, 404].includes(error.estado)) {
          setEstadoPantalla('no-encontrado');
          return;
        }
        setMensajeError(
          error instanceof ErrorDeApi ? error.message : 'No se pudieron cargar los datos del usuario. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });
    return () => controlador.abort();
  }, [id, usuario, avisarSiFaltaConexion]);

  if (estadoPantalla !== 'ok' || !usuario) {
    const alListado = { ruta: '/usuarios', texto: 'Volver a Usuarios' };
    return (
      <>
        <BarraSuperior volver={alListado} />
        <main className="au-contenido">
          <MigasDePan volver={alListado} actual="Editar usuario" />
          {estadoPantalla === 'cargando' && <p className="eu-mensaje">Cargando usuario...</p>}
          {estadoPantalla !== 'cargando' && (
            <div className="ds-aviso ds-aviso--error" role="alert">
              <IconoAlerta width={22} height={22} />
              {estadoPantalla === 'no-encontrado'
                ? 'No encontramos ese usuario. Puede que la dirección sea incorrecta.'
                : mensajeError}
            </div>
          )}
        </main>
      </>
    );
  }

  // A dónde vuelve: la ficha. Desde la ficha llega con el `state` de la ficha
  // (así sigue sabiendo volver al listado con sus filtros); entrando directo,
  // la ficha vuelve al listado sin filtros. Las migas son
  // Usuarios › Ana Suárez › Editar usuario.
  const volver = destinoVolver(location, {
    ...volverA(`/usuarios/${id}`, 'Volver a la ficha', volverA('/usuarios', 'Volver a Usuarios'),
      `${usuario.nombre} ${usuario.apellido}`).volverA,
  });

  return <FormularioEdicion usuario={usuario} volver={volver} />;
}

/**
 * El formulario, ya con el usuario a editar.
 *
 * @param {object} props
 * @param {object} props.usuario - el usuario, tal como lo devuelve el backend.
 * @param {{ ruta: string, texto: string, estado?: object|null, miga?: string }} props.volver - la ficha.
 * @returns {JSX.Element}
 */
function FormularioEdicion({ usuario, volver }) {
  const navigate = useNavigate();
  const esCamionero = usuario?.rol === 'camionero';
  // Darse de baja a uno mismo deja la cuenta sin poder volver a activarse: el
  // backend lo rechaza (409) y acá directamente no se ofrece la opción.
  const esMiCuenta = usuario?.id_usuario === usuarioActual()?.id;

  const [valores, setValores] = useState(() => (usuario ? valoresIniciales(usuario) : null));
  // Si lo escrito difiere de lo que tenía el usuario, salir sin guardar pide confirmación.
  const originales = useMemo(() => valoresIniciales(usuario), [usuario]);
  const { permitirSalida, modal: modalSalir } = useAvisoSalirSinGuardar(valoresCambiaron(valores, originales));
  const [tocados, setTocados] = useState({});
  const [erroresBackend, setErroresBackend] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  // Falta de conexión al guardar: se avisa al lado de los botones.
  const [avisoConexion, setAvisoConexion] = useState(null);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const refPrimerCampo = useRef(null);

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

  /**
   * Cancela la edición y vuelve a la ficha, sin guardar nada.
   *
   * @returns {void}
   */
  const cancelar = () => navigate(volver.ruta, { state: volver.estado ?? null });

  /**
   * Maneja el cambio en un campo del formulario y limpia errores previos.
   *
   * @param {string} campo - nombre del campo a actualizar.
   * @returns {function(evento: Event): void}
   */
  const alCambiar = (campo) => (evento) => {
    // Nombre y apellido muestran la mayúscula inicial desde la primera letra,
    // tal como los va a guardar el backend.
    const value = CAMPOS_CON_MAYUSCULA.includes(campo)
      ? aplicarMayusculaInicial(evento.target)
      : evento.target.value;
    setValores((previos) => ({ ...previos, [campo]: value }));

    setErroresBackend((previos) => {
      if (!previos[campo]) return previos;
      const siguientes = { ...previos };
      delete siguientes[campo];
      return siguientes;
    });

    setErrorGeneral('');
    setAvisoConexion(null);
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
   * backend y, si sale bien, vuelve a la ficha con los datos nuevos y el
   * aviso. Si falla, muestra el error correspondiente.
   */
  const alEnviar = async (evento) => {
    evento.preventDefault();
    setIntentoEnviar(true);
    setErrorGeneral('');
    setAvisoConexion(null);

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

      // `replace`: el formulario sale del historial, así "atrás" desde la
      // ficha no vuelve a un formulario ya guardado.
      permitirSalida();
      navigate(volver.ruta, {
        replace: true,
        state: {
          ...(volver.estado ?? {}),
          usuario: usuarioActualizado,
          avisoExito: `Los datos de ${usuarioActualizado.nombre} ${usuarioActualizado.apellido} se guardaron correctamente.`,
        },
      });
    } catch (error) {
      const esDeApi = error instanceof ErrorDeApi;
      const mensaje = esDeApi
        ? error.message
        : 'Ocurrió un error inesperado al guardar los cambios.';

      if (esDeApi && error.campo) {
        setErroresBackend({ [error.campo]: mensaje });
        setTocados((previos) => ({ ...previos, [error.campo]: true }));
        document.getElementById(`eu-${error.campo}`)?.focus();
      } else if (esErrorDeConexion(error)) {
        setAvisoConexion(avisoSinConexion('Los cambios no se guardaron', { formulario: true }));
      } else {
        setErrorGeneral(mensaje);
      }

      setEnviando(false);
    }
  };

  return (
    <>
    {/* La flecha y las migas vuelven a la ficha, igual que Cancelar. */}
      <BarraSuperior volver={volver} />

      <main className="au-contenido">
        <MigasDePan volver={volver} actual="Editar usuario" />

        <h1 className="au-titulo">
          <IconoEditar width={26} height={26} />
          Editar Usuario
        </h1>

        <form onSubmit={alEnviar} noValidate className="au-formulario">
          <div className="au-body">
            {errorGeneral && (
              <div className="ds-aviso ds-aviso--error" role="alert">
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
              <CampoDni
                id="eu-dni"
                etiqueta="DNI"
                error={errorDe('dni')}
                placeholder="Ej: 27.845.112"
                value={valores.dni}
                onCambio={(dni) => alCambiar('dni')({ target: { value: dni } })}
                onBlur={alSalirDelCampo('dni')}
              />
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

            <Campo id="eu-estado" etiqueta="Estado" error={errorDe('estado')}>
              {({ id, idError, tieneError }) => (
                <ComboBox
                  id={id}
                  buscable={false}
                  opciones={[
                    { valor: 'activo', etiqueta: 'Activo' },
                    { valor: 'inactivo', etiqueta: 'Inactivo' },
                  ]}
                  valor={valores.estado}
                  alElegir={(valor) => alCambiar('estado')({ target: { value: valor } })}
                  alSalir={alSalirDelCampo('estado')}
                  marcador="Elegí el estado"
                  tieneError={tieneError}
                  idError={idError}
                  deshabilitado={esMiCuenta}
                />
              )}
            </Campo>
            {esMiCuenta && (
              <p className="eu-nota">No podés dar de baja tu propia cuenta.</p>
            )}

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
            <AvisoSinConexion aviso={avisoConexion} />
            <button
              type="submit"
              className="ds-boton ds-boton--confirmar"
              onMouseDown={evitarFoco}
              disabled={enviando}
            >
              <IconoGuardar />
              {enviando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
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
          </div>
        </form>
        {modalSalir}
      </main>
    </>
  );
}
