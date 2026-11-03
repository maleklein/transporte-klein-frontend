import { useEffect, useState } from 'react';
import { obtenerReputacion } from '../api/calificaciones';
import { IconoFlechaAtras, IconoReintentar } from './Iconos';
import './Calificaciones.css';

export default function ReputacionUsuario({ idUsuario, mostrarIdentidad = false }) {
  const [pagina, setPagina] = useState(1);
  const [version, setVersion] = useState(0);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    const controlador = new AbortController();
    setCargando(true);
    setError('');
    obtenerReputacion(idUsuario, pagina, controlador.signal)
      .then(setDatos)
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controlador.signal.aborted) setCargando(false); });
    return () => controlador.abort();
  }, [idUsuario, pagina, version]);

  return <section className="dc-card cal-seccion" aria-label="Reputación del usuario">
    {cargando ? <p role="status">Cargando reputación...</p> : error ? <div role="alert">
      <p>{error}</p><button className="ds-boton ds-boton--secundario" onClick={() => setVersion((v) => v + 1)}><IconoReintentar />Reintentar</button>
    </div> : datos && <>
      {mostrarIdentidad && <><h2>{datos.usuario.nombre} {datos.usuario.apellido}</h2><p>{datos.usuario.rol === 'camionero' ? 'Camionero' : 'Administrador'}</p></>}
      <h2>Reputación</h2>
      <p className="cal-promedio">{datos.reputacion.promedio === null ? 'Sin calificaciones' : `${datos.reputacion.promedio.toLocaleString('es-AR', { minimumFractionDigits: 2 })} / 5`}</p>
      <p>{datos.reputacion.total} {datos.reputacion.total === 1 ? 'calificación recibida' : 'calificaciones recibidas'} · {datos.reputacion.evaluaciones_utilizadas} {datos.reputacion.evaluaciones_utilizadas === 1 ? 'utilizada' : 'utilizadas'} en el promedio.</p>
      <details><summary>Cómo se calcula</summary>
        <p>Se consideran las últimas 10 evaluaciones. La más reciente tiene peso 10, la siguiente 9 y así hasta 1. Si hay menos, solo se usan los pesos correspondientes a las evaluaciones existentes.</p>
        <p>Se suman los puntajes multiplicados por sus pesos y se divide por la suma de esos pesos. Por ejemplo, un 5 reciente y un 3 anterior dan (5 × 10 + 3 × 9) / 19 = 4,05.</p>
      </details>
      <h3>Historial de calificaciones</h3>
      {!datos.historial.length && <p>Todavía no hay evaluaciones en esta página.</p>}
      <ol className="cal-historial">
        {datos.historial.map((calificacion) => <li key={calificacion.id_calificacion} className="cal-evaluacion">
          <strong>{calificacion.puntaje} / 5 — {calificacion.nombre_emisor} {calificacion.apellido_emisor}</strong>
          <p>Viaje #{calificacion.id_carga} · {new Date(calificacion.creado_en).toLocaleString('es-AR', { hourCycle: 'h23' })}</p>
          <p className="cal-comentario">{calificacion.comentario || 'Sin comentario.'}</p>
        </li>)}
      </ol>
      <div className="cal-paginacion" aria-label="Páginas del historial">
        <button className="ds-boton ds-boton--secundario" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}><IconoFlechaAtras />Anterior</button>
        <span>Página {pagina}</span>
        <button className="ds-boton ds-boton--secundario" disabled={!datos.hay_mas} onClick={() => setPagina((p) => p + 1)}>Siguiente<IconoFlechaAtras style={{ transform: 'rotate(180deg)' }} /></button>
      </div>
    </>}
  </section>;
}
