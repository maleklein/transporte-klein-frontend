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
import { evitarFoco } from '../utils/formulario';
import './AltaCarga.css';

/**
 * Valores con los que arranca el formulario (todos los campos vacíos).
 * Se usa para inicializar el estado y para dejarlo limpio al cargar otra carga.
 */
const VALORES_INICIALES = {
  origen: '',
  destino: '',
  tipo_carga: '',
  peso: '',
  fecha: '',
  observaciones: '',
};

/**
 * Largo máximo de cada campo de texto. Son los mismos números que valida el
 * backend, que a su vez salen del tamaño de las columnas en la tabla CARGA.
 * Se usan tanto para el `maxLength` del input como para el mensaje de error.
 */
const LARGOS_MAXIMOS = {
  origen: 255,
  destino: 255,
  tipo_carga: 100,
  observaciones: 1000,
};

/**
 * Rango de peso que soporta la columna `peso DECIMAL(10, 2)`.
 * El mínimo no es cero: 0,001 kg se redondearía a 0,00 al guardarse.
 */
const PESO_MINIMO = 0.01;
const PESO_MAXIMO = 99999999.99;

/** Años aceptados, alineados con el backend. */
const ANIO_MINIMO = 1900;
const ANIO_MAXIMO = 2100;

/**
 * Interpreta el peso escrito por el usuario. Acepta la coma decimal, que es
 * como se escribe acá ("12,5"), y la convierte al punto que espera el backend.
 *
 * @param {string} valor - lo que hay escrito en el input de peso.
 * @returns {number} el peso como número, o NaN si no se puede interpretar.
 */
function parsearPeso(valor) {
  return Number(String(valor).replace(',', '.').trim());
}

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
  } else if (valores.origen.trim().length > LARGOS_MAXIMOS.origen) {
    errores.origen = `El origen no puede superar los ${LARGOS_MAXIMOS.origen} caracteres.`;
  }

  if (!valores.destino.trim()) {
    errores.destino = 'Ingresá el destino de la carga.';
  } else if (valores.destino.trim().length > LARGOS_MAXIMOS.destino) {
    errores.destino = `El destino no puede superar los ${LARGOS_MAXIMOS.destino} caracteres.`;
  }

  if (!valores.tipo_carga.trim()) {
    errores.tipo_carga = 'Ingresá el tipo de carga.';
  } else if (valores.tipo_carga.trim().length > LARGOS_MAXIMOS.tipo_carga) {
    errores.tipo_carga = `El tipo de carga no puede superar los ${LARGOS_MAXIMOS.tipo_carga} caracteres.`;
  }

  const peso = parsearPeso(valores.peso);

  if (!String(valores.peso).trim()) {
    errores.peso = 'Ingresá el peso en kilos.';
  } else if (!Number.isFinite(peso)) {
    errores.peso = 'El peso debe ser un número.';
  } else if (peso < PESO_MINIMO) {
    errores.peso = `El peso debe ser de al menos ${PESO_MINIMO} kg.`;
  } else if (peso > PESO_MAXIMO) {
    errores.peso = 'El peso es demasiado grande. Revisá el valor.';
  }

  if (!valores.fecha.trim()) {
    errores.fecha = 'Elegí la fecha de la carga.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(valores.fecha)) {
    errores.fecha = 'La fecha debe tener el formato día/mes/año.';
  } else {
    // El input date deja tipear años de 5 cifras y fechas del año 1, que la
    // base no soporta. Se acota acá para no terminar en un error del servidor.
    const anio = Number(valores.fecha.slice(0, 4));
    if (anio < ANIO_MINIMO || anio > ANIO_MAXIMO) {
      errores.fecha = `El año debe estar entre ${ANIO_MINIMO} y ${ANIO_MAXIMO}.`;
    }
  }

  if (!valores.observaciones.trim()) {
    errores.observaciones = 'Ingresá las observaciones de la carga.';
  } else if (valores.observaciones.trim().length > LARGOS_MAXIMOS.observaciones) {
    errores.observaciones = `Las observaciones no pueden superar los ${LARGOS_MAXIMOS.observaciones} caracteres.`;
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
    // Se manda como número para que el backend reciba el punto decimal aunque
    // el usuario haya escrito con coma.
    peso: parsearPeso(valores.peso),
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

  // Estado del formulario: valores cargados, campos ya tocados por el usuario,
  // errores devueltos por el backend, mensajes generales y de éxito, y si ya
  // se intentó enviar o hay un envío en curso.
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [tocados, setTocados] = useState({});
  const [erroresBackend, setErroresBackend] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // refPrimerCampo: input de "Origen", para ponerle el foco al entrar a la
  // pantalla y para volver a enfocarlo después de cargar otra carga.
  const refPrimerCampo = useRef(null);

  // Se recalculan en cada render: qué campos tienen error ahora mismo,
  // y si el formulario está en condiciones de enviarse.
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
                maxLength={LARGOS_MAXIMOS.origen}
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
                maxLength={LARGOS_MAXIMOS.destino}
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
                maxLength={LARGOS_MAXIMOS.tipo_carga}
                placeholder="Ej: Granos a granel"
                value={valores.tipo_carga}
                onChange={alCambiar('tipo_carga')}
                onBlur={alSalirDelCampo('tipo_carga')}
              />
              {/*
                Es type="text" y no type="number" a propósito: el input numérico
                descarta la coma decimal mientras se tipea, y acá se quiere poder
                escribir "12,5" como se escribe en Argentina. inputMode="decimal"
                igual saca el teclado numérico en el celular.
              */}
              <Campo
                id="nc-peso"
                etiqueta="Peso (kg)"
                error={errorDe('peso')}
                type="text"
                inputMode="decimal"
                maxLength={15}
                placeholder="Ej: 12500 o 12,5"
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
                  maxLength={LARGOS_MAXIMOS.observaciones}
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

          {/*
            Los botones no toman el foco al apretarlos (evitarFoco). Si lo tomaran,
            el campo que estaba enfocado dispararía su onBlur, aparecería su mensaje
            de error y el botón bajaría ~29px entre el mousedown y el mouseup: el
            mouseup caería al vacío, el click nunca se dispararía y el primer intento
            de registrar no haría nada.
          */}
          <div className="ac-footer">
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

            {mensajeExito ? (
              <button
                type="button"
                className="ds-boton ds-boton--primario"
                onClick={cargarOtra}
                onMouseDown={evitarFoco}
              >
                <IconoCajaMas />
                Cargar otra
              </button>
            ) : (
              <button
                type="submit"
                className="ds-boton ds-boton--confirmar"
                onMouseDown={evitarFoco}
                disabled={enviando}
              >
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
