import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { emitirCalificacion, obtenerCalificacionViaje } from '../api/calificaciones';
import { IconoGuardar, IconoReintentar } from './Iconos';
import { volverA } from '../utils/volver';
import './Calificaciones.css';

/** Se monta para una carga entregada. El servidor determina la contraparte y el permiso. */
export default function CalificacionCarga({ idCarga }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [puntaje, setPuntaje] = useState('');
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [version, setVersion] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const enviando = useRef(false);

  useEffect(() => {
    const controlador = new AbortController();
    setCargando(true);
    setError('');
    setSinPermiso(false);
    obtenerCalificacionViaje(idCarga, controlador.signal)
      .then(setDatos)
      .catch((e) => {
        if (e.name === 'AbortError') return;
        setError(e.message);
        setSinPermiso(e.estado === 403);
      })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false); });
    return () => controlador.abort();
  }, [idCarga, version]);

  async function enviar(evento) {
    evento.preventDefault();
    if (enviando.current || !puntaje) return;
    enviando.current = true;
    setGuardando(true);
    setError('');
    try {
      const emitida = await emitirCalificacion({ id_carga: Number(idCarga), puntaje: Number(puntaje), comentario });
      setDatos((anterior) => ({ ...anterior, emitida, puede_calificar: false }));
      setAviso('Tu calificación se guardó correctamente.');
    } catch (e) {
      if (e.estado === 409) {
        setAviso(e.message);
        setVersion((v) => v + 1);
      } else setError(e.message);
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <section className="dc-card cal-seccion" aria-labelledby="cal-titulo">
      <h2 id="cal-titulo">Calificación del viaje</h2>
      {aviso && <p role="status" className="cal-aviso">{aviso}</p>}
      {cargando ? <p role="status">Consultando la calificación...</p> : <>
        {error && <div role={sinPermiso ? 'status' : 'alert'}>
          <p>{error}</p>
          {!sinPermiso && !datos && <button type="button" className="ds-boton ds-boton--secundario" onClick={() => setVersion((v) => v + 1)}><IconoReintentar />Reintentar</button>}
        </div>}
        {!sinPermiso && datos && <>
          <p>Contraparte: <Link to={`/perfiles/${datos.contraparte.id_usuario}`} state={volverA(`/cargas/${idCarga}`, 'Volver a la carga')}>
            {datos.contraparte.nombre} {datos.contraparte.apellido}
          </Link>. Consultá su perfil y reputación.</p>
          {datos.emitida ? <div className="cal-evaluacion">
            <h3>Tu calificación: {datos.emitida.puntaje} / 5</h3>
            <p className="cal-comentario">{datos.emitida.comentario || 'Sin comentario.'}</p>
            <p>Registrada el {new Date(datos.emitida.creado_en).toLocaleString('es-AR', { hourCycle: 'h23' })}. No se puede modificar.</p>
          </div> : datos.puede_calificar ? <form onSubmit={enviar}>
            <fieldset disabled={guardando} className="cal-campos">
              <legend>Evaluá el desempeño de tu contraparte</legend>
              <p>Elegí de 1 (muy malo) a 5 (muy bueno). Solo podés calificar una vez por viaje.</p>
              <div className="cal-puntajes" role="group" aria-label="Puntaje obligatorio">
                {[1, 2, 3, 4, 5].map((valor) => <label key={valor} className={puntaje === String(valor) ? 'cal-puntaje cal-puntaje--activo' : 'cal-puntaje'}>
                  <input type="radio" name={`puntaje-${idCarga}`} value={valor} checked={puntaje === String(valor)} onChange={(e) => setPuntaje(e.target.value)} required />
                  {valor}
                </label>)}
              </div>
              <label htmlFor="cal-comentario">Comentario (opcional)</label>
              <textarea id="cal-comentario" rows={4} maxLength={1000} value={comentario} onChange={(e) => setComentario(e.target.value)} aria-describedby="cal-limite" />
              <small id="cal-limite">Hasta 1000 caracteres. Describí tu experiencia con el viaje.</small>
              <button className="ds-boton ds-boton--primario" type="submit" disabled={!puntaje || guardando}><IconoGuardar />{guardando ? 'Guardando...' : 'Enviar calificación'}</button>
            </fieldset>
          </form> : <p>{datos.motivo}</p>}
        </>}
      </>}
    </section>
  );
}
