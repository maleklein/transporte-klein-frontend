import { useEffect, useState } from 'react';
import { obtenerReputacion } from '../api/calificaciones';
import { usuarioActual } from '../api/sesion';
import { formatearFecha, formatearMarcaCorta } from '../utils/carga';
import {
  IconoCalendario,
  IconoCorreo,
  IconoDocumento,
  IconoEstrella,
  IconoFlechaAtras,
  IconoReintentar,
} from './Iconos';
import './Calificaciones.css';

/**
 * Cinco estrellas, llenas hasta el puntaje redondeado.
 *
 * Con `etiqueta` son una imagen con ese nombre para el lector de pantalla
 * ("4 de 5"): en el historial el puntaje no está escrito, solo se ven las
 * estrellas. Sin `etiqueta` son decorativas, porque el número está al lado.
 *
 * @param {object} props
 * @param {number} props.valor - de 1 a 5; puede tener decimales.
 * @param {string} [props.etiqueta] - el puntaje en palabras, si no está escrito al lado.
 * @returns {JSX.Element}
 */
function Estrellas({ valor, etiqueta }) {
  const llenas = Math.round(valor);
  const accesible = etiqueta ? { role: 'img', 'aria-label': etiqueta } : { 'aria-hidden': true };
  return (
    <span className="rp-estrellas" {...accesible}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconoEstrella key={n} className={n <= llenas ? 'rp-estrella rp-estrella--llena' : 'rp-estrella'} />
      ))}
    </span>
  );
}

/**
 * Una barra por puntaje, de 5 a 1, con el largo proporcional a cuántas
 * calificaciones tiene ese puntaje sobre el total. Cuenta todas, no solo las
 * 10 que entran en el promedio.
 *
 * @param {object} props
 * @param {Record<string, number>} props.distribucion - cantidad por puntaje, con claves de "1" a "5".
 * @param {number} props.total
 * @returns {JSX.Element}
 */
function Distribucion({ distribucion, total }) {
  return (
    <ul className="rp-distribucion" aria-label="Calificaciones por puntaje">
      {[5, 4, 3, 2, 1].map((puntaje) => {
        const cantidad = distribucion[puntaje] ?? 0;
        return (
          <li key={puntaje} className="rp-distribucion__fila">
            <span className="rp-distribucion__puntaje" aria-hidden="true">
              {puntaje} <IconoEstrella className="rp-estrella" />
            </span>
            <span className="rp-distribucion__barra" aria-hidden="true">
              <span style={{ width: `${(cantidad / total) * 100}%` }} />
            </span>
            <span className="rp-distribucion__cantidad" aria-hidden="true">
              {cantidad}
            </span>
            <span className="rp-oculto">
              {puntaje} {puntaje === 1 ? 'estrella' : 'estrellas'}: {cantidad}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Email, DNI y fecha de alta. Solo en el perfil propio: son datos personales y
 * el perfil también lo puede ver la contraparte de un viaje.
 *
 * @param {object} props
 * @param {{ email: string, dni: string, creado_en: string }} props.usuario
 * @returns {JSX.Element}
 */
function DatosCuenta({ usuario }) {
  return (
    <div className="rp-bloque">
      <h3 className="rp-etiqueta">Datos de la cuenta</h3>
      <dl className="dc-datos">
        <div className="dc-dato">
          <dt>
            <IconoCorreo width={15} height={15} />
            Email
          </dt>
          <dd>{usuario.email}</dd>
        </div>
        <div className="dc-dato">
          <dt>
            <IconoDocumento width={15} height={15} />
            DNI
          </dt>
          <dd>{usuario.dni}</dd>
        </div>
        <div className="dc-dato">
          <dt>
            <IconoCalendario width={15} height={15} />
            Alta
          </dt>
          <dd>{usuario.creado_en ? formatearFecha(usuario.creado_en) : '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Iniciales para el círculo del encabezado: la primera letra del nombre y la
 * del apellido.
 *
 * @param {{ nombre: string, apellido: string }} usuario
 * @returns {string}
 */
const iniciales = (usuario) => `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase();

/**
 * Reputación de un usuario (HU 11): el promedio ponderado y el historial de
 * calificaciones recibidas, paginado.
 *
 * Se usa en el perfil (con `mostrarIdentidad`, que suma el encabezado con el
 * nombre y el rol) y en la ficha de un usuario que ve el administrador. Los
 * administradores no reciben calificaciones, así que a ellos no se les muestra
 * la reputación.
 *
 * @param {object} props
 * @param {number|string} props.idUsuario
 * @param {boolean} [props.mostrarIdentidad] - si muestra nombre y rol arriba.
 * @returns {JSX.Element}
 */
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
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });
    return () => controlador.abort();
  }, [idUsuario, pagina, version]);

  // La primera vez no hay nada que mostrar. Al cambiar de página, en cambio,
  // queda la anterior a la vista (atenuada) para que la pantalla no salte.
  if (cargando && !datos) {
    return (
      <section className="dc-card cal-seccion">
        <p role="status">Cargando reputación...</p>
      </section>
    );
  }

  if (error && !datos) {
    return (
      <section className="dc-card cal-seccion" role="alert">
        <p>{error}</p>
        <button className="ds-boton ds-boton--secundario" onClick={() => setVersion((v) => v + 1)}>
          <IconoReintentar />
          Reintentar
        </button>
      </section>
    );
  }

  if (!datos) return null;

  const { usuario, reputacion, historial } = datos;
  const esCamionero = usuario.rol !== 'administrador';
  const tieneCalificaciones = reputacion.total > 0;
  const promedioTexto = reputacion.promedio?.toLocaleString('es-AR', { minimumFractionDigits: 2 });
  // Los datos de la cuenta son solo para quien mira su propio perfil: el perfil
  // también lo puede ver la contraparte de un viaje.
  const esPropio = mostrarIdentidad && String(usuarioActual()?.id) === String(idUsuario);
  const verCuenta = esPropio && Boolean(usuario.email);
  // Sin nada debajo del encabezado (un administrador visto por otro), la línea divisoria sobra.
  const encabezadoSolo = !verCuenta && !esCamionero;

  return (
    <section className="dc-card cal-seccion" aria-label="Perfil y reputación">
      {mostrarIdentidad && (
        <header className={encabezadoSolo ? 'rp-identidad rp-identidad--sola' : 'rp-identidad'}>
          <span className="rp-avatar" aria-hidden="true">
            {iniciales(usuario)}
          </span>
          <div>
            <h2 className="rp-nombre">
              {usuario.nombre} {usuario.apellido}
            </h2>
            <span className="rp-rol">{esCamionero ? 'Camionero' : 'Administrador'}</span>
          </div>
        </header>
      )}

      {verCuenta && <DatosCuenta usuario={usuario} />}

      {esCamionero && (
        <>
          <div className="rp-bloque">
            {/* En la ficha del administrador es el título de la tarjeta, como "Datos personales". */}
            {mostrarIdentidad ? (
              <h3 className="rp-etiqueta">Reputación</h3>
            ) : (
              <h2 className="dc-card__titulo">
                <IconoEstrella width={20} height={20} />
                Reputación
              </h2>
            )}
            {reputacion.promedio === null ? (
              <p className="rp-vacio">Todavía no tiene calificaciones.</p>
            ) : (
              <div className="rp-resumen">
                <div className="rp-promedio">
                  {/* El número se ve; el lector de pantalla lo lee en las estrellas, con el "de 5". */}
                  <span className="rp-promedio__numero" aria-hidden="true">
                    {promedioTexto}
                  </span>
                  <div className="rp-promedio__detalle">
                    <Estrellas valor={reputacion.promedio} etiqueta={`${promedioTexto} de 5`} />
                    <span className="rp-promedio__total">
                      {reputacion.total} {reputacion.total === 1 ? 'calificación' : 'calificaciones'}
                    </span>
                  </div>
                </div>
                {reputacion.distribucion && (
                  <Distribucion distribucion={reputacion.distribucion} total={reputacion.total} />
                )}
              </div>
            )}
          </div>

          {/* Sin calificaciones no hay historial que mostrar: lo dice el bloque de arriba. */}
          {tieneCalificaciones && (
            <div className="rp-bloque">
              <h3 className="rp-etiqueta">Historial de calificaciones</h3>
              <ol className={cargando ? 'cal-historial rp-cargando' : 'cal-historial'} aria-busy={cargando}>
                {historial.map((calificacion) => (
                  <li key={calificacion.id_calificacion} className="cal-evaluacion">
                    <div className="rp-evaluacion__cabecera">
                      <span className="rp-evaluacion__quien">
                        <Estrellas valor={calificacion.puntaje} etiqueta={`${calificacion.puntaje} de 5`} />
                        <strong>
                          {calificacion.nombre_emisor} {calificacion.apellido_emisor}
                        </strong>
                      </span>
                      <span className="rp-meta">
                        Viaje #{calificacion.id_carga} · {formatearMarcaCorta(calificacion.creado_en)}
                      </span>
                    </div>
                    {calificacion.comentario && <p className="cal-comentario">{calificacion.comentario}</p>}
                  </li>
                ))}
              </ol>
              {(pagina > 1 || datos.hay_mas) && (
                <nav className="cal-paginacion" aria-label="Páginas del historial">
                  {/* En la primera página no hay Anterior ni en la última Siguiente: no se
                      muestran. El hueco vacío mantiene la página al medio y el otro botón en
                      su lado. */}
                  {pagina > 1 ? (
                    <button
                      className="ds-boton ds-boton--secundario"
                      disabled={cargando}
                      onClick={() => setPagina((p) => p - 1)}
                    >
                      <IconoFlechaAtras />
                      Anterior
                    </button>
                  ) : (
                    <span />
                  )}
                  <span className="rp-pagina">Página {pagina}</span>
                  {datos.hay_mas ? (
                    <button
                      className="ds-boton ds-boton--secundario"
                      disabled={cargando}
                      onClick={() => setPagina((p) => p + 1)}
                    >
                      Siguiente
                      <IconoFlechaAtras style={{ transform: 'rotate(180deg)' }} />
                    </button>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
              {/* Si falla el cambio de página, la anterior sigue a la vista y el error va acá. */}
              {error && (
                <p className="rp-error" role="alert">
                  {error}{' '}
                  <button className="ds-boton ds-boton--secundario" onClick={() => setVersion((v) => v + 1)}>
                    <IconoReintentar />
                    Reintentar
                  </button>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
