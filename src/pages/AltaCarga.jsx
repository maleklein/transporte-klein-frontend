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
import SelectorUbicacion from '../components/SelectorUbicacion';
import { evitarFoco } from '../utils/formulario';
import { VALORES_INICIALES, LARGOS_MAXIMOS, validar, armarPayload } from '../utils/validarCarga';
import './AltaCarga.css';

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
  /**
   * Aplica varios campos de una sola vez y limpia sus errores del backend.
   *
   * Existe porque el selector de ubicación cambia dos campos juntos: al elegir
   * otra provincia hay que borrar la localidad, que ya no pertenece a ella.
   * Hacerlo en dos llamadas separadas dejaría un render intermedio con una
   * localidad de la provincia anterior.
   *
   * @param {object} cambios - campos a actualizar, `{ campo: valor }`.
   * @returns {void}
   */
  const alCambiarCampos = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }));

    // Al corregir un campo, el error del backend deja de aplicar.
    setErroresBackend((previos) => {
      const claves = Object.keys(cambios).filter((campo) => previos[campo]);
      if (claves.length === 0) return previos;
      const siguientes = { ...previos };
      for (const campo of claves) delete siguientes[campo];
      return siguientes;
    });

    setErrorGeneral('');
  };

  const alCambiar = (campo) => (evento) => {
    alCambiarCampos({ [campo]: evento.target.value });
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

            <SelectorUbicacion
              prefijo="nc"
              nombre="origen"
              etiqueta="Origen"
              valores={valores}
              errorDe={errorDe}
              alCambiarCampos={alCambiarCampos}
              alSalirDelCampo={alSalirDelCampo}
              refProvincia={refPrimerCampo}
            />

            <SelectorUbicacion
              prefijo="nc"
              nombre="destino"
              etiqueta="Destino"
              valores={valores}
              errorDe={errorDe}
              alCambiarCampos={alCambiarCampos}
              alSalirDelCampo={alSalirDelCampo}
            />

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
