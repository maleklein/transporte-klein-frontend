import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ModalConfirmacion from './ModalConfirmacion';
import { IconoCamion, IconoCheck } from './Iconos';
import { obtenerMisPostulaciones, postularACarga } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import { usuarioActual } from '../api/sesion';
import { formatearFecha } from '../utils/carga';
import { ESTADOS_ABIERTOS } from '../utils/estadosCarga';
import { evitarFoco } from '../utils/formulario';
import './PostulacionCarga.css';

/**
 * Lo que el camionero puede hacer con la carga que está mirando (HU 4 y HU 6).
 *
 * - Si la carga sigue abierta y no se postuló: el botón "Postularme", grande y
 *   azul, con un modal de confirmación antes y un aviso de éxito después.
 * - Si ya se postuló: lo dice en lugar del botón.
 * - Si se la asignaron: le dice que el viaje es suyo.
 *
 * Saber si ya se postuló sale de "Mis postulaciones": no hay un endpoint por
 * carga, y la lista de un camionero es corta.
 *
 * @param {object} props
 * @param {object} props.carga - la carga del detalle.
 * @param {function} [props.alPostularse] - avisa al detalle que hubo una postulación, para que refresque el estado y la bitácora.
 * @returns {JSX.Element|null}
 */
export default function PostulacionCarga({ carga, alPostularse }) {
  // 'cargando' | 'sin-postular' | 'postulado'
  const [situacion, setSituacion] = useState('cargando');
  const [recienPostulado, setRecienPostulado] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [postulando, setPostulando] = useState(false);
  const [error, setError] = useState('');
  const refBoton = useRef(null);
  const refAviso = useRef(null);

  const esSuya = carga.id_camionero_asignado === usuarioActual()?.id;
  const abierta = ESTADOS_ABIERTOS.includes(carga.estado_actual);

  useEffect(() => {
    if (!abierta || esSuya) return undefined;

    const controlador = new AbortController();
    setSituacion('cargando');
    setRecienPostulado(false);

    obtenerMisPostulaciones({ signal: controlador.signal })
      .then((postulaciones) => {
        const yaPostulado = postulaciones.some(
          (postulacion) => String(postulacion.id_carga) === String(carga.id_carga),
        );
        setSituacion(yaPostulado ? 'postulado' : 'sin-postular');
      })
      .catch((fallo) => {
        if (fallo?.name === 'AbortError') return;
        // Si no se puede saber, se ofrece el botón igual: el backend rechaza
        // la postulación repetida con un 409 que se muestra en el modal.
        setSituacion('sin-postular');
      });

    return () => controlador.abort();
  }, [carga.id_carga, abierta, esSuya]);

  // Lleva el foco al aviso de éxito apenas aparece, como el resto de los
  // avisos del detalle: quien usa lector de pantalla se entera del resultado.
  useEffect(() => {
    if (recienPostulado) refAviso.current?.focus({ preventScroll: true });
  }, [recienPostulado]);

  /** Cierra el modal sin postularse y devuelve el foco al botón. */
  const cerrarModal = () => {
    if (postulando) return;
    setModalAbierto(false);
    refBoton.current?.focus({ preventScroll: true });
  };

  /** Aplica la postulación. Un rechazo del backend se muestra dentro del modal. */
  const confirmar = async () => {
    setPostulando(true);
    setError('');
    try {
      await postularACarga(carga.id_carga);
      setModalAbierto(false);
      setSituacion('postulado');
      setRecienPostulado(true);
      alPostularse?.();
    } catch (fallo) {
      setError(
        fallo instanceof ErrorDeApi ? fallo.message : 'Ocurrió un error inesperado al postularte.',
      );
    } finally {
      setPostulando(false);
    }
  };

  if (esSuya) {
    return (
      <section className="dc-card pc-tarjeta">
        <h2 className="dc-card__titulo">Tu viaje</h2>
        <p className="pc-estado pc-estado--suyo">
          <IconoCheck width={20} height={20} />
          Te asignaron esta carga. Cuando cambie de estado, te llega un aviso.
        </p>
      </section>
    );
  }

  if (!abierta) return null;

  return (
    <section className="dc-card pc-tarjeta">
      <h2 className="dc-card__titulo">Postularte a esta carga</h2>

      {situacion === 'cargando' && <p className="pc-texto">Revisando tus postulaciones...</p>}

      {situacion === 'sin-postular' && (
        <>
          <p className="pc-texto">
            Si te interesa llevarla, postulate. El administrador elige entre los camioneros
            postulados y, si te elige a vos, te llega un aviso.
          </p>
          <button
            type="button"
            ref={refBoton}
            className="ds-boton ds-boton--primario pc-boton"
            onClick={() => {
              setError('');
              setModalAbierto(true);
            }}
            onMouseDown={evitarFoco}
          >
            <IconoCamion />
            Postularme
          </button>
        </>
      )}

      {situacion === 'postulado' && (
        <div className="pc-estado" role="status" tabIndex={-1} ref={refAviso}>
          <IconoCheck width={20} height={20} />
          <span>
            {recienPostulado ? 'Listo, te postulaste.' : 'Ya te postulaste a esta carga.'} Si te
            eligen, te llega un aviso. La podés seguir en <Link to="/mis-viajes">Mis viajes</Link>.
          </span>
        </div>
      )}

      <ModalConfirmacion
        abierto={modalAbierto}
        titulo="¿Te postulás a esta carga?"
        detalle={`${carga.origen} → ${carga.destino}, con retiro el ${formatearFecha(carga.fecha)}. Postularte no te compromete hasta que el administrador te asigne la carga.`}
        error={error}
        textoConfirmar="Sí, postularme"
        textoVolver="Volver"
        aplicando={postulando}
        variante="primario"
        alConfirmar={confirmar}
        alCancelar={cerrarModal}
      />
    </section>
  );
}
