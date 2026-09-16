import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconoAlerta,
  IconoCaja,
  IconoCalendario,
  IconoCamion,
  IconoDocumento,
  IconoEditar,
  IconoFlechaAtras,
  IconoPeso,
  IconoUbicacion,
} from '../components/Iconos';
import EstadoCarga from '../components/EstadoCarga';
import HistorialCarga from '../components/HistorialCarga';
import ProgresoCarga from '../components/ProgresoCarga';
import { cambiarEstadoCarga, obtenerCarga, obtenerHistorialCarga } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import { usuarioActual } from '../api/sesion';
import { evitarFoco } from '../utils/formulario';
import { ESTADOS_BLOQUEADOS_EDICION, formatearFecha, formatearPeso } from '../utils/carga';
import './DetalleCarga.css';

/**
 * Detalle de una carga (HU 2.5), en la ruta /cargas/:id.
 *
 * Replica el bloque "Información de la carga" del mockup: título con el badge de
 * estado, la ruta origen → destino, fecha de retiro, peso, tipo y la descripción
 * (`observaciones`). Debajo van el progreso de la carga (HU 7, `ProgresoCarga`)
 * y el historial de estados (HU 8, `HistorialCarga`). Los bloques de camioneros
 * / asignación son de otras HU (Sprint 2) y no van acá.
 *
 * El `id_carga` se lee de la URL y la carga se pide con `GET /cargas/:id` al
 * entrar. Funciona igual llegando desde el listado (click en una tarjeta) o
 * escribiendo la dirección a mano / refrescando. Mientras espera muestra
 * "Cargando…"; si la carga no existe (404) muestra un mensaje claro.
 *
 * La bitácora se pide acá y no dentro de cada componente porque la usan dos:
 * el historial la muestra entera y el progreso saca de ella cuándo se llegó a
 * cada paso. Pedirla una sola vez además los deja siempre en sincronía.
 *
 * @returns {JSX.Element}
 */
export default function DetalleCarga() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [carga, setCarga] = useState(null);
  // 'cargando' | 'ok' | 'no-encontrada' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');

  // Bitácora de cambios de estado (HU 8), en orden cronológico tal como la
  // devuelve el backend. `versionHistorial` se incrementa después de cada
  // cambio de estado para volver a pedirla.
  const [eventos, setEventos] = useState([]);
  // 'cargando' | 'ok' | 'error'
  const [estadoHistorial, setEstadoHistorial] = useState('cargando');
  const [errorHistorial, setErrorHistorial] = useState('');
  const [versionHistorial, setVersionHistorial] = useState(0);

  // Sólo el administrador cambia estados; al camionero no se le muestra el
  // bloque de progreso. El backend igual lo exige con requireRol, así que esto
  // es presentación, no seguridad.
  const esAdministrador = usuarioActual()?.rol === 'administrador';

  /**
   * Lleva la carga a otro estado y deja la pantalla al día con lo que devuelve
   * el backend. Los errores se dejan propagar: los muestra `ProgresoCarga`,
   * que es donde está el botón que los provocó.
   *
   * @param {string} estadoNuevo - estado destino.
   * @returns {Promise<object>} la carga ya actualizada.
   * @throws {ErrorDeApi} si el backend rechaza la transición (409) o falla.
   */
  const cambiarEstado = async (estadoNuevo) => {
    const actualizada = await cambiarEstadoCarga(carga.id_carga, estadoNuevo);
    setCarga(actualizada);
    setVersionHistorial((version) => version + 1);
    return actualizada;
  };

  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPantalla('cargando');
    setMensajeError('');
    // Se limpia lo de la carga anterior para no mostrar por un instante la
    // bitácora de una carga distinta.
    setEventos([]);
    setEstadoHistorial('cargando');
    setVersionHistorial(0);

    obtenerCarga(id, { signal: controlador.signal })
      .then((datos) => {
        setCarga(datos);
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        if (error instanceof ErrorDeApi && error.estado === 404) {
          setEstadoPantalla('no-encontrada');
          return;
        }
        setMensajeError(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudo cargar el detalle de la carga. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });

    return () => controlador.abort();
  }, [id]);

  const hayCarga = estadoPantalla === 'ok';

  // Bitácora: se pide cuando la carga ya está, y de nuevo después de cada
  // cambio de estado. En esas recargas no se vuelve a "Cargando...": se deja a
  // la vista lo anterior y se reemplaza al llegar lo nuevo, para que el bloque
  // no parpadee en cada cambio.
  useEffect(() => {
    if (!hayCarga) return undefined;

    const controlador = new AbortController();
    setErrorHistorial('');

    obtenerHistorialCarga(id, { signal: controlador.signal })
      .then((datos) => {
        setEventos(datos);
        setEstadoHistorial('ok');
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setErrorHistorial(
          error instanceof ErrorDeApi
            ? error.message
            : 'No se pudo cargar el historial de la carga. Intentá de nuevo.',
        );
        setEstadoHistorial('error');
      });

    return () => controlador.abort();
  }, [id, hayCarga, versionHistorial]);

  const descripcion =
    carga && typeof carga.observaciones === 'string' && carga.observaciones.trim()
      ? carga.observaciones
      : 'Sin descripción.';

  return (
    <>
      <nav className="us-navbar">
        <IconoCamion width={28} height={28} />
        <span className="us-navbar__marca">Transporte Klein</span>
      </nav>

      <main className="dc-contenido">
        <button type="button" className="dc-volver" onClick={() => navigate('/cargas')}>
          <IconoFlechaAtras width={20} height={20} />
          Volver a Cargas
        </button>

        {estadoPantalla === 'cargando' && <p className="dc-mensaje">Cargando carga...</p>}

        {estadoPantalla === 'no-encontrada' && (
          <div className="dc-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            No encontramos la carga #{id}. Puede que se haya eliminado o que la dirección
            sea incorrecta.
          </div>
        )}

        {estadoPantalla === 'error' && (
          <div className="dc-aviso-error" role="alert">
            <IconoAlerta width={22} height={22} />
            {mensajeError}
          </div>
        )}

        {estadoPantalla === 'ok' && carga && (
          <>
            {/*
              El encabezado junta las tres cosas que identifican a la carga —
              qué es, a dónde va y en qué estado está — con la acción que se
              ejerce sobre ella. "Editar" vive acá y no en un bloque aparte
              porque actúa sobre el objeto que se está mirando, no sobre su
              ciclo de vida.
            */}
            <header className="dc-encabezado">
              <div className="dc-encabezado__identidad">
                <h1 className="dc-titulo">
                  <IconoCaja width={26} height={26} />
                  {carga.tipo_carga}
                </h1>
                <p className="dc-encabezado__ruta">
                  {carga.origen}
                  <span aria-hidden="true"> → </span>
                  {carga.destino}
                </p>
              </div>

              <div className="dc-encabezado__acciones">
                {/*
                  El badge sólo aparece cuando no se muestra el progreso. Si el
                  progreso está, ya nombra el estado actual y encima lo resalta,
                  así que repetirlo acá sería decir dos veces lo mismo a 400px
                  de distancia. Al camionero, que no ve el progreso, el badge le
                  queda como único indicador.
                */}
                {!esAdministrador && <EstadoCarga estado={carga.estado_actual} />}
                {esAdministrador && !ESTADOS_BLOQUEADOS_EDICION.includes(carga.estado_actual) && (
                  <button
                    type="button"
                    className="ds-boton ds-boton--secundario"
                    onClick={() => navigate(`/cargas/${carga.id_carga}/editar`)}
                    onMouseDown={evitarFoco}
                  >
                    <IconoEditar />
                    Editar
                  </button>
                )}
              </div>
            </header>

            <section className="dc-card">
              <h2 className="dc-card__titulo">Información de la carga</h2>

              <dl className="dc-datos">
                <div className="dc-dato">
                  <dt>
                    <IconoUbicacion width={15} height={15} />
                    Origen
                  </dt>
                  <dd>{carga.origen}</dd>
                </div>
                <div className="dc-dato">
                  <dt>
                    <IconoUbicacion width={15} height={15} />
                    Destino
                  </dt>
                  <dd>{carga.destino}</dd>
                </div>
                <div className="dc-dato">
                  <dt>
                    <IconoCalendario width={15} height={15} />
                    Fecha de retiro
                  </dt>
                  <dd>{formatearFecha(carga.fecha)}</dd>
                </div>
                <div className="dc-dato">
                  <dt>
                    <IconoPeso width={15} height={15} />
                    Peso
                  </dt>
                  <dd>{formatearPeso(carga.peso_kg)}</dd>
                </div>
              </dl>

              <div className="dc-descripcion">
                <h3 className="dc-descripcion__titulo">
                  <IconoDocumento width={16} height={16} />
                  Descripción
                </h3>
                <p className="dc-descripcion__texto">{descripcion}</p>
              </div>
            </section>

            {/*
              Progreso y cambio de estado (HU 7). El componente resuelve solo
              qué acciones ofrecer a partir de la máquina de estados, y usa el
              historial para mostrar cuándo se llegó a cada paso.
            */}
            {esAdministrador && (
              <ProgresoCarga
                estado={carga.estado_actual}
                eventos={eventos}
                alCambiarEstado={cambiarEstado}
              />
            )}

            {/*
              Se muestran los últimos cambios y el resto queda detrás de un
              "Ver más": con muchas transiciones la bitácora ocupaba más que
              todo el resto de la pantalla junto.
            */}
            <HistorialCarga
              eventos={eventos}
              estadoPedido={estadoHistorial}
              mensajeError={errorHistorial}
              maximoVisible={4}
            />
          </>
        )}
      </main>
    </>
  );
}
