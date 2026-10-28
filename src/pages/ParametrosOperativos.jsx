import { useCallback, useEffect, useState } from 'react';
import BarraSuperior from '../components/BarraSuperior';
import Campo from '../components/Campo';
import ModalConfirmacion from '../components/ModalConfirmacion';
import { IconoAjustes, IconoAlerta, IconoCheck, IconoGuardar, IconoReintentar } from '../components/Iconos';
import { actualizarParametros, obtenerParametros } from '../api/parametros';
import { ErrorDeValidacion } from '../api/cargas';
import { ErrorDeApi } from '../api/usuarios';
import { evitarFoco } from '../utils/formulario';
import { PARAMETROS_COSTO, formatearFechaHora, formatearPesos } from '../utils/carga';
import './AltaUsuario.css';
import './ParametrosOperativos.css';

/** Tope de la columna NUMERIC(12, 4) del backend: ocho dígitos enteros. */
const VALOR_MAXIMO = 99999999.9999;

/**
 * Valida un parámetro con las mismas reglas que el backend
 * (`validators/parametros.js`), para avisar antes de abrir la confirmación.
 *
 * @param {string} texto - lo que hay en el input.
 * @returns {string} el mensaje de error, o cadena vacía si es válido.
 */
function validarValor(texto) {
  const limpio = String(texto ?? '').trim();
  if (limpio === '') return 'Completá este valor.';
  const numero = Number(limpio);
  if (!Number.isFinite(numero)) return 'Ingresá un número.';
  if (numero <= 0) return 'Tiene que ser mayor a cero.';
  if (numero > VALOR_MAXIMO) return 'El valor es demasiado grande.';
  if (!/^\d+(\.\d{1,4})?$/.test(limpio)) return 'Usá como máximo 4 decimales.';
  return '';
}

/**
 * Pasa la lista que devuelve el backend a `{ clave: 'valor como texto' }`,
 * que es lo que muestran los inputs.
 *
 * @param {Array<{clave: string, valor: number}>} parametros
 * @returns {Record<string, string>}
 */
function aValoresDeFormulario(parametros) {
  return Object.fromEntries(parametros.map(({ clave, valor }) => [clave, String(valor)]));
}

/**
 * Parámetros operativos del administrador (HU 10), en la ruta /parametros.
 *
 * Los tres valores de la fórmula de costos, con su descripción y la fecha de
 * su última modificación. Guardar pide confirmación y avisa lo importante:
 * los valores nuevos se usan desde la próxima carga que se calcule, y las que
 * ya tienen su estimación no cambian (cada una guarda la cuenta como foto).
 *
 * Mismo criterio de acceso que el panel de métricas: el enlace sólo se le
 * muestra al administrador y, si se entra por URL, el backend responde 403 y
 * se muestra como error.
 *
 * @returns {JSX.Element}
 */
export default function ParametrosOperativos() {
  // Los vigentes, tal cual los devolvió el backend.
  const [parametros, setParametros] = useState([]);
  // Lo que está escrito en los inputs.
  const [valores, setValores] = useState({});
  const [errores, setErrores] = useState({});

  // 'cargando' | 'ok' | 'error'
  const [estadoPantalla, setEstadoPantalla] = useState('cargando');
  const [mensajeError, setMensajeError] = useState('');
  const [intentoRecarga, setIntentoRecarga] = useState(0);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  useEffect(() => {
    let vigente = true;
    setEstadoPantalla('cargando');

    obtenerParametros()
      .then((datos) => {
        if (!vigente) return;
        setParametros(datos);
        setValores(aValoresDeFormulario(datos));
        setEstadoPantalla('ok');
      })
      .catch((error) => {
        if (!vigente) return;
        setMensajeError(
          error instanceof ErrorDeApi ? error.message : 'No se pudieron cargar los parámetros. Intentá de nuevo.',
        );
        setEstadoPantalla('error');
      });

    return () => {
      vigente = false;
    };
  }, [intentoRecarga]);

  const vigentePorClave = Object.fromEntries(parametros.map((parametro) => [parametro.clave, parametro]));

  // Cambios respecto de lo vigente, comparados como número: "1800" y
  // "1800.00" son el mismo valor y no cuentan como cambio.
  const cambios = PARAMETROS_COSTO.filter(
    ({ clave }) => vigentePorClave[clave] && Number(valores[clave]) !== vigentePorClave[clave].valor,
  );
  const hayCambios = cambios.length > 0;

  /** Actualiza un input y borra su error y el aviso de guardado anterior. */
  const alCambiar = (clave) => (evento) => {
    setValores((previos) => ({ ...previos, [clave]: evento.target.value }));
    setErrores((previos) => ({ ...previos, [clave]: '' }));
    setMensajeExito('');
  };

  /** Valida al salir del campo, para no esperar al "Guardar" para avisar. */
  const alSalirDelCampo = (clave) => () => {
    setErrores((previos) => ({ ...previos, [clave]: validarValor(valores[clave]) }));
  };

  /** Valida todo y, si está bien, abre la confirmación. */
  const alEnviar = (evento) => {
    evento.preventDefault();
    const nuevos = Object.fromEntries(PARAMETROS_COSTO.map(({ clave }) => [clave, validarValor(valores[clave])]));
    setErrores(nuevos);
    if (Object.values(nuevos).some(Boolean) || !hayCambios) return;
    setErrorGuardado('');
    setModalAbierto(true);
  };

  /** Vuelve los inputs a los valores vigentes. */
  const descartar = () => {
    setValores(aValoresDeFormulario(parametros));
    setErrores({});
  };

  const cerrarModal = useCallback(() => setModalAbierto(false), []);

  /**
   * Guarda los tres valores. Un 400 por campo cierra el modal y deja cada
   * error en su input; cualquier otro error se muestra dentro del modal.
   */
  const confirmarGuardado = async () => {
    setGuardando(true);
    setErrorGuardado('');
    try {
      const actualizados = await actualizarParametros(
        Object.fromEntries(PARAMETROS_COSTO.map(({ clave }) => [clave, Number(valores[clave])])),
      );
      setParametros(actualizados);
      setValores(aValoresDeFormulario(actualizados));
      setModalAbierto(false);
      setMensajeExito('Parámetros guardados. Se usan desde la próxima carga que se calcule.');
    } catch (error) {
      if (error instanceof ErrorDeValidacion) {
        setErrores(error.errores);
        setModalAbierto(false);
      } else {
        setErrorGuardado(
          error instanceof ErrorDeApi ? error.message : 'No se pudieron guardar los parámetros. Intentá de nuevo.',
        );
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <BarraSuperior />

      <main className="au-contenido">
        <h1 className="au-titulo">
          <IconoAjustes width={26} height={26} />
          Parámetros operativos
        </h1>

        <p className="pm-intro">
          Con estos valores se estiman el costo y la ganancia de cada viaje, a partir de sus kilómetros:
        </p>
        <ul className="pm-formula">
          <li>Costo = km × (costo por km + peaje por km)</li>
          <li>Ingreso = km × tarifa por km</li>
          <li>Ganancia = ingreso − costo</li>
        </ul>

        {estadoPantalla === 'cargando' && <p className="pm-mensaje">Cargando parámetros...</p>}

        {estadoPantalla === 'error' && (
          <div className="au-aviso au-aviso--error pm-error-carga" role="alert">
            <IconoAlerta width={22} height={22} />
            <span>{mensajeError}</span>
            <button
              type="button"
              className="ds-boton ds-boton--secundario"
              onClick={() => setIntentoRecarga((version) => version + 1)}
              onMouseDown={evitarFoco}
            >
              <IconoReintentar width={16} height={16} />
              Reintentar
            </button>
          </div>
        )}

        {estadoPantalla === 'ok' && (
          <form onSubmit={alEnviar} noValidate className="au-formulario">
            <div className="au-body">
              {mensajeExito && (
                <div className="au-aviso au-aviso--exito" role="status">
                  <IconoCheck />
                  {mensajeExito}
                </div>
              )}

              {PARAMETROS_COSTO.map(({ clave, etiqueta }) => {
                const vigente = vigentePorClave[clave];
                return (
                  <div className="pm-parametro" key={clave}>
                    <Campo
                      id={`pm-${clave}`}
                      etiqueta={`${etiqueta} ($)`}
                      error={errores[clave]}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={valores[clave] ?? ''}
                      onChange={alCambiar(clave)}
                      onBlur={alSalirDelCampo(clave)}
                      disabled={guardando}
                    />
                    {vigente && (
                      <p className="pm-ayuda">
                        {vigente.descripcion && <span>{vigente.descripcion}. </span>}
                        Última modificación: {formatearFechaHora(vigente.actualizado_en)}.
                      </p>
                    )}
                  </div>
                );
              })}

              <p className="pm-nota">
                Cambiar un valor no recalcula las cargas que ya tienen su estimación: cada una conserva la
                cuenta del momento en que se hizo.
              </p>
            </div>

            <div className="au-footer">
              <button
                type="button"
                className="ds-boton ds-boton--cancelar"
                onClick={descartar}
                onMouseDown={evitarFoco}
                disabled={!hayCambios || guardando}
              >
                Descartar cambios
              </button>
              <button
                type="submit"
                className="ds-boton ds-boton--confirmar"
                onMouseDown={evitarFoco}
                disabled={!hayCambios || guardando}
              >
                <IconoGuardar />
                Guardar
              </button>
            </div>
          </form>
        )}

        <ModalConfirmacion
          abierto={modalAbierto}
          titulo="¿Guardar los parámetros?"
          detalle="Los valores nuevos se usan desde la próxima carga que se calcule. Las cargas que ya tienen su estimación no cambian."
          error={errorGuardado}
          textoConfirmar="Guardar"
          textoVolver="Volver"
          variante="confirmar"
          aplicando={guardando}
          alConfirmar={confirmarGuardado}
          alCancelar={cerrarModal}
        >
          <ul className="pm-cambios">
            {cambios.map(({ clave, etiqueta }) => (
              <li key={clave}>
                {etiqueta}: {formatearPesos(vigentePorClave[clave].valor)} → <strong>{formatearPesos(valores[clave])}</strong>
              </li>
            ))}
          </ul>
        </ModalConfirmacion>
      </main>
    </>
  );
}
