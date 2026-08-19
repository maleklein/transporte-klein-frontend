import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearCarga, ErrorDeValidacion } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import {
  IconoAlerta,
  IconoCajaMas,
  IconoCamion,
  IconoCerrar,
  IconoCheck,
  IconoGuardar,
} from '../components/Iconos';
import Campo from '../components/Campo';
import './AltaCarga.css';

const VALORES_INICIALES = {
  origen: '',
  destino: '',
  tipo_carga: '',
  peso: '',
  fecha: '',
  observaciones: '',
};

/**
 * Reglas de validación del formulario, evaluadas en tiempo real.
 * Replican lo que valida el backend en `POST /cargas`, para que el usuario
 * vea el error antes de mandar el formulario.
 *
 * @param {typeof VALORES_INICIALES} valores - valores actuales del formulario.
 * @returns {object} mapa `{ campo: mensaje }` con un error por cada campo inválido.
 */
function validar(valores) {
  const errores = {};

  if (!valores.origen.trim()) {
    errores.origen = 'Ingresá el origen de la carga.';
  }

  if (!valores.destino.trim()) {
    errores.destino = 'Ingresá el destino de la carga.';
  }

  if (!valores.tipo_carga.trim()) {
    errores.tipo_carga = 'Ingresá el tipo de carga.';
  }

  if (!String(valores.peso).trim()) {
    errores.peso = 'Ingresá el peso en kilos.';
  } else if (Number.isNaN(Number(valores.peso))) {
    errores.peso = 'El peso debe ser un número.';
  } else if (!(Number(valores.peso) > 0)) {
    errores.peso = 'El peso debe ser mayor a cero.';
  }

  if (!valores.fecha.trim()) {
    errores.fecha = 'Elegí la fecha de la carga.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(valores.fecha)) {
    errores.fecha = 'La fecha debe tener el formato día/mes/año.';
  }

  if (!valores.observaciones.trim()) {
    errores.observaciones = 'Ingresá las observaciones de la carga.';
  }

  return errores;
}

/**
 * Arma el cuerpo del POST a partir de los valores del formulario.
 *
 * @param {typeof VALORES_INICIALES} valores - valores actuales del formulario.
 * @returns {object} payload listo para `crearCarga`.
 */
function armarPayload(valores) {
  return {
    origen: valores.origen.trim(),
    destino: valores.destino.trim(),
    tipo_carga: valores.tipo_carga.trim(),
    peso: Number(valores.peso),
    fecha: valores.fecha,
    observaciones: valores.observaciones.trim(),
  };
}

/**
 * Pantalla de alta de cargas (HU 2.1 + 2.1.1), en la ruta /cargas/nueva.
 * La carga se guarda siempre en estado "disponible".
 *
 * @returns {JSX.Element}
 */
export default function AltaCarga() {
  const navigate = useNavigate();

  const [valores, setValores] = useState(VALORES_INICIALES);
  const [tocados, setTocados] = useState({});
  const [erroresBackend, setErroresBackend] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const refPrimerCampo = useRef(null);

  const erroresValidacion = validar(valores);
  const formularioValido = Object.keys(erroresValidacion).length === 0;

  /**
   * Un error se muestra si el backend lo devolvió, o si el usuario ya tocó el campo.
   *
   * @param {string} campo - nombre del campo (ej: "origen", "peso").
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

  /**
   * Cancela el alta y vuelve a la pantalla anterior, sin registrar nada.
   *
   * @returns {void}
   */
  const cancelar = () => navigate(-1);

  /**
   * Deja el formulario listo para cargar otra carga, conservando el mensaje
   * de éxito de la anterior.
   *
   * @returns {void}
   */
  const cargarOtra = () => {
    setValores(VALORES_INICIALES);
    setTocados({});
    setErroresBackend({});
    setIntentoEnviar(false);
    setMensajeExito('');
    refPrimerCampo.current?.focus();
  };

  /**
   * Crea el manejador `onChange` de un campo del formulario.
   *
   * @param {string} campo - nombre del campo a actualizar.
   * @returns {function(evento: Event): void}
   */
  const alCambiar = (campo) => (evento) => {
    const { value } = evento.target;

    setValores((previos) => ({ ...previos, [campo]: value }));

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
   * Maneja el submit: valida, registra la carga contra el backend y muestra
   * el mensaje de éxito. No navega solo, porque el listado de cargas todavía
   * no existe (llega con HU 2.5 / GIA-37).
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
      document.getElementById(`nc-${primerCampoConError}`)?.focus();
      return;
    }

    setEnviando(true);

    try {
      const cargaCreada = await crearCarga(armarPayload(valores));

      setMensajeExito(
        `La carga ${cargaCreada.origen} → ${cargaCreada.destino} se registró correctamente y quedó en estado "${cargaCreada.estado_actual}".`,
      );
    } catch (error) {
      if (error instanceof ErrorDeValidacion) {
        // El backend devuelve los errores ya agrupados por campo.
        setErroresBackend(error.errores);
        setTocados((previos) => ({ ...previos, ...error.errores }));

        const primerCampo = Object.keys(error.errores)[0];
        document.getElementById(`nc-${primerCampo}`)?.focus();
      } else {
        setErrorGeneral(
          error instanceof ErrorDeApi
            ? error.message
            : 'Ocurrió un error inesperado al registrar la carga.',
        );
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      <main className="ac-contenido">
        <h1 className="ac-titulo">
          <IconoCajaMas width={26} height={26} />
          Nueva Carga
        </h1>

        <form onSubmit={alEnviar} noValidate className="ac-formulario">
          <div className="ac-body">
            {/* Mensajes de estado, arriba del formulario */}
            {mensajeExito && (
              <div className="ac-aviso ac-aviso--exito" role="status">
                <IconoCheck />
                {mensajeExito}
              </div>
            )}

            {errorGeneral && (
              <div className="ac-aviso ac-aviso--error" role="alert">
                <IconoAlerta width={22} height={22} />
                {errorGeneral}
              </div>
            )}

            <div className="ds-fila-2">
              <Campo
                id="nc-origen"
                etiqueta="Origen"
                error={errorDe('origen')}
                refInput={refPrimerCampo}
                type="text"
                placeholder="Ej: Paraná, Entre Ríos"
                value={valores.origen}
                onChange={alCambiar('origen')}
                onBlur={alSalirDelCampo('origen')}
              />
              <Campo
                id="nc-destino"
                etiqueta="Destino"
                error={errorDe('destino')}
                type="text"
                placeholder="Ej: Rosario, Santa Fe"
                value={valores.destino}
                onChange={alCambiar('destino')}
                onBlur={alSalirDelCampo('destino')}
              />
            </div>

            <div className="ds-fila-2">
              <Campo
                id="nc-tipo_carga"
                etiqueta="Tipo de carga"
                error={errorDe('tipo_carga')}
                type="text"
                placeholder="Ej: Granos a granel"
                value={valores.tipo_carga}
                onChange={alCambiar('tipo_carga')}
                onBlur={alSalirDelCampo('tipo_carga')}
              />
              <Campo
                id="nc-peso"
                etiqueta="Peso (kg)"
                error={errorDe('peso')}
                type="number"
                min="1"
                step="0.01"
                placeholder="Ej: 12500"
                value={valores.peso}
                onChange={alCambiar('peso')}
                onBlur={alSalirDelCampo('peso')}
              />
            </div>

            <Campo
              id="nc-fecha"
              etiqueta="Fecha"
              error={errorDe('fecha')}
              type="date"
              value={valores.fecha}
              onChange={alCambiar('fecha')}
              onBlur={alSalirDelCampo('fecha')}
            />

            <Campo id="nc-observaciones" etiqueta="Observaciones" error={errorDe('observaciones')}>
              {({ id, idError, tieneError }) => (
                <textarea
                  id={id}
                  rows={4}
                  className={`ds-campo__input ac-textarea${tieneError ? ' ds-campo__input--error' : ''}`}
                  aria-invalid={tieneError}
                  aria-describedby={tieneError ? idError : undefined}
                  placeholder="Ej: Descargar por la mañana. Requiere lona."
                  value={valores.observaciones}
                  onChange={alCambiar('observaciones')}
                  onBlur={alSalirDelCampo('observaciones')}
                />
              )}
            </Campo>
          </div>

          <div className="ac-footer">
            <button
              type="button"
              className="ds-boton ds-boton--cancelar"
              onClick={cancelar}
              disabled={enviando}
            >
              <IconoCerrar />
              Cancelar
            </button>

            {mensajeExito ? (
              <button type="button" className="ds-boton ds-boton--primario" onClick={cargarOtra}>
                <IconoCajaMas />
                Cargar otra
              </button>
            ) : (
              <button type="submit" className="ds-boton ds-boton--confirmar" disabled={enviando}>
                <IconoGuardar />
                {enviando ? 'Registrando...' : 'Registrar Carga'}
              </button>
            )}
          </div>
        </form>
      </main>
    </>
  );
}
