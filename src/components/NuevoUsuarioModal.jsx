import { useEffect, useRef, useState } from 'react';
import { crearUsuario, ErrorDeApi } from '../api/usuarios';
import {
  IconoAlerta,
  IconoCamion,
  IconoCerrar,
  IconoCheck,
  IconoGuardar,
  IconoUsuarioMas,
} from './Iconos';
import './NuevoUsuarioModal.css';

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
 * Campo de formulario reutilizable.
 * Se define fuera del componente del modal a propósito: si estuviera adentro,
 * React lo volvería a montar en cada tecla y el input perdería el foco.
 */
function Campo({
  id,
  etiqueta,
  error,
  obligatorio = true,
  children,
  refInput,
  ...propsInput
}) {
  const idError = `${id}-error`;

  return (
    <div className="ds-campo">
      {/* El label va siempre arriba del campo, no como placeholder */}
      <label className="ds-campo__label" htmlFor={id}>
        {etiqueta}
        {obligatorio && (
          <span className="ds-campo__obligatorio" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children ? (
        children({ id, idError, tieneError: Boolean(error) })
      ) : (
        <input
          id={id}
          ref={refInput}
          className={`ds-campo__input${error ? ' ds-campo__input--error' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? idError : undefined}
          {...propsInput}
        />
      )}

      {error && (
        <span className="ds-campo__error" id={idError} role="alert">
          <IconoAlerta />
          {error}
        </span>
      )}
    </div>
  );
}

/** Reglas de validación del formulario, evaluadas en tiempo real. */
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

/** Arma el cuerpo del POST: los datos de camionero solo viajan si corresponde. */
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
 * Modal de alta de usuarios (HU 1.1).
 *
 * @param {boolean}  abierto           si el modal se muestra
 * @param {function} onCerrar          se llama al cancelar o cerrar
 * @param {function} onUsuarioCreado   recibe el usuario creado por el backend (201)
 */
export default function NuevoUsuarioModal({ abierto, onCerrar, onUsuarioCreado }) {
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [tocados, setTocados] = useState({});
  const [erroresBackend, setErroresBackend] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const refModal = useRef(null);
  const refPrimerCampo = useRef(null);
  const refTemporizador = useRef(null);

  const erroresValidacion = validar(valores);
  const formularioValido = Object.keys(erroresValidacion).length === 0;

  /** Un error se muestra si el backend lo devolvió, o si el usuario ya tocó el campo. */
  const errorDe = (campo) => {
    if (erroresBackend[campo]) return erroresBackend[campo];
    if (tocados[campo] || intentoEnviar) return erroresValidacion[campo];
    return undefined;
  };

  // Al abrir: estado limpio y foco en el primer campo.
  useEffect(() => {
    if (!abierto) return;

    setValores(VALORES_INICIALES);
    setTocados({});
    setErroresBackend({});
    setErrorGeneral('');
    setMensajeExito('');
    setIntentoEnviar(false);
    setEnviando(false);

    const foco = setTimeout(() => refPrimerCampo.current?.focus(), 60);
    return () => clearTimeout(foco);
  }, [abierto]);

  // Limpia el cierre diferido si el modal se desmonta antes de tiempo.
  useEffect(() => () => clearTimeout(refTemporizador.current), []);

  // Escape para cerrar y Tab atrapado dentro del modal.
  useEffect(() => {
    if (!abierto) return;

    const alPresionarTecla = (evento) => {
      if (evento.key === 'Escape' && !enviando) {
        onCerrar();
        return;
      }

      if (evento.key !== 'Tab') return;

      const focusables = refModal.current?.querySelectorAll(
        'button, input, select, textarea, [href]',
      );
      if (!focusables?.length) return;

      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [abierto, enviando, onCerrar]);

  if (!abierto) return null;

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

  const alSalirDelCampo = (campo) => () => {
    setTocados((previos) => ({ ...previos, [campo]: true }));
  };

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

      // Actualiza la lista en pantalla sin recargar la página.
      onUsuarioCreado?.(usuarioCreado);

      // Se deja ver el mensaje de éxito antes de cerrar el modal.
      refTemporizador.current = setTimeout(() => onCerrar(), 1800);
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
    <div
      className="nu-overlay"
      onMouseDown={(evento) => {
        // Cierra solo si el click empezó en el fondo, no dentro del modal.
        if (evento.target === evento.currentTarget && !enviando) onCerrar();
      }}
    >
      <div
        className="nu-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nu-titulo"
        ref={refModal}
      >
        <div className="nu-header">
          <h2 className="nu-header__titulo" id="nu-titulo">
            <IconoUsuarioMas width={26} height={26} />
            Nuevo Usuario
          </h2>
          <button
            type="button"
            className="nu-header__cerrar"
            onClick={onCerrar}
            disabled={enviando}
            aria-label="Cerrar ventana"
            title="Cerrar ventana"
          >
            <IconoCerrar />
          </button>
        </div>

        <form onSubmit={alEnviar} noValidate>
          <div className="nu-body">
            {/* Mensajes de estado, arriba del formulario */}
            {mensajeExito && (
              <div className="nu-aviso nu-aviso--exito" role="status">
                <IconoCheck />
                {mensajeExito}
              </div>
            )}

            {errorGeneral && (
              <div className="nu-aviso nu-aviso--error" role="alert">
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
              <div className="nu-bloque-camionero">
                <h3 className="nu-bloque-camionero__titulo">
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

          <div className="nu-footer">
            <button
              type="button"
              className="ds-boton ds-boton--cancelar"
              onClick={onCerrar}
              disabled={enviando}
            >
              <IconoCerrar />
              Cancelar
            </button>
            <button
              type="submit"
              className="ds-boton ds-boton--confirmar"
              disabled={enviando || Boolean(mensajeExito)}
            >
              <IconoGuardar />
              {enviando ? 'Registrando...' : 'Registrar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
