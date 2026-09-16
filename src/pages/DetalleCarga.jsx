import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconoAlerta,
  IconoCaja,
  IconoCalendario,
  IconoCamion,
  IconoDocumento,
  IconoEditar,
  IconoEtiqueta,
  IconoFlechaAtras,
  IconoPeso,
  IconoUbicacion,
} from '../components/Iconos';
import EstadoCarga from '../components/EstadoCarga';
import HistorialCarga from '../components/HistorialCarga';
import { cambiarEstadoCarga, obtenerCarga } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import { usuarioActual } from '../api/sesion';
import { evitarFoco } from '../utils/formulario';
import { ESTADOS_BLOQUEADOS_EDICION, formatearFecha, formatearPeso } from '../utils/carga';
import DialogoConfirmacion from '../components/DialogoConfirmacion';
import ProgresoCarga from '../components/ProgresoCarga';
import {
  esCorreccion,
  etiquetaEstado,
  requiereConfirmacion,
  transicionesDesde,
} from '../utils/estadosCarga';
import './DetalleCarga.css';

/**
 * Detalle de una carga (HU 2.5), en la ruta /cargas/:id.
 *
 * Replica el bloque "Información de la carga" del mockup: título con el badge de
 * estado, la ruta origen → destino, fecha de retiro, peso, tipo y la descripción
 * (`observaciones`). Debajo va el historial de estados (HU 8, `HistorialCarga`).
 * Los bloques de camioneros / asignación son de otras HU (Sprint 2) y no van acá.
 *
 * El `id_carga` se lee de la URL y la carga se pide con `GET /cargas/:id` al
 * entrar. Funciona igual llegando desde el listado (click en una tarjeta) o
 * escribiendo la dirección a mano / refrescando. Mientras espera muestra
 * "Cargando…"; si la carga no existe (404) muestra un mensaje claro.
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

  // Cambio de estado (HU 7): qué transición está en curso, el error si la
  // rechazó el backend, y el aviso de éxito. `cambiandoA` guarda el estado
  // destino en vez de un booleano, para poder mostrar el spinner sólo en el
  // botón que se apretó y no en todos.
  const [cambiandoA, setCambiandoA] = useState(null);
  const [errorEstado, setErrorEstado] = useState('');
  const [avisoEstado, setAvisoEstado] = useState('');

  // Estado destino esperando confirmación, o null si el diálogo está cerrado.
  // Sólo se llena para las transiciones irreversibles (ver `pedirCambio`).
  const [confirmando, setConfirmando] = useState(null);

  // Sólo el administrador cambia estados; al camionero no se le muestran los
  // botones. El backend igual lo exige con requireRol, así que esto es
  // presentación, no seguridad.
  const esAdministrador = usuarioActual()?.rol === 'administrador';

  // Historial: se refresca junto con la carga, para que la bitácora muestre el
  // asiento que acaba de generar el cambio de estado.
  const [versionHistorial, setVersionHistorial] = useState(0);

  /**
   * Lleva la carga a otro estado y refresca la pantalla con lo que devuelve el
   * backend. Si la transición se rechaza (409), muestra el mensaje del
   * servidor, que ya explica a qué estados sí se puede pasar.
   *
   * @param {string} estadoNuevo - estado destino.
   * @returns {Promise<void>}
   */
  const alCambiarEstado = async (estadoNuevo) => {
    setCambiandoA(estadoNuevo);
    setErrorEstado('');
    setAvisoEstado('');

    try {
      const actualizada = await cambiarEstadoCarga(carga.id_carga, estadoNuevo);
      setCarga(actualizada);
      setAvisoEstado(`La carga pasó a "${etiquetaEstado(actualizada.estado_actual)}".`);
      setVersionHistorial((version) => version + 1);
    } catch (error) {
      setErrorEstado(
        error instanceof ErrorDeApi
          ? error.message
          : 'Ocurrió un error inesperado al cambiar el estado.',
      );
    } finally {
      setCambiandoA(null);
      setConfirmando(null);
    }
  };

  /**
   * Punto de entrada de los botones de estado. Las transiciones que se pueden
   * deshacer se aplican directo; las que llevan a un estado final abren el
   * diálogo de confirmación primero, que es lo que pide HU 2.4 para cancelar.
   *
   * @param {string} estadoNuevo - estado destino.
   * @returns {void}
   */
  const pedirCambio = (estadoNuevo) => {
    if (requiereConfirmacion(estadoNuevo)) {
      setConfirmando(estadoNuevo);
      return;
    }
    alCambiarEstado(estadoNuevo);
  };

  useEffect(() => {
    const controlador = new AbortController();
    setEstadoPantalla('cargando');
    setMensajeError('');

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
              Cambio de estado (HU 7). Se muestra un botón por cada transición
              permitida desde el estado actual, en vez de un selector con todos
              los estados: así el usuario no puede siquiera elegir una
              transición inválida, y no hace falta explicarle por qué falló.
            */}
            {esAdministrador && (
              <section className="dc-estados">
                <h2 className="dc-card__titulo">Progreso de la carga</h2>

                <ProgresoCarga estado={carga.estado_actual} />

                {avisoEstado && (
                  <p className="dc-estados__aviso dc-estados__aviso--exito" role="status">
                    {avisoEstado}
                  </p>
                )}

                {errorEstado && (
                  <p className="dc-estados__aviso dc-estados__aviso--error" role="alert">
                    <IconoAlerta width={18} height={18} />
                    {errorEstado}
                  </p>
                )}

                {transicionesDesde(carga.estado_actual).length === 0 ? (
                  <p className="dc-estados__final">
                    La carga está <strong>{etiquetaEstado(carga.estado_actual).toLowerCase()}</strong>:
                    es un estado final y ya no admite más cambios.
                  </p>
                ) : (
                  (() => {
                    // Se separan en tres grupos para que se lea qué hace cada
                    // botón: avanzar el ciclo, volver atrás para corregir un
                    // error, o cancelar la carga (que no tiene vuelta).
                    const posibles = transicionesDesde(carga.estado_actual);
                    const avanzar = posibles.filter(
                      (destino) =>
                        destino !== 'cancelada' && !esCorreccion(carga.estado_actual, destino),
                    );
                    const corregir = posibles.filter((destino) =>
                      esCorreccion(carga.estado_actual, destino),
                    );
                    const cancelar = posibles.filter((destino) => destino === 'cancelada');

                    // Los botones dicen la acción, no el nombre del estado:
                    // leídos sueltos, "Pendiente" es un sustantivo y "Marcar
                    // como pendiente" dice qué va a pasar al apretarlo.
                    const boton = (estadoDestino, clase, verbo) => (
                      <button
                        key={estadoDestino}
                        type="button"
                        className={`ds-boton ${clase}`}
                        onClick={() => pedirCambio(estadoDestino)}
                        onMouseDown={evitarFoco}
                        disabled={cambiandoA !== null}
                      >
                        {cambiandoA === estadoDestino ? 'Cambiando...' : verbo}
                      </button>
                    );

                    return (
                      <>
                        {avanzar.length > 0 && (
                          <div className="dc-estados__botones">
                            {avanzar.map((destino) =>
                              boton(
                                destino,
                                'ds-boton--primario',
                                `Marcar como ${etiquetaEstado(destino).toLowerCase()}`,
                              ),
                            )}
                          </div>
                        )}

                        {(corregir.length > 0 || cancelar.length > 0) && (
                          <div className="dc-estados__secundarias">
                            {corregir.length > 0 && (
                              <div className="dc-estados__grupo">
                                <p className="dc-estados__ayuda">¿Te equivocaste?</p>
                                <div className="dc-estados__botones">
                                  {corregir.map((destino) =>
                                    boton(
                                      destino,
                                      'ds-boton--secundario',
                                      `Volver a ${etiquetaEstado(destino).toLowerCase()}`,
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            {cancelar.length > 0 && (
                              <div className="dc-estados__grupo">
                                {cancelar.map((destino) =>
                                  boton(destino, 'ds-boton--cancelar', 'Cancelar carga'),
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </section>
            )}

            {/*
              Se muestran los últimos cambios y el resto queda detrás de un
              "Ver todos": con muchas transiciones la bitácora ocupaba más que
              todo el resto de la pantalla junto.
              El `key` cambia con cada cambio de estado, lo que remonta el
              componente y vuelve a pedir el historial, así el asiento nuevo
              aparece sin recargar la página.
            */}
            <HistorialCarga key={versionHistorial} idCarga={carga.id_carga} maximoVisible={4} />
          </>
        )}
      </main>

      {/*
        Confirmación de las transiciones que no se pueden deshacer. HU 2.4 la
        pide explícitamente para cancelar; se aplica igual a "entregada", que
        por RN-01 tampoco tiene vuelta.
      */}
      <DialogoConfirmacion
        abierto={confirmando !== null}
        peligroso={confirmando === 'cancelada'}
        ocupado={cambiandoA !== null}
        titulo={
          confirmando === 'cancelada' ? '¿Cancelar esta carga?' : '¿Marcarla como entregada?'
        }
        mensaje={
          confirmando === 'cancelada'
            ? 'La carga deja de estar disponible para los camioneros y no se puede reactivar. Si hiciera falta, habría que darla de alta de nuevo.'
            : 'Una vez entregada, la carga no vuelve a estados anteriores y sus datos quedan como registro de lo que pasó.'
        }
        textoConfirmar={confirmando === 'cancelada' ? 'Sí, cancelar' : 'Sí, marcar entregada'}
        textoCancelar="Volver"
        alConfirmar={() => alCambiarEstado(confirmando)}
        alCancelar={() => setConfirmando(null)}
      />
    </>
  );
}
