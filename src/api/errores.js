/**
 * Error de la API. Guarda a qué campo del formulario corresponde el mensaje,
 * para poder mostrarlo debajo del input que lo causó, y el código HTTP de la
 * respuesta (0 si no hubo respuesta).
 *
 * Vive en su propio archivo para que lo puedan importar `conexion.js` y los
 * módulos de cada recurso sin depender unos de otros. `usuarios.js` lo vuelve
 * a exportar, porque es de donde lo importó siempre el resto de la app.
 */
export class ErrorDeApi extends Error {
  constructor(mensaje, campo = null, estado = 0) {
    super(mensaje);
    this.name = 'ErrorDeApi';
    this.campo = campo;
    this.estado = estado;
  }
}
