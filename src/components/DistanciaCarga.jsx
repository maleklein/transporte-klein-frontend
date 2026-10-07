import { useState } from 'react';
import { IconoReintentar, IconoRuta } from './Iconos';
import { ErrorDeApi } from '../api/usuarios';
import { evitarFoco } from '../utils/formulario';
import { formatearKm } from '../utils/carga';

/**
 * Dato "Distancia estimada" del detalle de carga (HU 9).
 *
 * Se arma como un `dc-dato` más, para ir dentro del mismo `<dl>` que el resto
 * de la información de la carga. Muestra uno de tres estados, según
 * `estado_calculo_km`:
 *
 * - `ok`: el valor calculado ("407 km").
 * - `pendiente`: el servicio de mapas no respondió al crear la carga. Al
 *   administrador se le ofrece el botón Reintentar, que pide el cálculo de
 *   nuevo y actualiza el dato sin recargar la página.
 * - `error`: reservado para cuando no haya ruta posible. Hoy el backend no lo
 *   produce, pero se contempla para no mostrar un estado en blanco si llega.
 *
 * El componente maneja solo el "Calculando..." y el error del reintento; la
 * carga actualizada la guarda la pantalla, a través de `alRecalcular`, porque
 * es la misma carga que usan los demás bloques del detalle.
 *
 * @param {object} props
 * @param {object} props.carga - la carga, con `kilometros_estimados` y `estado_calculo_km`.
 * @param {boolean} props.puedeReintentar - si se muestra el botón Reintentar (sólo administrador).
 * @param {() => Promise<object>} props.alRecalcular - pide el recálculo; lanza `ErrorDeApi` si falla.
 * @returns {JSX.Element}
 */
export default function DistanciaCarga({ carga, puedeReintentar, alRecalcular }) {
  const [recalculando, setRecalculando] = useState(false);
  const [errorReintento, setErrorReintento] = useState('');

  // Un backend sin la migración de la HU 9 no manda el campo: se lo trata como
  // pendiente en vez de mostrar un "ok" sin valor.
  const estado = carga.estado_calculo_km ?? 'pendiente';

  /**
   * Pide el recálculo y deja a la vista el error si el servicio sigue caído.
   *
   * @returns {Promise<void>}
   */
  const reintentar = async () => {
    setRecalculando(true);
    setErrorReintento('');
    try {
      await alRecalcular();
    } catch (error) {
      setErrorReintento(
        error instanceof ErrorDeApi
          ? error.message
          : 'No se pudo recalcular la distancia. Intentá de nuevo.',
      );
    } finally {
      setRecalculando(false);
    }
  };

  return (
    <div className="dc-dato">
      <dt>
        <IconoRuta width={15} height={15} />
        Distancia estimada
      </dt>

      {estado === 'ok' ? (
        <dd>{formatearKm(carga.kilometros_estimados)}</dd>
      ) : (
        <dd className="dk-sin-calcular">
          <span className={`dk-estado dk-estado--${estado === 'error' ? 'error' : 'pendiente'}`}>
            {estado === 'error' ? 'No se pudo calcular' : 'Cálculo pendiente'}
          </span>

          {puedeReintentar && (
            <button
              type="button"
              className="ds-boton ds-boton--secundario dk-reintentar"
              onClick={reintentar}
              onMouseDown={evitarFoco}
              disabled={recalculando}
            >
              <IconoReintentar width={16} height={16} />
              {recalculando ? 'Calculando...' : 'Reintentar'}
            </button>
          )}

          {errorReintento && (
            <span className="dk-error" role="alert">
              {errorReintento}
            </span>
          )}
        </dd>
      )}
    </div>
  );
}
