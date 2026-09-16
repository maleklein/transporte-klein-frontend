/**
 * Validación del formulario de cargas, compartida entre el alta (AltaCarga.jsx,
 * HU 2.1) y la edición (EditarCarga.jsx, HU 2.2). Replica en el cliente las
 * mismas reglas que el backend aplica en `src/validators/carga.js`, usado por
 * `POST /cargas` y `PUT /cargas/:id`, para que el usuario vea el error antes
 * de mandar el formulario.
 */

/**
 * Valores con los que arranca el formulario de alta (todos los campos vacíos).
 */
export const VALORES_INICIALES = {
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
export const LARGOS_MAXIMOS = {
  origen: 255,
  destino: 255,
  tipo_carga: 100,
  observaciones: 1000,
};

/**
 * Rango de peso que soporta la columna `peso_kg DECIMAL(10, 2)`.
 * El mínimo no es cero: 0,001 kg se redondearía a 0,00 al guardarse.
 */
export const PESO_MINIMO = 0.01;
export const PESO_MAXIMO = 99999999.99;

/** Años aceptados, alineados con el backend. */
export const ANIO_MINIMO = 1900;
export const ANIO_MAXIMO = 2100;

/**
 * Interpreta el peso escrito por el usuario. Acepta la coma decimal, que es
 * como se escribe acá ("12,5"), y la convierte al punto que espera el backend.
 *
 * @param {string} valor - lo que hay escrito en el input de peso.
 * @returns {number} el peso como número, o NaN si no se puede interpretar.
 */
export function parsearPeso(valor) {
  return Number(String(valor).replace(',', '.').trim());
}

/**
 * Reglas de validación del formulario, evaluadas en tiempo real.
 *
 * @param {typeof VALORES_INICIALES} valores - valores actuales del formulario.
 * @returns {object} mapa `{ campo: mensaje }` con un error por cada campo inválido.
 */
export function validar(valores) {
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
 * Arma el cuerpo del POST/PUT a partir de los valores del formulario. Mismo
 * payload para el alta y la edición: el backend espera los mismos seis campos
 * en los dos endpoints.
 *
 * @param {typeof VALORES_INICIALES} valores - valores actuales del formulario.
 * @returns {object} payload listo para `crearCarga` / `editarCarga`.
 */
export function armarPayload(valores) {
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
