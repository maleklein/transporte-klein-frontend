import { useEffect, useId, useState } from 'react';
import { obtenerSugeridos } from '../api/matching';
import { formatearPeso } from '../utils/carga';

const CRITERIOS = {
  capacidad: 'Capacidad', cercania: 'Cercanía', disponibilidad: 'Disponibilidad', historial: 'Experiencia',
};
const puntos = (valor) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(valor);

/** Pestaña de HU 5 dentro del modal existente de HU 6. */
export default function SugeridosCarga({ idCarga, version, elegido, alElegir, alListo, asignando }) {
  const idBase = useId();
  const [ranking, setRanking] = useState(null);
  const [estado, setEstado] = useState('cargando');
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (asignando) return undefined;
    let controlador;
    let cerrado = false;
    const actualizar = async () => {
      if (document.hidden || cerrado) return;
      controlador?.abort();
      controlador = new AbortController();
      const { signal } = controlador;
      alListo(false);
      setActualizando(true);
      setError('');
      try {
        const datos = await obtenerSugeridos(idCarga, { signal });
        if (signal.aborted || cerrado) return;
        setRanking(datos);
        setEstado('ok');
        // Si cambió la aptitud, no conservar una selección que dejó de existir.
        alElegir((previo) => datos.sugeridos.some((c) => c.id_camionero === previo) ? previo : null);
        alListo(true);
      } catch (fallo) {
        if (signal.aborted || cerrado) return;
        setError(fallo.message || 'No se pudieron obtener las sugerencias.');
        setEstado('error');
        alElegir(null);
      } finally {
        if (!signal.aborted && !cerrado) setActualizando(false);
      }
    };
    actualizar();
    const intervalo = window.setInterval(actualizar, 30000);
    const alVolver = () => { if (!document.hidden) actualizar(); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      cerrado = true;
      controlador?.abort();
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [idCarga, version, intento, asignando, alElegir, alListo]);

  return (
    <div className="pp-sugeridos" aria-busy={actualizando}>
      <p className="pp-mensaje pp-mensaje--modal">
        Postulados aptos, ordenados por adecuación. Podés elegir a cualquiera de ellos.
      </p>
      <div className="pp-ranking-acciones">
        <button type="button" className="ds-boton ds-boton--secundario"
          onClick={() => setIntento((previo) => previo + 1)} disabled={asignando || actualizando}>
          Actualizar sugerencias
        </button>
        <span className="pp-opcion__dato" role="status">
          {actualizando ? 'Actualizando sugerencias…' : ranking && estado === 'ok'
            ? `Actualizado a las ${new Date(ranking.calculado_en).toLocaleTimeString('es-AR')}` : ''}
        </span>
      </div>
      {estado === 'cargando' && <p className="pp-mensaje" role="status">Buscando camioneros aptos…</p>}
      {estado === 'error' && <p className="pp-error" role="alert">{error}</p>}
      {estado === 'ok' && ranking.sugeridos.length === 0 && (
        <p className="pp-mensaje pp-mensaje--modal" role="status">
          No hay camioneros postulados que cumplan los requisitos mínimos de esta carga.
          Se necesita una cuenta activa, capacidad suficiente y disponibilidad confirmada.
        </p>
      )}
      {estado === 'ok' && ranking.sugeridos.length > 0 && (
        <fieldset className="pp-opciones" disabled={asignando || actualizando}>
          <legend className="pp-oculto">Camioneros sugeridos por orden de adecuación</legend>
          {ranking.sugeridos.map((camionero) => (
            <div key={camionero.id_camionero} className="pp-sugerido">
              <label className={`pp-opcion${elegido === camionero.id_camionero ? ' pp-opcion--elegida' : ''}`}>
                <input type="radio" name={`${idBase}-sugerido`} value={camionero.id_camionero}
                  checked={elegido === camionero.id_camionero}
                  onChange={() => alElegir(camionero.id_camionero)} />
                <span className="pp-opcion__texto">
                  <span className="pp-opcion__nombre">
                    {camionero.posicion}. {camionero.nombre} {camionero.apellido}
                  </span>
                  <span className="pp-opcion__dato">
                    {camionero.tipo_vehiculo || 'Vehículo sin cargar'} · {formatearPeso(camionero.capacidad_kg)}
                  </span>
                  <span className="pp-opcion__dato">{camionero.ubicacion || 'Ubicación sin cargar'}</span>
                  <strong className="pp-puntaje">{puntos(camionero.puntaje_total)} / 100 puntos</strong>
                </span>
              </label>
              <details className="pp-desglose">
                <summary>Ver por qué se sugiere</summary>
                <dl>
                  {Object.entries(CRITERIOS).map(([clave, nombre]) => (
                    <div key={clave}>
                      <dt>{nombre}: {puntos(camionero.desglose[clave].puntos)} / {camionero.desglose[clave].maximo}</dt>
                      <dd>{camionero.desglose[clave].explicacion}</dd>
                    </div>
                  ))}
                </dl>
                {camionero.advertencias.map((aviso) => <p className="pp-mensaje" key={aviso}>{aviso}</p>)}
              </details>
            </div>
          ))}
        </fieldset>
      )}
    </div>
  );
}
