import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { editarCarga, ErrorDeValidacion, obtenerCarga } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import {
  IconoAlerta,
  IconoCamion,
  IconoCerrar,
  IconoCheck,
  IconoEditar,
  IconoFlechaAtras,
  IconoGuardar,
} from '../components/Iconos';
import Campo from '../components/Campo';
import { evitarFoco } from '../utils/formulario';
import { LARGOS_MAXIMOS, validar, armarPayload } from '../utils/validarCarga';
import { ESTADOS_BLOQUEADOS_EDICION } from '../utils/carga';
import { etiquetaEstado, motivoEdicionBloqueada } from '../utils/estadosCarga';
import './AltaCarga.css';
import './EditarCarga.css';

/**
 * Arma los valores del formulario a partir de la carga que devuelve
 * `GET /cargas/:id`.
 *
 * @param {object} carga - carga a editar.
 * @returns {object} valores iniciales del formulario, en el mismo formato que `VALORES_INICIALES`.
 */
function valoresDesdeCarga(carga) {
  return {
    origen: carga.origen ?? '',
    destino: carga.destino ?? '',
    tipo_carga: carga.tipo_carga ?? '',
    peso: String(carga.peso_kg ?? ''),
    fecha: carga.fecha ?? '',
    observaciones: carga.observaciones ?? '',
  };
}

/**
 * Pantalla de edición de cargas (HU 2.2), en la ruta /cargas/:id/editar.
 *
 * Precarga el formulario con `GET /cargas/:id` y reutiliza la misma
 * validación, componentes y patrón de estado que `AltaCarga.jsx` (ver
 * `utils/validarCarga.js`: `validar`, `armarPayload`, `LARGOS_MAXIMOS`). Al
 * guardar manda `PUT /cargas/:id` en vez de `POST /cargas`.
 *
 * Si la carga ya está en un estado que no admite edición ('en_viaje' o
 * 'entregada') — detectado al cargarla, o devuelto como 409 al guardar si
 * cambió de estado mientras se estaba completando el formulario — el
 * formulario se reemplaza por un aviso y no se puede reintentar el guardado.
 *
 * @returns {JSX.Element}
 */
export default function EditarCarga() {
  const navigate = useNavigate();
  const { id } = useParams();

  // 'cargando' | 'ok' | 'no-encontrada' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');
  // Motivo por el que ya no se puede guardar (carga en_viaje/entregada), sea
  // porque ya estaba así al cargarla o porque el backend lo devolvió como 409
  // al intentar guardar. Mientras esté seteado, no se muestra el formulario.
  const [mensajeBloqueo, setMensajeBloqueo] = useState('');

  const [valores, setValores] = useState(null);
  const [tocados, setTocados] = useState({});
  const [erroresBackend, setErroresBackend] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const refPrimerCampo = useRef(null);
  const refTemporizador = useRef(null);

  const erroresValidacion = valores ? validar(valores) : {};
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

  // Trae la carga al entrar (o si cambia el id en la URL).
  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPantalla('cargando');
    setMensajeError('');

    obtenerCarga(id, { signal: controlador.signal })
      .then((datos) => {
        if (ESTADOS_BLOQUEADOS_EDICION.includes(datos.estado_actual)) {
          setMensajeBloqueo(
            `No se puede editar esta carga: está en estado "${etiquetaEstado(datos.estado_actual)}". ${motivoEdicionBloqueada(datos.estado_actual)}`,
          );
        } else {
          setValores(valoresDesdeCarga(datos));
        }
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        if (error instanceof ErrorDeApi && error.estado === 404) {
          setEstadoPantalla('no-encontrada');
          return;
        }
        setMensajeError(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudo cargar la carga. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, [id]);

  // Foco en el primer campo apenas el formulario está listo para editarse.
  useEffect(() => {
    if (estadoPantalla !== 'ok' || mensajeBloqueo) return;
    const foco = setTimeout(() => refPrimerCampo.current?.focus(), 60);
    return () => clearTimeout(foco);
  }, [estadoPantalla, mensajeBloqueo]);

  useEffect(() => () => clearTimeout(refTemporizador.current), []);

  /**
   * Cancela la edición y vuelve al detalle de la carga, sin guardar nada.
   *
   * @returns {void}
   */
  const cancelar = () => navigate(`/cargas/${id}`);

  /**
   * Crea el manejador `onChange` de un campo del formulario.
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
   * Maneja el submit: valida, guarda los cambios con `PUT /cargas/:id` y, si
   * sale bien, muestra el mensaje de éxito y vuelve al detalle de la carga.
   * Un 409 (la carga pasó a un estado que ya no admite edición mientras se
   * completaba el formulario) bloquea el formulario en vez de dejar reintentar.
   *
   * @param {import('react').FormEvent} evento
   * @returns {Promise<void>}
   */
  const alEnviar = async (evento) => {
    evento.preventDefault();
    setIntentoEnviar(true);
    setErrorGeneral('');

    if (!formularioValido) {
      const primerCampoConError = Object.keys(erroresValidacion)[0];
      document.getElementById(`ec-${primerCampoConError}`)?.focus();
      return;
    }

    setEnviando(true);

    try {
      const cargaActualizada = await editarCarga(id, armarPayload(valores));

      setMensajeExito(
        `La carga ${cargaActualizada.origen} → ${cargaActualizada.destino} se actualizó correctamente.`,
      );

      refTemporizador.current = setTimeout(() => {
        navigate(`/cargas/${id}`);
      }, 1500);
    } catch (error) {
      if (error instanceof ErrorDeValidacion) {
        // El backend devuelve los errores ya agrupados por campo.
        setErroresBackend(error.errores);
        setTocados((previos) => ({ ...previos, ...error.errores }));

        const primerCampo = Object.keys(error.errores)[0];
        document.getElementById(`ec-${primerCampo}`)?.focus();
        setEnviando(false);
      } else if (error instanceof ErrorDeApi && error.estado === 409) {
        setMensajeBloqueo(error.message);
      } else {
        setErrorGeneral(
          error instanceof ErrorDeApi
            ? error.message
            : 'Ocurrió un error inesperado al guardar los cambios.',
        );
        setEnviando(false);
      }
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
          <IconoEditar width={26} height={26} />
          Editar Carga
        </h1>

        {estadoPantalla === 'cargando' && <p className="ec-mensaje">Cargando carga...</p>}

        {estadoPantalla === 'no-encontrada' && (
          <div className="ac-aviso ac-aviso--error" role="alert">
            <IconoAlerta width={22} height={22} />
            No encontramos la carga #{id}. Puede que se haya eliminado o que la dirección sea
            incorrecta.
          </div>
        )}

        {estadoPantalla === 'error' && (
          <div className="ac-aviso ac-aviso--error" role="alert">
            <IconoAlerta width={22} height={22} />
            {mensajeError}
          </div>
        )}

        {estadoPantalla === 'ok' && mensajeBloqueo && (
          <div className="ec-bloqueo">
            <div className="ac-aviso ac-aviso--error" role="alert">
              <IconoAlerta width={22} height={22} />
              {mensajeBloqueo}
            </div>
            <button
              type="button"
              className="ds-boton ds-boton--secundario"
              onClick={cancelar}
              onMouseDown={evitarFoco}
            >
              <IconoFlechaAtras />
              Volver al detalle
            </button>
          </div>
        )}

        {estadoPantalla === 'ok' && valores && !mensajeBloqueo && (
          <form onSubmit={alEnviar} noValidate className="ac-formulario">
            <div className="ac-body">
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
                  id="ec-origen"
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
                  id="ec-destino"
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
                  id="ec-tipo_carga"
                  etiqueta="Tipo de carga"
                  error={errorDe('tipo_carga')}
                  type="text"
                  maxLength={LARGOS_MAXIMOS.tipo_carga}
                  placeholder="Ej: Granos a granel"
                  value={valores.tipo_carga}
                  onChange={alCambiar('tipo_carga')}
                  onBlur={alSalirDelCampo('tipo_carga')}
                />
                <Campo
                  id="ec-peso"
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
                id="ec-fecha"
                etiqueta="Fecha"
                error={errorDe('fecha')}
                type="date"
                value={valores.fecha}
                onChange={alCambiar('fecha')}
                onBlur={alSalirDelCampo('fecha')}
              />

              <Campo id="ec-observaciones" etiqueta="Observaciones" error={errorDe('observaciones')}>
                {({ id: idCampo, idError, tieneError }) => (
                  <textarea
                    id={idCampo}
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
        )}
      </main>
    </>
  );
}
