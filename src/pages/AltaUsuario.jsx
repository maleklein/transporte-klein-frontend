import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearUsuario, ErrorDeApi } from '../api/usuarios';
import {
  IconoAlerta,
  IconoCamion,
  IconoCerrar,
  IconoCheck,
  IconoGuardar,
  IconoUsuarioMas,
} from '../components/Iconos';
import Campo from '../components/Campo';
import { evitarFoco } from '../utils/formulario';
import './AltaUsuario.css';

const VALORES_INICIALES = {
  nombre: '',
  apellido: '',
  dni: '',
  email: '',
  password: '',
  rol: '',
  ubicacion: '',
  tipo_vehiculo: '',
  capacidad_kg: '',
};

/**
 * Reglas de validación del formulario, evaluadas en tiempo real.
 *
 * @param {typeof VALORES_INICIALES} valores - valores actuales del formulario.
 * @returns {object} mapa `{ campo: mensaje }` con un error por cada campo inválido.
 */
function validar(valores) {
  const errores = {};

  if (!valores.nombre.trim()) {
    errores.nombre = 'Ingresá el nombre.';
  }

  if (!valores.apellido.trim()) {
    errores.apellido = 'Ingresá el apellido.';
  }

  if (!valores.dni.trim()) {
    errores.dni = 'Ingresá el DNI.';
  } else if (!/^\d{7,8}$/.test(valores.dni.trim())) {
    errores.dni = 'El DNI debe tener 7 u 8 números, sin puntos ni espacios.';
  }

  if (!valores.email.trim()) {
    errores.email = 'Ingresá el email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valores.email.trim())) {
    errores.email = 'Escribí un email válido. Ejemplo: nombre@mail.com';
  }

  if (!valores.password) {
    errores.password = 'Ingresá una contraseña.';
  } else if (valores.password.length < 8) {
    errores.password = 'La contraseña debe tener al menos 8 caracteres.';
  }

  if (!valores.rol) {
    errores.rol = 'Elegí un rol para el usuario.';
  }

  // Estos campos solo son obligatorios cuando el rol es camionero.
  if (valores.rol === 'camionero') {
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
 * Arma el cuerpo del POST: los datos de camionero solo viajan si corresponde.
 *
 * @param {typeof VALORES_INICIALES} valores - valores actuales del formulario.
 * @returns {object} payload listo para `crearUsuario`.
 */
function armarPayload(valores) {
  const payload = {
    nombre: valores.nombre.trim(),
    apellido: valores.apellido.trim(),
    dni: valores.dni.trim(),
    email: valores.email.trim(),
    contraseña: valores.password,
    rol: valores.rol,
  };

  if (valores.rol === 'camionero') {
    payload.ubicacion = valores.ubicacion.trim();
    payload.tipo_vehiculo = valores.tipo_vehiculo.trim();
    payload.capacidad_kg = Number(valores.capacidad_kg);
  }

  return payload;
}

/**
 * Pantalla de alta de usuarios (HU 1.1), en la ruta /usuarios/nuevo.
 * Al cancelar o al registrar con éxito, navega de vuelta a /usuarios.
 *
 * @returns {JSX.Element}
 */
export default function AltaUsuario() {
  const navigate = useNavigate();

  const [valores, setValores] = useState(VALORES_INICIALES);
  const [tocados, setTocados] = useState({});
  const [erroresBackend, setErroresBackend] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const refPrimerCampo = useRef(null);
  const refTemporizador = useRef(null);

  const erroresValidacion = validar(valores);
  const formularioValido = Object.keys(erroresValidacion).length === 0;

  /**
   * Un error se muestra si el backend lo devolvió, o si el usuario ya tocó el campo.
   *
   * @param {string} campo - nombre del campo (ej: "email", "dni").
   * @returns {string|undefined} mensaje de error a mostrar, o undefined si no hay.
   */
  const errorDe = (campo) => {
    if (erroresBackend[campo]) return erroresBackend[campo];
    if (tocados[campo] || intentoEnviar) return erroresValidacion[campo];
    return undefined;
  };

  // Foco en el primer campo al entrar a la pantalla.
  useEffect(() => {
    const foco = setTimeout(() => refPrimerCampo.current?.focus(), 60);
    return () => clearTimeout(foco);
  }, []);

  // Limpia el temporizador de navegación si la pantalla se desmonta antes de tiempo.
  useEffect(() => () => clearTimeout(refTemporizador.current), []);

  /**
   * Cancela el alta y vuelve al listado de usuarios, sin registrar nada.
   *
   * @returns {void}
   */
  const cancelar = () => navigate('/usuarios');

  /**
   * Crea el manejador `onChange` de un campo del formulario.
   *
   * @param {string} campo - nombre del campo a actualizar.
   * @returns {function(evento: Event): void}
   */
  const alCambiar = (campo) => (evento) => {
    const { value } = evento.target;

    setValores((previos) => {
      const siguientes = { ...previos, [campo]: value };

      // Si deja de ser camionero, los datos del vehículo no deben quedar cargados.
      if (campo === 'rol' && value !== 'camionero') {
        siguientes.ubicacion = '';
        siguientes.tipo_vehiculo = '';
        siguientes.capacidad_kg = '';
      }

      return siguientes;
    });

    // Al corregir el campo, el error del backend deja de aplicar.
    setErroresBackend((previos) => {
      if (!previos[campo]) return previos;
      const siguientes = { ...previos };
      delete siguientes[campo];
      return siguientes;
    });

    setErrorGeneral('');
  };

  /**
   * Crea el manejador `onBlur` de un campo: lo marca como "tocado" para
   * que su error de validación empiece a mostrarse.
   *
   * @param {string} campo - nombre del campo.
   * @returns {function(): void}
   */
  const alSalirDelCampo = (campo) => () => {
    setTocados((previos) => ({ ...previos, [campo]: true }));
  };

  /**
   * Maneja el submit del formulario: valida, registra el usuario contra el
   * backend y, si sale bien, navega de vuelta al listado tras mostrar el
   * mensaje de éxito unos segundos.
   *
   * @param {import('react').FormEvent} evento
   * @returns {Promise<void>}
   */
  const alEnviar = async (evento) => {
    evento.preventDefault();
    setIntentoEnviar(true);
    setErrorGeneral('');

    if (!formularioValido) {
      // Lleva el foco al primer campo con problema.
      const primerCampoConError = Object.keys(erroresValidacion)[0];
      document.getElementById(`nu-${primerCampoConError}`)?.focus();
      return;
    }

    setEnviando(true);

    try {
      const usuarioCreado = await crearUsuario(armarPayload(valores));

      setMensajeExito(
        `El usuario ${usuarioCreado.nombre} ${usuarioCreado.apellido} se registró correctamente.`,
      );

      // Se deja ver el mensaje de éxito antes de volver a la lista de usuarios.
      refTemporizador.current = setTimeout(() => {
        navigate('/usuarios', { state: { usuarioCreado } });
      }, 1800);
    } catch (error) {
      const esDeApi = error instanceof ErrorDeApi;
      const mensaje = esDeApi
        ? error.message
        : 'Ocurrió un error inesperado al registrar el usuario.';

      if (esDeApi && error.campo) {
        // El backend identificó un campo: el mensaje va debajo de ese input.
        setErroresBackend({ [error.campo]: mensaje });
        setTocados((previos) => ({ ...previos, [error.campo]: true }));
        document.getElementById(`nu-${error.campo}`)?.focus();
      } else {
        setErrorGeneral(mensaje);
      }

      setEnviando(false);
    }
  };

  const esCamionero = valores.rol === 'camionero';

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      <main className="au-contenido">
        <h1 className="au-titulo">
          <IconoUsuarioMas width={26} height={26} />
          Nuevo Usuario
        </h1>

        <form onSubmit={alEnviar} noValidate className="au-formulario">
          <div className="au-body">
            {/* Mensajes de estado, arriba del formulario */}
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
                id="nu-nombre"
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
                id="nu-apellido"
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
              <Campo
                id="nu-dni"
                etiqueta="DNI"
                error={errorDe('dni')}
                type="text"
                inputMode="numeric"
                placeholder="Ej: 27845112"
                value={valores.dni}
                onChange={alCambiar('dni')}
                onBlur={alSalirDelCampo('dni')}
              />
              <Campo
                id="nu-email"
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

            <Campo
              id="nu-password"
              etiqueta="Contraseña"
              error={errorDe('password')}
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={valores.password}
              onChange={alCambiar('password')}
              onBlur={alSalirDelCampo('password')}
              autoComplete="new-password"
            />

            <Campo id="nu-rol" etiqueta="Rol" error={errorDe('rol')}>
              {({ id, idError, tieneError }) => (
                <select
                  id={id}
                  className={`ds-campo__input${tieneError ? ' ds-campo__input--error' : ''}`}
                  aria-invalid={tieneError}
                  aria-describedby={tieneError ? idError : undefined}
                  value={valores.rol}
                  onChange={alCambiar('rol')}
                  onBlur={alSalirDelCampo('rol')}
                >
                  <option value="">Seleccionar rol...</option>
                  <option value="administrador">Administrador</option>
                  <option value="camionero">Camionero</option>
                </select>
              )}
            </Campo>

            {/* Bloque adicional: solo se muestra si el rol es camionero */}
            {esCamionero && (
              <div className="au-bloque-camionero">
                <h3 className="au-bloque-camionero__titulo">
                  <IconoCamion />
                  Datos adicionales del camionero
                </h3>

                <div className="ds-fila-2">
                  <Campo
                    id="nu-ubicacion"
                    etiqueta="Ubicación"
                    error={errorDe('ubicacion')}
                    type="text"
                    placeholder="Ej: Paraná, Entre Ríos"
                    value={valores.ubicacion}
                    onChange={alCambiar('ubicacion')}
                    onBlur={alSalirDelCampo('ubicacion')}
                  />
                  <Campo
                    id="nu-tipo_vehiculo"
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
                  id="nu-capacidad_kg"
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

          {/*
            Los botones no toman el foco al apretarlos (evitarFoco). Si lo tomaran,
            el campo que estaba enfocado dispararía su onBlur, aparecería su mensaje
            de error y el botón bajaría ~29px entre el mousedown y el mouseup: el
            mouseup caería al vacío, el click nunca se dispararía y el primer intento
            de registrar no haría nada.
          */}
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
              {enviando ? 'Registrando...' : 'Registrar Usuario'}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
