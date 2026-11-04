import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconoAjustes, IconoPesos, IconoReintentar } from './Iconos';
import { ErrorDeApi } from '../api/usuarios';
import { evitarFoco } from '../utils/formulario';
import { PARAMETROS_COSTO, formatearPesos } from '../utils/carga';

/**
 * Bloque "Estimación económica" del detalle de carga (HU 10), sólo para el
 * administrador: el backend no le manda estos datos al camionero.
 *
 * Muestra uno de tres estados, según `estimacion_economica`:
 *
 * - `ok`: costo, ingreso y ganancia, y abajo los parámetros con los que se
 *   calcularon. Son los de ese momento, no los vigentes: la estimación es una
 *   foto y no cambia si después se modifican los parámetros.
 * - `sin_distancia`: los kilómetros están pendientes. No se ofrece un botón
 *   propio porque el que resuelve es el Reintentar de la distancia, en el
 *   bloque de arriba.
 * - `sin_calcular`: hay kilómetros pero no se pudo estimar (por ejemplo, si
 *   faltaba un parámetro). "Calcular" pide el mismo recálculo que la
 *   distancia, que es donde el backend hace la cuenta.
 *
 * Un backend sin la migración de la HU 10 no manda el campo: el bloque no se
 * muestra, en vez de mostrar un estado que no corresponde.
 *
 * @param {object} props
 * @param {object} props.carga - la carga, con los campos de la estimación.
 * @param {() => Promise<object>} props.alRecalcular - pide el recálculo; lanza `ErrorDeApi` si falla.
 * @returns {JSX.Element|null}
 */
export default function EconomiaCarga({ carga, alRecalcular }) {
  const [recalculando, setRecalculando] = useState(false);
  const [errorRecalculo, setErrorRecalculo] = useState('');

  const estado = carga.estimacion_economica;
  if (!estado) return null;

  /**
   * Pide el recálculo y deja a la vista el error si falla.
   *
   * @returns {Promise<void>}
   */
  const recalcular = async () => {
    setRecalculando(true);
    setErrorRecalculo('');
    try {
      await alRecalcular();
    } catch (error) {
      setErrorRecalculo(
        error instanceof ErrorDeApi ? error.message : 'No se pudo calcular la estimación. Intentá de nuevo.',
      );
    } finally {
      setRecalculando(false);
    }
  };

  const ganancia = Number(carga.ganancia_estimada);

  return (
    <section className="dc-card ec-bloque" aria-labelledby="ec-titulo">
      <h2 className="dc-card__titulo ec-titulo" id="ec-titulo">
        <IconoPesos width={18} height={18} />
        Estimación económica
      </h2>

      {estado === 'ok' && (
        <>
          <dl className="ec-montos">
            {/* Etiquetas cortas: "estimado" ya lo dice el título del bloque. */}
            <div className="ec-monto">
              <dt>Costo</dt>
              <dd>{formatearPesos(carga.costo_estimado)}</dd>
            </div>
            <div className="ec-monto">
              <dt>Ingreso</dt>
              <dd>{formatearPesos(carga.ingreso_estimado)}</dd>
            </div>
            <div className={`ec-monto ec-monto--ganancia${ganancia < 0 ? ' ec-monto--perdida' : ''}`}>
              <dt>{ganancia < 0 ? 'Pérdida' : 'Ganancia'}</dt>
              <dd>{formatearPesos(carga.ganancia_estimada)}</dd>
            </div>
          </dl>

          {carga.parametros_costo && (
            <div className="ec-parametros">
              <h3 className="ec-parametros__titulo">Calculado con</h3>
              <ul className="ec-parametros__lista">
                {PARAMETROS_COSTO.map(({ clave, etiqueta }) => (
                  <li key={clave}>
                    {etiqueta}: <strong>{formatearPesos(carga.parametros_costo[clave])}</strong>
                  </li>
                ))}
              </ul>
              <p className="ec-nota">
                Son los parámetros vigentes cuando se calculó. Si después se cambian, esta estimación no se
                modifica.{' '}
                <Link to="/parametros" className="ec-enlace">
                  Ver parámetros actuales
                </Link>
              </p>
            </div>
          )}
        </>
      )}

      {estado === 'sin_distancia' && (
        <p className="ec-aviso">
          La estimación económica no se puede calcular hasta tener la distancia. Cuando el cálculo de
          kilómetros se complete, el costo y la ganancia se calculan solos.
        </p>
      )}

      {estado === 'sin_calcular' && (
        <div className="ec-sin-calcular">
          <p className="ec-aviso">No se pudo calcular la estimación económica de esta carga.</p>
          <button
            type="button"
            className="ds-boton ds-boton--secundario dk-reintentar"
            onClick={recalcular}
            onMouseDown={evitarFoco}
            disabled={recalculando}
          >
            <IconoReintentar width={16} height={16} />
            {recalculando ? 'Calculando...' : 'Calcular'}
          </button>
          {errorRecalculo && (
            <span className="dk-error" role="alert">
              {errorRecalculo}
            </span>
          )}
          <Link to="/parametros" className="ec-enlace">
            <IconoAjustes width={16} height={16} />
            Revisar parámetros operativos
          </Link>
        </div>
      )}
    </section>
  );
}
