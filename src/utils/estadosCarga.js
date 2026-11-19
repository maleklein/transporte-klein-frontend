/**
 * Máquina de estados de una carga (HU 7), del lado del frontend.
 *
 * Es el espejo de `src/domain/estadosCarga.js` del backend: las mismas reglas,
 * para decidir qué acciones ofrecer sin tener que preguntarle al servidor en
 * cada render. El backend igual valida todo de nuevo — acá sólo se evita
 * mostrar botones que sabemos que van a dar 409.
 *
 * Si cambian las transiciones, hay que tocar los dos archivos.
 */

/** Los seis estados del ciclo de vida, según el SRS §219 y la HU 7. */
export const ESTADOS = Object.freeze({
  DISPONIBLE: 'disponible',
  PENDIENTE: 'pendiente',
  ACEPTADA: 'aceptada',
  EN_VIAJE: 'en_viaje',
  ENTREGADA: 'entregada',
  CANCELADA: 'cancelada',
});

/**
 * Orden natural del ciclo de vida, para distinguir avanzar de corregir.
 * `cancelada` queda afuera: no es un paso del flujo, es una salida.
 */
export const FLUJO = Object.freeze([
  ESTADOS.DISPONIBLE,
  ESTADOS.PENDIENTE,
  ESTADOS.ACEPTADA,
  ESTADOS.EN_VIAJE,
  ESTADOS.ENTREGADA,
]);

/**
 * Transiciones permitidas desde cada estado. Igual que en el backend: además
 * de avanzar se puede retroceder un paso, para corregir un clic equivocado.
 * `cancelada` es el único estado del que ya no se vuelve.
 */
export const TRANSICIONES = Object.freeze({
  [ESTADOS.DISPONIBLE]: [ESTADOS.PENDIENTE, ESTADOS.CANCELADA],
  // Pendiente no vuelve a disponible: ver la nota en el backend (domain/estadosCarga.js).
  [ESTADOS.PENDIENTE]: [ESTADOS.ACEPTADA, ESTADOS.CANCELADA],
  [ESTADOS.ACEPTADA]: [ESTADOS.EN_VIAJE, ESTADOS.PENDIENTE],
  [ESTADOS.EN_VIAJE]: [ESTADOS.ENTREGADA, ESTADOS.ACEPTADA],
  // Entregada se puede deshacer: marcarla de más es un error fácil de cometer
  // y antes dejaba la carga sin ninguna acción posible.
  [ESTADOS.ENTREGADA]: [ESTADOS.EN_VIAJE],
  [ESTADOS.CANCELADA]: [],
});

/**
 * Estados de los que ya no se vuelve. Cancelar es la única salida sin retorno:
 * una entrega marcada por error se deshace volviendo la carga a "En viaje".
 */
export const ESTADOS_FINALES = Object.freeze([ESTADOS.CANCELADA]);

/**
 * Pasos que la pantalla confirma antes de aplicar. Cancelar no se puede
 * deshacer (HU 2.4 lo exige); marcar la entrega sí, pero cierra el viaje y
 * habilita las calificaciones, así que conviene preguntar igual.
 */
const ESTADOS_QUE_SE_CONFIRMAN = Object.freeze([ESTADOS.ENTREGADA, ESTADOS.CANCELADA]);

/**
 * Estados en los que una carga recibe postulaciones (HU 4): "disponible"
 * mientras nadie se postuló y "pendiente" desde la primera postulación hasta
 * que se asigna (HU 6). Espejo de `ESTADOS_ABIERTOS` del backend, que con esta
 * lista decide qué cargas ve el camionero.
 */
export const ESTADOS_ABIERTOS = Object.freeze([ESTADOS.DISPONIBLE, ESTADOS.PENDIENTE]);

/**
 * Texto para mostrar de cada estado. Hace falta porque en la base se guarda
 * `en_viaje` con guión bajo, y capitalizar sin más daría "En_viaje".
 */
const ETIQUETAS = Object.freeze({
  [ESTADOS.DISPONIBLE]: 'Disponible',
  [ESTADOS.PENDIENTE]: 'Pendiente',
  [ESTADOS.ACEPTADA]: 'Aceptada',
  [ESTADOS.EN_VIAJE]: 'En viaje',
  [ESTADOS.ENTREGADA]: 'Entregada',
  [ESTADOS.CANCELADA]: 'Cancelada',
});

/**
 * Sufijo de clase CSS por estado, para el color del badge.
 * Los estados sin color propio caen en "neutro".
 */
const SUFIJOS_CSS = Object.freeze({
  [ESTADOS.DISPONIBLE]: 'disponible',
  [ESTADOS.EN_VIAJE]: 'en-viaje',
  [ESTADOS.ENTREGADA]: 'entregada',
  [ESTADOS.CANCELADA]: 'cancelada',
});

/**
 * Nombre para mostrar de un estado.
 *
 * @param {string} estado - valor de `estado_actual` / `estado_nuevo`.
 * @returns {string} el texto a mostrar; el valor original si el estado no se conoce.
 */
export function etiquetaEstado(estado) {
  return ETIQUETAS[estado] ?? (estado ?? '');
}

/**
 * Sufijo de clase CSS para pintar el badge de un estado.
 *
 * @param {string} estado - valor de `estado_actual`.
 * @returns {string} sufijo ("disponible", "en-viaje", ..., "neutro").
 */
export function sufijoEstado(estado) {
  return SUFIJOS_CSS[estado] ?? 'neutro';
}

/**
 * Estados a los que se puede llevar una carga desde el estado dado.
 *
 * @param {string} estadoActual - estado en el que está la carga.
 * @returns {string[]} estados alcanzables; vacío si es terminal o desconocido.
 */
export function transicionesDesde(estadoActual) {
  return TRANSICIONES[estadoActual] ?? [];
}

/**
 * Indica si el estado ya no admite más cambios.
 *
 * @param {string} estadoActual - estado en el que está la carga.
 * @returns {boolean} true si es un estado final.
 */
export function esEstadoFinal(estadoActual) {
  return transicionesDesde(estadoActual).length === 0;
}

/**
 * Indica si una transición puntual está permitida. Espejo de la función del
 * mismo nombre en el backend.
 *
 * La pantalla la usa para saber si un cambio se puede deshacer: sólo ofrece
 * "Deshacer" cuando la transición inversa también es válida. Como `entregada`
 * y `cancelada` son finales, llegar ahí nunca ofrece vuelta atrás, y por eso
 * esos dos cambios se confirman antes de aplicarse.
 *
 * @param {string} estadoActual - estado en el que está la carga.
 * @param {string} estadoNuevo - estado al que se la quiere llevar.
 * @returns {boolean} true si la transición está permitida.
 */
export function puedeTransicionar(estadoActual, estadoNuevo) {
  return transicionesDesde(estadoActual).includes(estadoNuevo);
}

/**
 * Indica si la transición retrocede en el flujo, o sea, si corrige un cambio
 * anterior en vez de avanzar el ciclo de vida. La pantalla las separa para que
 * se vea claro que "Pendiente" desde "Aceptada" es volver atrás, no seguir.
 *
 * @param {string} estadoActual - estado en el que está la carga.
 * @param {string} estadoNuevo - estado al que se la quiere llevar.
 * @returns {boolean} true si el destino está antes en el flujo.
 */
export function esCorreccion(estadoActual, estadoNuevo) {
  const desde = FLUJO.indexOf(estadoActual);
  const hasta = FLUJO.indexOf(estadoNuevo);
  return desde !== -1 && hasta !== -1 && hasta < desde;
}

/**
 * Indica si hay que confirmar el paso a este estado antes de aplicarlo.
 *
 * @param {string} estadoNuevo - estado destino.
 * @returns {boolean} true si ese paso se confirma.
 */
export function requiereConfirmacion(estadoNuevo) {
  return ESTADOS_QUE_SE_CONFIRMAN.includes(estadoNuevo);
}

/**
 * Explica por qué una carga no se puede editar en su estado actual.
 *
 * En viaje y entregada son bloqueos *mientras* dure ese estado, y el texto
 * dice cómo salir de cada uno: volver la carga al paso anterior. Cancelada no
 * tiene salida, y por eso su texto no ofrece ninguna.
 *
 * @param {string} estadoActual - estado en el que está la carga.
 * @returns {string} el motivo, o cadena vacía si en ese estado sí se puede editar.
 */
export function motivoEdicionBloqueada(estadoActual) {
  if (estadoActual === ESTADOS.EN_VIAJE) {
    return 'Mientras la carga está en viaje no se pueden modificar sus datos. Si necesitás corregir algo, volvé a pasarla a "Aceptada" primero.';
  }
  if (estadoActual === ESTADOS.ENTREGADA) {
    return 'La carga ya fue entregada: sus datos quedan como registro de lo que pasó. Si necesitás corregir algo, deshacé la entrega primero.';
  }
  if (estadoActual === ESTADOS.CANCELADA) {
    return 'La carga está cancelada: no tiene sentido modificar los datos de un viaje que no va a salir.';
  }
  return '';
}

/**
 * Estados desde los que ya no se puede cancelar una carga (HU 2.4), mismo
 * criterio que el backend (`cancelarCarga` en `cargaControllers.js`): sólo se
 * cancela desde disponible o pendiente. "Aceptada" faltaba en esta lista y el
 * botón quedaba habilitado para recibir un 409; con la asignación (HU 6) es el
 * estado de toda carga asignada, así que el caso dejó de ser raro.
 */
export const ESTADOS_BLOQUEADOS_CANCELACION = Object.freeze([
  ESTADOS.ACEPTADA,
  ESTADOS.EN_VIAJE,
  ESTADOS.ENTREGADA,
  ESTADOS.CANCELADA,
]);

/**
 * Explica, en un solo texto, por qué los botones "Editar" y "Cancelar carga"
 * del detalle están deshabilitados en el estado actual, y cómo destrabarlos.
 *
 * Antes cada botón tenía su motivo debajo, en una columna angosta: dos textos
 * de cuatro renglones que decían casi lo mismo y empujaban los botones debajo
 * del título (corrección del profesor del 17/11, punto 2). Ahora los botones
 * quedan siempre en el mismo lugar y el motivo va en un recuadro con todo el
 * ancho. La salida nombra el botón que la hace en "Progreso de la carga".
 *
 * @param {string} estadoActual - estado en el que está la carga.
 * @returns {string} el motivo, o cadena vacía si los dos botones se pueden usar.
 */
export function motivoAccionesBloqueadas(estadoActual) {
  if (estadoActual === ESTADOS.ACEPTADA) {
    return 'La carga ya tiene un camionero asignado, así que no se puede cancelar. Para cancelarla, primero tocá "Volver a pendiente" en "Progreso de la carga".';
  }
  if (estadoActual === ESTADOS.EN_VIAJE) {
    return 'La carga está en viaje, así que no se puede editar ni cancelar. Si necesitás corregir sus datos, tocá "Volver a aceptada" en "Progreso de la carga".';
  }
  if (estadoActual === ESTADOS.ENTREGADA) {
    return 'La carga ya fue entregada, así que no se puede editar ni cancelar: sus datos quedan como registro de lo que pasó. Si necesitás corregir algo, tocá "Volver a en viaje" en "Progreso de la carga".';
  }
  if (estadoActual === ESTADOS.CANCELADA) {
    return 'La carga está cancelada: no se puede editar ni volver a activar.';
  }
  return '';
}

/**
 * Textos de una carga con el retiro vencido: sigue sin camionero asignado
 * (disponible o pendiente) y su fecha de retiro ya pasó.
 *
 * El criterio es el del backend: los camioneros ya no la ven ni pueden
 * postularse, y tampoco se puede asignar aunque ya tenga postulados (409 "La
 * fecha de retiro de esta carga ya pasó..."). La salida es cambiarle la fecha
 * o cancelarla. Antes, el aviso de arriba del detalle lo decía, pero "Proceso
 * de la carga" seguía diciendo "esperando transportista" y "Los transportistas
 * ya la pueden ver" (corrección del profesor del 17/11, punto 3). Ahora los
 * dos usan estos textos.
 *
 * Una carga sin fecha de retiro (se acuerda después) no vence: quien llama
 * sólo usa esto si `retiroVencido(carga)`.
 *
 * @param {string} estadoActual - 'disponible' o 'pendiente'.
 * @param {string} fechaRetiro - la fecha ya formateada para mostrar ("25/09/2026").
 * `paso` y `marca` son lo que muestra el recorrido en el paso actual: en vez
 * de "Disponible" o "Pendiente" en azul (no lo está), "Vencida" en ámbar con
 * el día del retiro ("retiro 18/09").
 *
 * @returns {{ aviso: string, titulo: string, detalle: string, paso: string, marca: string } | null} null en los demás estados.
 */
export function textosRetiroVencido(estadoActual, fechaRetiro) {
  const yaNoLaVen = 'Los camioneros ya no la ven ni pueden postularse.';
  const enElPaso = { paso: 'Vencida', marca: `retiro ${fechaRetiro.slice(0, 5)}` };
  const aviso = `La fecha de retiro (${fechaRetiro}) ya pasó y la carga sigue sin camionero asignado.`;
  if (estadoActual === ESTADOS.DISPONIBLE) {
    return {
      ...enElPaso,
      aviso: `${aviso} ${yaNoLaVen} Cambiale la fecha o cancelala.`,
      titulo: 'Retiro vencido, sin postulados',
      detalle: `${yaNoLaVen} Para publicarla de nuevo, cambiale la fecha de retiro con "Editar"; si el viaje ya no va, cancelala.`,
    };
  }
  if (estadoActual === ESTADOS.PENDIENTE) {
    return {
      ...enElPaso,
      aviso: `${aviso} Los camioneros ya no la ven ni pueden postularse, y no se puede asignar: cambiale la fecha o cancelala.`,
      titulo: 'Retiro vencido, con camioneros postulados',
      detalle: 'Con la fecha vencida no se puede asignar. Para asignársela a uno de los postulados, primero cambiale la fecha de retiro con "Editar"; si el viaje ya no va, cancelala.',
    };
  }
  return null;
}
