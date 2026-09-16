import { useEffect, useId, useRef, useState } from 'react';
import { IconoAlerta, IconoCerrar, IconoCheck } from './Iconos';
import { ErrorDeApi } from '../api/usuarios';
import { formatearFechaLarga, formatearMarcaCorta } from '../utils/carga';
import { evitarFoco } from '../utils/formulario';
import {
  ESTADOS,
  FLUJO,
  esCorreccion,
  etiquetaEstado,
  puedeTransicionar,
  requiereConfirmacion,
  transicionesDesde,
} from '../utils/estadosCarga';
import './ProgresoCarga.css';

/**
 * Textos del panel de estado actual, todos juntos para poder ajustarlos sin
 * tener que recorrer el componente. Por cada estado:
 *
 * - `titulo` y `detalle`: qué está pasando ahora y qué se espera después.
 * - `accion`: el botón que avanza el ciclo. Dice la acción y no el nombre del
 *   estado, porque leído suelto "Pendiente" es un sustantivo y "Marcar como
 *   pendiente" dice qué va a pasar al apretarlo.
 * - `aviso`: el texto del aviso temporal al *llegar* a ese estado avanzando.
 *
 * Los textos de retroceder ("Volver a X", "La carga volvió a X") no están acá
 * porque salen del nombre del estado destino sin excepciones.
 */
const TEXTOS = Object.freeze({
  [ESTADOS.DISPONIBLE]: {
    titulo: 'Publicada, esperando transportista',
    detalle: 'Los transportistas ya la pueden ver. Cuando uno la pida, pasala a pendiente.',
    accion: 'Marcar como pendiente',
    // A "disponible" sólo se llega volviendo atrás, y ese aviso se arma con el
    // nombre del estado, así que acá no hace falta.
    aviso: null,
  },
  [ESTADOS.PENDIENTE]: {
    titulo: 'Falta confirmar el acuerdo',
    detalle: 'Un transportista pidió esta carga. Cuando confirmen el viaje, marcala como aceptada.',
    accion: 'Marcar como aceptada',
    aviso: 'Carga marcada como pendiente',
  },
  [ESTADOS.ACEPTADA]: {
    titulo: 'Viaje confirmado',
    detalle: 'Cuando el camión salga con la carga, marcala en viaje.',
    accion: 'Marcar en viaje',
    aviso: 'Carga marcada como aceptada',
  },
  [ESTADOS.EN_VIAJE]: {
    titulo: 'Camino al destino',
    detalle: 'Cuando llegue y se descargue, marcala como entregada.',
    accion: 'Marcar como entregada',
    aviso: 'Carga marcada en viaje',
  },
  [ESTADOS.ENTREGADA]: {
    titulo: 'Carga entregada',
    detalle: 'Llegó a destino. No quedan más pasos.',
    accion: null,
    aviso: 'Carga marcada como entregada',
  },
  [ESTADOS.CANCELADA]: {
    titulo: 'Carga cancelada',
    // El detalle se arma con la fecha real de la cancelación (ver `panel`).
    detalle: null,
    accion: null,
    aviso: 'Carga cancelada',
  },
});

/**
 * Textos de las dos transiciones que no se pueden deshacer y por eso se
 * confirman antes de aplicarse.
 *
 * Están las dos que llevan a un estado final: cancelar (lo exige HU 2.4) y
 * marcar como entregada. La segunda no es destructiva pero sí definitiva —
 * `entregada` es terminal por RN-01 —, así que se pregunta igual, aunque sin
 * el rojo de una acción peligrosa.
 *
 * El texto de cancelar no menciona ningún aviso al transportista porque el
 * sistema todavía no manda notificaciones: sólo saca la carga del listado.
 */
const CONFIRMACIONES = Object.freeze({
  [ESTADOS.CANCELADA]: {
    titulo: '¿Cancelar esta carga?',
    detalle: 'Deja de aparecer en el listado de cargas. No se puede deshacer.',
    confirmar: 'Sí, cancelar carga',
    volver: 'No, mantenerla',
    peligroso: true,
  },
  [ESTADOS.ENTREGADA]: {
    titulo: '¿Marcarla como entregada?',
    detalle:
      'Entregada es el último paso: la carga no vuelve a estados anteriores y sus datos quedan como registro de lo que pasó. No se puede deshacer.',
    confirmar: 'Sí, marcar entregada',
    volver: 'No, todavía no',
    peligroso: false,
  },
});

/** Cuánto dura el aviso temporal, según ofrezca "Deshacer" o no. */
const DURACION_CON_DESHACER = 8000;
const DURACION_SIMPLE = 4000;

/** Cuánto espera el aviso para cerrarse después de que se le va el mouse o el foco. */
const DURACION_AL_SALIR = 3000;

/**
 * A dónde va el foco después de cada acción, en orden de preferencia: se usa
 * el primer selector que exista en el componente.
 *
 * Existe porque cada acción vuelve a dibujar el panel entero, y sin esto el
 * foco se caía al `<body>`: quien navega con teclado perdía el lugar y tenía
 * que volver a tabular desde el principio de la página.
 */
const FOCO = Object.freeze({
  avanzar: ['[data-accion="avanzar"]', '[data-foco="titulo"]'],
  volver: ['[data-accion="volver"]', '[data-accion="avanzar"]'],
  deshacer: ['[data-accion="avanzar"]', '[data-accion="volver"]', '[data-foco="titulo"]'],
  titulo: ['[data-foco="titulo"]'],
  'confirmar-abrir': ['[data-accion="confirmar-no"]'],
  'cerrar-cancelar': ['[data-accion="pedir-cancelar"]'],
  'cerrar-avance': ['[data-accion="avanzar"]'],
});

/**
 * Última vez que la carga llegó a cada estado, sacada de la bitácora.
 *
 * El historial viene en orden cronológico, así que al recorrerlo de principio
 * a fin cada estado queda con su marca más nueva. Eso es justo lo que se
 * quiere mostrar: si la carga volvió atrás y después avanzó de nuevo, el paso
 * tiene que decir cuándo se llegó la última vez, no la primera.
 *
 * @param {object[]} eventos - filas de `GET /cargas/:id/historial`, más viejas primero.
 * @returns {Object<string, string>} marca de tiempo ISO por estado.
 */
function marcasPorEstado(eventos) {
  const marcas = {};
  for (const evento of eventos) {
    if (evento?.estado_nuevo) marcas[evento.estado_nuevo] = evento.marca_tiempo;
  }
  return marcas;
}

/**
 * Recorrido del ciclo de vida de una carga (HU 7) con las acciones para
 * moverla de estado.
 *
 * Junta en un solo bloque las tres cosas que antes estaban sueltas: en qué
 * paso está la carga, qué significa ese paso y qué se puede hacer ahora. El
 * recorrido muestra además cuándo se llegó a cada paso, así el administrador
 * ve el avance sin bajar hasta la bitácora.
 *
 * Las transiciones que se pueden deshacer (avanzar y volver) se aplican
 * directo y ofrecen "Deshacer" en un aviso temporal. Las que llevan a un
 * estado final —cancelar y entregar— piden confirmación en un recuadro dentro
 * del mismo componente y no ofrecen vuelta atrás, porque no la tienen.
 *
 * Qué botones aparecen lo decide la máquina de estados de
 * `utils/estadosCarga`, no una lista escrita acá: así el usuario no puede
 * siquiera elegir una transición inválida. El backend igual la valida de nuevo.
 *
 * @param {object} props
 * @param {string} props.estado - `estado_actual` de la carga.
 * @param {object[]} [props.eventos] - historial de cambios, más viejos primero, para las marcas de tiempo.
 * @param {function} [props.alCambiarEstado] - aplica la transición contra el backend; recibe el estado destino y puede lanzar `ErrorDeApi`. Sin esta prop el recorrido se muestra en modo lectura.
 * @returns {JSX.Element}
 */
export default function ProgresoCarga({ estado, eventos = [], alCambiarEstado }) {
  const idBase = useId();
  const refRaiz = useRef(null);
  const refTemporizador = useRef(null);
  // Qué acción acaba de ocurrir, para reubicar el foco cuando termine de
  // dibujarse el panel nuevo. Es un ref y no estado porque cambiarlo no tiene
  // que provocar otro render.
  const refFoco = useRef(null);

  // Estado destino esperando confirmación, o null si no hay ninguna abierta.
  const [confirmando, setConfirmando] = useState(null);
  // Estado destino de la transición en curso: sirve para deshabilitar los
  // botones y mostrar el texto de espera sólo en el que se apretó.
  const [cambiandoA, setCambiandoA] = useState(null);
  const [error, setError] = useState('');
  // Aviso temporal: `{ texto, volverA }`. `volverA` es el estado al que
  // regresa "Deshacer", o null si ese cambio no se puede deshacer.
  const [aviso, setAviso] = useState(null);

  const puedeGestionar = typeof alCambiarEstado === 'function';

  // Transiciones disponibles, separadas por lo que significan para el usuario:
  // seguir el ciclo, corregir un clic equivocado, o sacar la carga del circuito.
  const posibles = puedeGestionar ? transicionesDesde(estado) : [];
  const destinoAvance =
    posibles.find((destino) => destino !== ESTADOS.CANCELADA && !esCorreccion(estado, destino)) ??
    null;
  const destinoRetroceso = posibles.find((destino) => esCorreccion(estado, destino)) ?? null;
  const puedeCancelar = posibles.includes(ESTADOS.CANCELADA);

  const marcas = marcasPorEstado(eventos);
  const cancelada = estado === ESTADOS.CANCELADA;

  // De qué paso salió la carga al cancelarse, y cuándo. Sale de la bitácora:
  // el asiento de la cancelación guarda en `estado_anterior` el paso en el que
  // estaba. Si por lo que sea no hay historial, se muestra en el primer paso.
  const eventoCancelacion = cancelada
    ? [...eventos].reverse().find((evento) => evento?.estado_nuevo === ESTADOS.CANCELADA)
    : null;
  const indicePaso = cancelada
    ? Math.max(0, FLUJO.indexOf(eventoCancelacion?.estado_anterior))
    : FLUJO.indexOf(estado);
  const terminada = !cancelada && estado === ESTADOS.ENTREGADA;

  /** Corta la cuenta regresiva del aviso y lo saca de pantalla. */
  const cerrarAviso = () => {
    clearTimeout(refTemporizador.current);
    setAviso(null);
  };

  /**
   * (Re)arranca la cuenta regresiva para que el aviso se cierre solo.
   *
   * @param {number} milisegundos - cuánto esperar antes de cerrarlo.
   * @returns {void}
   */
  const programarCierre = (milisegundos) => {
    clearTimeout(refTemporizador.current);
    refTemporizador.current = setTimeout(() => setAviso(null), milisegundos);
  };

  /**
   * Aplica una transición contra el backend y deja la pantalla lista: aviso
   * temporal, foco reubicado y, si el servidor la rechaza, el mensaje de error
   * (que ya explica a qué estados sí se puede pasar).
   *
   * @param {string} estadoNuevo - estado destino.
   * @param {object} opciones
   * @param {string} opciones.textoAviso - qué dice el aviso temporal si sale bien.
   * @param {boolean} [opciones.permitirDeshacer=true] - si el aviso ofrece "Deshacer".
   * @param {string} opciones.foco - clave de `FOCO` con dónde dejar el foco después.
   * @returns {Promise<void>}
   */
  const aplicar = async (estadoNuevo, { textoAviso, permitirDeshacer = true, foco }) => {
    const estadoPrevio = estado;
    setCambiandoA(estadoNuevo);
    setError('');
    // Avanzar o volver con la confirmación abierta la cierra: la pregunta ya
    // no corresponde al estado en el que quedó la carga.
    setConfirmando(null);

    try {
      await alCambiarEstado(estadoNuevo);
      // Sólo se ofrece "Deshacer" cuando la transición inversa existe de
      // verdad. Si no, el botón prometería algo que el backend iba a rechazar.
      const volverA =
        permitirDeshacer && puedeTransicionar(estadoNuevo, estadoPrevio) ? estadoPrevio : null;
      setAviso({ texto: textoAviso, volverA });
      programarCierre(volverA ? DURACION_CON_DESHACER : DURACION_SIMPLE);
      refFoco.current = foco;
    } catch (fallo) {
      setError(
        fallo instanceof ErrorDeApi
          ? fallo.message
          : 'Ocurrió un error inesperado al cambiar el estado.',
      );
    } finally {
      setCambiandoA(null);
    }
  };

  /** Avanza al paso siguiente, o pregunta antes si ese paso es definitivo. */
  const avanzar = () => {
    if (!destinoAvance) return;
    if (requiereConfirmacion(destinoAvance)) {
      setConfirmando(destinoAvance);
      refFoco.current = 'confirmar-abrir';
      return;
    }
    aplicar(destinoAvance, { textoAviso: TEXTOS[destinoAvance]?.aviso, foco: 'avanzar' });
  };

  /** Vuelve un paso atrás para corregir un cambio equivocado. */
  const retroceder = () => {
    if (!destinoRetroceso) return;
    aplicar(destinoRetroceso, {
      textoAviso: `La carga volvió a ${etiquetaEstado(destinoRetroceso).toLowerCase()}`,
      foco: 'volver',
    });
  };

  /** Rehace la transición inversa del último cambio, desde el aviso temporal. */
  const deshacer = () => {
    if (!aviso?.volverA) return;
    aplicar(aviso.volverA, {
      textoAviso: 'Se deshizo el cambio',
      permitirDeshacer: false,
      foco: 'deshacer',
    });
  };

  /** Cierra la confirmación sin aplicar nada y devuelve el foco a quien la abrió. */
  const cerrarConfirmacion = () => {
    refFoco.current =
      confirmando === ESTADOS.CANCELADA ? 'cerrar-cancelar' : 'cerrar-avance';
    setConfirmando(null);
  };

  /** Aplica la transición que estaba esperando confirmación. */
  const confirmar = () => {
    if (!confirmando) return;
    aplicar(confirmando, {
      textoAviso: TEXTOS[confirmando]?.aviso,
      permitirDeshacer: false,
      foco: 'titulo',
    });
  };

  // Reubica el foco después de cada acción. Corre en todos los renders, pero
  // sólo hace algo cuando quedó una acción pendiente, que se consume acá.
  useEffect(() => {
    const accion = refFoco.current;
    if (!accion || !refRaiz.current) return;
    refFoco.current = null;

    for (const selector of FOCO[accion] ?? []) {
      const elemento = refRaiz.current.querySelector(selector);
      if (elemento) {
        // Sin `preventScroll` el navegador salta al componente, que puede
        // estar a media pantalla de distancia de donde estaba mirando.
        elemento.focus({ preventScroll: true });
        return;
      }
    }
  });

  // Escape cierra primero la confirmación y, si no hay ninguna, el aviso.
  useEffect(() => {
    const alPresionarTecla = (evento) => {
      if (evento.key !== 'Escape') return;
      if (confirmando) {
        cerrarConfirmacion();
        return;
      }
      if (aviso) cerrarAviso();
    };

    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  });

  // Si el componente se desmonta con un aviso en pantalla, el temporizador
  // quedaría intentando actualizar algo que ya no existe.
  useEffect(() => () => clearTimeout(refTemporizador.current), []);

  const confirmacion = confirmando ? CONFIRMACIONES[confirmando] : null;

  /**
   * Recuadro de confirmación, el mismo para cancelar y para entregar. Va
   * dentro del componente y no en un modal: la pregunta es sobre la carga que
   * se está mirando, y un modal taparía el recorrido justo cuando hace falta
   * verlo para decidir.
   *
   * @returns {JSX.Element}
   */
  const recuadroConfirmacion = () => (
    <div
      className={`pg-confirmar${confirmacion.peligroso ? ' pg-confirmar--peligro' : ''}`}
      role="group"
      aria-labelledby={`${idBase}-confirmar-titulo`}
      aria-describedby={`${idBase}-confirmar-detalle`}
    >
      <p className="pg-confirmar__titulo" id={`${idBase}-confirmar-titulo`}>
        {confirmacion.titulo}
      </p>
      <p className="pg-confirmar__detalle" id={`${idBase}-confirmar-detalle`}>
        {confirmacion.detalle}
      </p>
      <div className="pg-confirmar__acciones">
        <button
          type="button"
          className={`ds-boton ${confirmacion.peligroso ? 'pg-boton-peligro' : 'ds-boton--primario'}`}
          onClick={confirmar}
          onMouseDown={evitarFoco}
          disabled={cambiandoA !== null}
        >
          {cambiandoA !== null ? 'Aplicando...' : confirmacion.confirmar}
        </button>
        <button
          type="button"
          className="ds-boton ds-boton--secundario"
          data-accion="confirmar-no"
          onClick={cerrarConfirmacion}
          onMouseDown={evitarFoco}
          disabled={cambiandoA !== null}
        >
          {confirmacion.volver}
        </button>
      </div>
    </div>
  );

  return (
    <section className="pg-card" aria-labelledby={`${idBase}-titulo`} ref={refRaiz}>
      <h2 className="pg-card__titulo" id={`${idBase}-titulo`}>
        Progreso de la carga
      </h2>

      <ol className="pg-pasos">
        {FLUJO.map((paso, indice) => {
          // Cinco situaciones posibles, y el orden importa: lo de la carga
          // cancelada pisa al recorrido normal.
          let situacion = 'pendiente';
          // Sólo los pasos ya alcanzados muestran su marca. Si la carga volvió
          // atrás, los que quedaron adelante vuelven a estar por hacer: la
          // bitácora todavía recuerda cuándo se pasó por ahí, pero mostrarlo en
          // un paso pendiente haría pensar que ya ocurrió.
          let marca =
            indice <= indicePaso && marcas[paso] ? formatearMarcaCorta(marcas[paso]) : '';
          let paraLector = 'por hacer';

          if (cancelada && indice === indicePaso) {
            situacion = 'cancelado';
            marca = 'Cancelada';
            paraLector = 'se canceló en este paso';
          } else if (cancelada && indice > indicePaso) {
            // Pasos que ya no van a ocurrir: se atenúan y se quedan sin marca.
            situacion = 'anulado';
            marca = '';
            paraLector = 'no se va a hacer';
          } else if (indice < indicePaso || terminada) {
            situacion = 'cumplido';
            paraLector = 'hecho';
          } else if (indice === indicePaso) {
            situacion = 'actual';
            paraLector = 'paso actual';
          }

          return (
            <li
              key={paso}
              className={[
                'pg-paso',
                `pg-paso--${situacion}`,
                // La línea que entra a este paso ya está recorrida.
                indice > 0 && indice <= indicePaso ? 'pg-paso--alcanzado' : '',
                // La línea que sale de este paso ya está recorrida (versión vertical).
                indice < indicePaso ? 'pg-paso--lleva-alcanzado' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={indice === indicePaso ? 'step' : undefined}
            >
              <span className="pg-paso__marca" aria-hidden="true">
                {situacion === 'cumplido' && <IconoCheck width={16} height={16} />}
                {situacion === 'cancelado' && <IconoCerrar width={14} height={14} />}
                {situacion !== 'cumplido' && situacion !== 'cancelado' && indice + 1}
              </span>
              <span className="pg-paso__texto">
                <span className="pg-paso__nombre">{etiquetaEstado(paso)}</span>
                <span className="pg-paso__momento">{marca}</span>
                <span className="pg-oculto"> ({paraLector})</span>
              </span>
            </li>
          );
        })}
      </ol>

      {error && (
        <p className="pg-error" role="alert">
          <IconoAlerta width={18} height={18} />
          {error}
        </p>
      )}

      {/*
        Panel de estado actual: reemplaza al cartel fijo que antes sólo repetía
        el último cambio. Dice qué significa el estado y qué se espera hacer,
        que es la pregunta real de quien entra a la pantalla.
      */}
      <div
        className={[
          'pg-ahora',
          cancelada ? 'pg-ahora--cancelada' : '',
          terminada ? 'pg-ahora--entregada' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* `tabindex="-1"` para poder recibir el foco cuando ya no queda ningún botón. */}
        <h3 className="pg-ahora__titulo" data-foco="titulo" tabIndex={-1}>
          {TEXTOS[estado]?.titulo ?? etiquetaEstado(estado)}
        </h3>
        <p className="pg-ahora__detalle">
          {cancelada
            ? `Se canceló${
                eventoCancelacion ? ` ${formatearFechaLarga(eventoCancelacion.marca_tiempo)}` : ''
              }. Ya no aparece en el listado de cargas.`
            : TEXTOS[estado]?.detalle}
        </p>

        {confirmando === ESTADOS.ENTREGADA ? (
          // La pregunta ocupa el lugar de los botones que la abrieron.
          recuadroConfirmacion()
        ) : (
          (destinoAvance || destinoRetroceso) && (
            <div className="pg-ahora__acciones">
              {destinoAvance && (
                <button
                  type="button"
                  className="ds-boton ds-boton--primario"
                  data-accion="avanzar"
                  onClick={avanzar}
                  onMouseDown={evitarFoco}
                  disabled={cambiandoA !== null}
                >
                  {cambiandoA === destinoAvance ? 'Cambiando...' : TEXTOS[estado]?.accion}
                </button>
              )}

              {destinoRetroceso && (
                <button
                  type="button"
                  className="pg-enlace"
                  data-accion="volver"
                  onClick={retroceder}
                  onMouseDown={evitarFoco}
                  disabled={cambiandoA !== null}
                >
                  {cambiandoA === destinoRetroceso
                    ? 'Volviendo...'
                    : `Volver a ${etiquetaEstado(destinoRetroceso).toLowerCase()}`}
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/*
        Cancelar vive al pie y como enlace, lejos del botón principal: es una
        salida del circuito, no el paso siguiente, y antes competía en tamaño
        con la acción que sí se espera que se use.
      */}
      {puedeCancelar &&
        (confirmando === ESTADOS.CANCELADA ? (
          recuadroConfirmacion()
        ) : (
          <div className="pg-pie">
            <button
              type="button"
              className="pg-enlace pg-enlace--peligro"
              data-accion="pedir-cancelar"
              onClick={() => {
                setConfirmando(ESTADOS.CANCELADA);
                refFoco.current = 'confirmar-abrir';
              }}
              onMouseDown={evitarFoco}
              disabled={cambiandoA !== null}
            >
              Cancelar carga
            </button>
          </div>
        ))}

      {/*
        Aviso temporal de cada cambio. El contenedor está siempre en el DOM y
        sólo cambia lo de adentro: si apareciera y desapareciera entero, los
        lectores de pantalla no anunciarían nada.
      */}
      <div
        className="pg-avisos"
        role="status"
        aria-live="polite"
        onMouseEnter={() => clearTimeout(refTemporizador.current)}
        onMouseLeave={() => aviso && programarCierre(DURACION_AL_SALIR)}
        // Focus y blur de React burbujean, así que alcanza con ponerlos acá
        // para pausar mientras alguien está con el teclado sobre "Deshacer".
        onFocus={() => clearTimeout(refTemporizador.current)}
        onBlur={() => aviso && programarCierre(DURACION_AL_SALIR)}
      >
        {aviso && (
          <div className={`pg-aviso${aviso.volverA ? '' : ' pg-aviso--solo'}`}>
            <span>{aviso.texto}</span>
            {aviso.volverA && (
              <button
                type="button"
                className="pg-aviso__deshacer"
                onClick={deshacer}
                onMouseDown={evitarFoco}
                disabled={cambiandoA !== null}
              >
                Deshacer
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
