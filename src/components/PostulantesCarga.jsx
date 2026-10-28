import { useCallback, useEffect, useId, useRef, useState } from 'react';
import ModalConfirmacion from './ModalConfirmacion';
import SugeridosCarga from './SugeridosCarga';
import { IconoAlerta, IconoCamion, IconoCheck, IconoUbicacion } from './Iconos';
import { listarPostulantes } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import { formatearMarcaCorta, formatearPeso } from '../utils/carga';
import { ESTADOS } from '../utils/estadosCarga';
import './PostulantesCarga.css';

/** Cómo se nombra cada estado de una postulación en la lista. */
const ETIQUETAS_POSTULACION = Object.freeze({
  pendiente: 'En espera',
  aceptada: 'Elegida',
  rechazada: 'No elegida',
});

/**
 * Camioneros postulados a una carga y su asignación (HU 4 y HU 6), en el
 * detalle del administrador.
 *
 * La lista muestra lo que hace falta para elegir —vehículo, capacidad, dónde
 * está, si sigue disponible— y cómo terminó cada postulación. La calificación
 * queda para cuando exista la de la HU 11.
 *
 * El modal de asignación vive acá pero lo abre el botón "Asignar camionero"
 * del progreso de la carga, que es donde está el próximo paso de cada estado:
 * por eso su apertura la maneja el detalle. Un solo botón para asignar, y no
 * uno acá y otro en el progreso.
 *
 * @param {object} props
 * @param {object} props.carga - la carga del detalle.
 * @param {number} props.version - cambia después de cada cambio de estado, para volver a pedir la lista.
 * @param {boolean} props.modalAbierto - si el modal de asignación está abierto.
 * @param {function} props.alCerrarModal - cierra el modal sin asignar.
 * @param {function} props.alAsignar - asigna la carga al camionero elegido; recibe su id y puede lanzar `ErrorDeApi`.
 * @returns {JSX.Element}
 */
export default function PostulantesCarga({ carga, version, modalAbierto, alCerrarModal, alAsignar }) {
  const idBase = useId();
  const [postulantes, setPostulantes] = useState([]);
  // 'cargando' | 'ok' | 'error'
  const [estadoPedido, setEstadoPedido] = useState('cargando');
  const [errorPedido, setErrorPedido] = useState('');

  const [elegido, setElegido] = useState(null);
  const [vista, setVista] = useState('postulados');
  const [matchingListo, setMatchingListo] = useState(false);
  const [asignando, setAsignando] = useState(false);
  const [errorAsignacion, setErrorAsignacion] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const refPrimeraOpcion = useRef(null);
  const refAviso = useRef(null);

  // Se vuelve a pedir después de cada cambio de estado (`version`): asignar o
  // volver a pendiente cambian cómo quedó cada postulación. Mientras llega,
  // queda a la vista lo anterior, para que el bloque no parpadee.
  useEffect(() => {
    const controlador = new AbortController();
    setErrorPedido('');

    listarPostulantes(carga.id_carga, { signal: controlador.signal })
      .then((datos) => {
        setPostulantes(datos);
        setEstadoPedido('ok');
      })
      .catch((fallo) => {
        if (fallo?.name === 'AbortError') return;
        setErrorPedido(
          fallo instanceof ErrorDeApi
            ? fallo.message
            : 'No se pudo cargar la lista de camioneros postulados.',
        );
        setEstadoPedido('error');
      });

    return () => controlador.abort();
  }, [carga.id_carga, version]);

  // Cada vez que se abre el modal, arranca sin nadie elegido ni errores viejos.
  useEffect(() => {
    if (modalAbierto) {
      setElegido(null);
      setErrorAsignacion('');
      setVista('postulados');
      setMatchingListo(false);
    }
  }, [modalAbierto]);

  useEffect(() => {
    if (mensajeExito) refAviso.current?.focus({ preventScroll: true });
  }, [mensajeExito]);

  // Volver a pendiente deshace la asignación: el aviso de que se asignó ya no
  // es cierto y se saca.
  useEffect(() => {
    if (carga.estado_actual === ESTADOS.PENDIENTE) setMensajeExito('');
  }, [carga.estado_actual]);

  const enEspera = postulantes.filter((postulante) => postulante.estado === 'pendiente');

  const cerrarModal = useCallback(() => {
    if (!asignando) alCerrarModal();
  }, [asignando, alCerrarModal]);

  /** Aplica la asignación. Un rechazo del backend se muestra dentro del modal. */
  const confirmar = async () => {
    if (elegido === null) return;
    setAsignando(true);
    setErrorAsignacion('');
    try {
      await alAsignar(elegido);
      const camionero = postulantes.find((postulante) => postulante.id_camionero === elegido);
      setMensajeExito(
        camionero
          ? `La carga quedó asignada a ${camionero.nombre} ${camionero.apellido}. A los demás postulados les llegó un aviso.`
          : 'La carga quedó asignada. A los demás postulados les llegó un aviso.',
      );
      // El foco no vuelve al botón que abrió el modal: va al aviso de éxito
      // (ver el efecto de `mensajeExito`), que se dibuja después de cerrar.
      alCerrarModal();
    } catch (fallo) {
      setErrorAsignacion(
        fallo instanceof ErrorDeApi ? fallo.message : 'Ocurrió un error inesperado al asignar la carga.',
      );
    } finally {
      setAsignando(false);
    }
  };

  return (
    <section className="dc-card pp-tarjeta" aria-labelledby={`${idBase}-titulo`}>
      <h2 className="dc-card__titulo" id={`${idBase}-titulo`}>
        Camioneros postulados
        {estadoPedido === 'ok' && postulantes.length > 0 && (
          <span className="pp-contador">({postulantes.length})</span>
        )}
      </h2>

      {mensajeExito && (
        <div className="dc-aviso-exito pp-aviso" role="status" tabIndex={-1} ref={refAviso}>
          <IconoCheck width={20} height={20} />
          {mensajeExito}
        </div>
      )}

      {estadoPedido === 'cargando' && <p className="pp-mensaje">Cargando postulados...</p>}

      {estadoPedido === 'error' && (
        <p className="pp-error" role="alert">
          <IconoAlerta width={18} height={18} />
          {errorPedido}
        </p>
      )}

      {estadoPedido === 'ok' && postulantes.length === 0 && (
        <p className="pp-mensaje">
          Todavía no se postuló ningún camionero. Cuando se postule el primero, la carga pasa a
          pendiente y vas a poder asignarla.
        </p>
      )}

      {estadoPedido === 'ok' && postulantes.length > 0 && (
        <ul className="pp-lista">
          {postulantes.map((postulante) => (
            <li
              key={postulante.id_postulacion}
              className={`pp-item pp-item--${postulante.estado}`}
            >
              <div className="pp-item__cabecera">
                <span className="pp-item__nombre">
                  {postulante.nombre} {postulante.apellido}
                </span>
                <span className={`pp-etiqueta pp-etiqueta--${postulante.estado}`}>
                  {ETIQUETAS_POSTULACION[postulante.estado] ?? postulante.estado}
                </span>
              </div>
              <p className="pp-item__dato">
                <IconoCamion width={16} height={16} />
                {postulante.tipo_vehiculo || 'Vehículo sin cargar'} · capacidad{' '}
                {formatearPeso(postulante.capacidad_kg)}
              </p>
              <p className="pp-item__dato">
                <IconoUbicacion width={16} height={16} />
                {postulante.ubicacion || 'Ubicación sin cargar'}
                {postulante.disponibilidad === false && ' · ahora no está disponible'}
              </p>
              <p className="pp-item__fecha">
                Se postuló: {formatearMarcaCorta(postulante.fecha_postulacion)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <ModalConfirmacion
        abierto={modalAbierto}
        titulo="Asignar camionero"
        detalle="Elegí a quién asignarle la carga. Al confirmar, el viaje queda aceptado y a los demás postulados les llega un aviso."
        error={errorAsignacion}
        textoConfirmar="Confirmar asignación"
        textoVolver="Volver"
        aplicando={asignando}
        variante="confirmar"
        confirmarDeshabilitado={elegido === null || (vista === 'sugeridos' && !matchingListo)}
        refFocoInicial={vista === 'postulados' && enEspera.length > 0 ? refPrimeraOpcion : undefined}
        alConfirmar={confirmar}
        alCancelar={cerrarModal}
      >
        <div className="pp-vistas" role="group" aria-label="Vista de camioneros">
          {[['postulados', 'Postulados'], ['sugeridos', 'Sugeridos']].map(([valor, etiqueta]) => (
            <button type="button" key={valor} aria-pressed={vista === valor}
              disabled={asignando} className={`pp-vista${vista === valor ? ' pp-vista--activa' : ''}`}
              onClick={() => {
                if (vista === valor) return;
                setVista(valor);
                setElegido(null);
                setErrorAsignacion('');
                setMatchingListo(false);
              }}>
              {etiqueta}
            </button>
          ))}
        </div>
        {modalAbierto && vista === 'sugeridos' && (
          <SugeridosCarga idCarga={carga.id_carga} version={version} elegido={elegido}
            alElegir={setElegido} alListo={setMatchingListo} asignando={asignando} />
        )}
        {vista === 'postulados' && (enEspera.length > 0 ? (
          <fieldset className="pp-opciones">
            <legend className="pp-oculto">Camioneros postulados en espera</legend>
            {enEspera.map((postulante, indice) => (
              <label
                key={postulante.id_postulacion}
                className={`pp-opcion${elegido === postulante.id_camionero ? ' pp-opcion--elegida' : ''}`}
              >
                <input
                  type="radio"
                  name={`${idBase}-camionero`}
                  value={postulante.id_camionero}
                  checked={elegido === postulante.id_camionero}
                  onChange={() => setElegido(postulante.id_camionero)}
                  ref={indice === 0 ? refPrimeraOpcion : undefined}
                  disabled={asignando}
                />
                <span className="pp-opcion__texto">
                  <span className="pp-opcion__nombre">
                    {postulante.nombre} {postulante.apellido}
                  </span>
                  <span className="pp-opcion__dato">
                    {postulante.tipo_vehiculo || 'Vehículo sin cargar'} ·{' '}
                    {formatearPeso(postulante.capacidad_kg)}
                    {postulante.ubicacion ? ` · ${postulante.ubicacion}` : ''}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="pp-mensaje pp-mensaje--modal">
            No hay camioneros en espera para esta carga.
          </p>
        ))}
      </ModalConfirmacion>
    </section>
  );
}
