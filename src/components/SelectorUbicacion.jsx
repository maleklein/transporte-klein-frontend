import { useEffect, useMemo, useState } from 'react';
import Campo from './Campo';
import ComboBox from './ComboBox';
import { listarLocalidades, listarProvincias } from '../api/geografia';
import './SelectorUbicacion.css';

/**
 * Par de selectores dependientes para elegir una ubicación: primero la
 * provincia, después la localidad de esa provincia.
 *
 * Reemplaza al input de texto libre que había antes en origen y destino. El
 * valor que viaja al backend es el id de localidad del catálogo, así que no hay
 * dos formas de escribir el mismo lugar.
 *
 * Trabaja sobre dos campos del formulario, `<nombre>_provincia` y `<nombre>_id`.
 * El segundo es el que se manda; el primero existe sólo para encadenar los
 * selectores y por eso el backend nunca devuelve errores para él.
 *
 * Los dos campos son `ComboBox`: se escribe para filtrar y se elige de la
 * lista. Empezaron siendo `<select>` nativos, pero con 642 localidades en
 * Buenos Aires la búsqueda por tecleo del navegador no alcanza, sobre todo
 * porque compara el texto tal cual: "cordoba" no encuentra "Córdoba". El
 * `ComboBox` ignora acentos y mayúsculas y busca en cualquier parte del
 * nombre, así que "bariloche" encuentra "San Carlos de Bariloche".
 *
 * @param {object} props
 * @param {string} props.prefijo - prefijo de los ids del formulario ('nc' en el alta, 'ec' en la edición).
 * @param {string} props.nombre - 'origen' o 'destino'; de acá salen los nombres de los dos campos.
 * @param {string} props.etiqueta - cómo se llama la ubicación en pantalla ('Origen').
 * @param {object} props.valores - valores actuales del formulario completo.
 * @param {function} props.errorDe - `(campo) => mensaje|undefined`, la misma que usa la página.
 * @param {function} props.alCambiarCampos - `(cambios) => void`, aplica varios campos de una.
 * @param {function} [props.alSalirDelCampo] - `(campo) => () => void`, marca el campo como tocado.
 * @param {import('react').Ref} [props.refProvincia] - ref al select de provincia, para enfocarlo.
 * @returns {JSX.Element}
 */
export default function SelectorUbicacion({
  prefijo,
  nombre,
  etiqueta,
  valores,
  errorDe,
  alCambiarCampos,
  alSalirDelCampo,
  refProvincia,
}) {
  const campoProvincia = `${nombre}_provincia`;
  const campoLocalidad = `${nombre}_id`;
  const idProvinciaElegida = valores[campoProvincia];

  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  // 'cargando' | 'ok' | 'error'
  const [estadoProvincias, setEstadoProvincias] = useState('cargando');
  const [estadoLocalidades, setEstadoLocalidades] = useState('ok');

  // Las provincias no cambian nunca: se piden una sola vez y el módulo de API
  // las cachea, así que montar origen y destino juntos dispara un solo pedido.
  useEffect(() => {
    let vigente = true;

    setEstadoProvincias('cargando');

    listarProvincias()
      .then((datos) => {
        if (!vigente) return;
        setProvincias(datos);
        setEstadoProvincias('ok');
      })
      .catch(() => {
        if (vigente) setEstadoProvincias('error');
      });

    return () => {
      vigente = false;
    };
  }, []);

  // Localidades de la provincia elegida. Se vuelve a pedir en cada cambio, pero
  // la capa de API cachea por provincia: ir y volver entre dos no pega de nuevo.
  useEffect(() => {
    if (!idProvinciaElegida) {
      setLocalidades([]);
      setEstadoLocalidades('ok');
      return undefined;
    }

    let vigente = true;
    // Se vacía antes de pedir: mientras llegaba la respuesta, la lista seguía
    // mostrando las localidades de la provincia anterior. Como el campo no se
    // deshabilita, se podía elegir una de ellas y guardar una carga con una
    // localidad que no pertenece a la provincia que se ve en pantalla. El
    // backend no lo detecta, porque sólo recibe el id de la localidad.
    setLocalidades([]);
    setEstadoLocalidades('cargando');

    listarLocalidades(idProvinciaElegida)
      .then((datos) => {
        if (!vigente) return;
        setLocalidades(datos);
        setEstadoLocalidades('ok');
      })
      .catch(() => {
        if (!vigente) return;
        setEstadoLocalidades('error');
      });

    return () => {
      // Si se cambió de provincia antes de que llegara la respuesta, la vieja
      // se descarta: si no, podría pisar a la nueva y mostrar localidades que
      // no son de la provincia elegida.
      vigente = false;
    };
  }, [idProvinciaElegida]);

  /**
   * Nombres que aparecen más de una vez en la provincia actual. Hay 68 casos
   * en todo el país; sin esto el selector mostraría dos opciones idénticas y no
   * habría forma de saber cuál es cuál.
   */
  const nombresRepetidos = useMemo(() => {
    const cuenta = new Map();
    for (const localidad of localidades) {
      cuenta.set(localidad.nombre, (cuenta.get(localidad.nombre) ?? 0) + 1);
    }
    return new Set(
      [...cuenta.entries()].filter(([, veces]) => veces > 1).map(([nombreLocalidad]) => nombreLocalidad),
    );
  }, [localidades]);

  /**
   * Texto de una opción de localidad. Sólo se agrega el departamento cuando
   * hace falta para distinguirla: ponérselo a todas sería ruido.
   *
   * @param {{nombre: string, departamento: string|null}} localidad
   * @returns {string}
   */
  const textoLocalidad = (localidad) =>
    nombresRepetidos.has(localidad.nombre) && localidad.departamento
      ? `${localidad.nombre} (Dpto. ${localidad.departamento})`
      : localidad.nombre;

  /**
   * Texto que muestra el campo de provincia cuando no hay nada elegido.
   *
   * Si el catálogo no cargó, se dice acá adentro y no en un cartel aparte: el
   * problema es de este campo, y un cartel se dibujaba dos veces (una por
   * origen y otra por destino) repitiendo el mensaje genérico de la capa de
   * API, que habla de encender el servidor y no le sirve a quien carga cargas.
   *
   * No hay botón de reintentar: si el catálogo no carga es porque el backend
   * no está, y en ese caso tampoco cargó la pantalla. Recargar la página lo
   * resuelve, y no hace falta maquinaria aparte para eso.
   *
   * @returns {string}
   */
  const textoMarcadorProvincia = () => {
    if (estadoProvincias === 'cargando') return 'Cargando provincias...';
    if (estadoProvincias === 'error') return 'No se pudieron cargar las provincias';
    return 'Buscá o elegí la provincia';
  };

  /**
   * Texto que muestra el campo de localidad cuando todavía no hay nada
   * elegido. Cambia según el estado porque es lo que le explica al usuario por
   * qué la lista está vacía.
   *
   * El campo NO se deshabilita mientras no haya provincia: un control
   * deshabilitado no recibe foco, y la pantalla enfoca el primer campo con
   * error al intentar enviar. Si estuviera deshabilitado, el foco caería al
   * vacío y no se entendería por qué el formulario no avanza.
   *
   * @returns {string}
   */
  const textoMarcadorLocalidad = () => {
    if (!idProvinciaElegida) return `Elegí primero la provincia de ${etiqueta.toLowerCase()}`;
    if (estadoLocalidades === 'cargando') return 'Cargando localidades...';
    if (estadoLocalidades === 'error') return 'No se pudieron cargar las localidades';
    return 'Buscá o elegí la localidad';
  };

  /**
   * Al cambiar de provincia se borra la localidad elegida: un id de otra
   * provincia sería inválido y el backend lo rechazaría.
   *
   * Sólo se borra si la provincia cambió de verdad. Al abrir la lista queda
   * resaltada la que ya estaba elegida, así que confirmarla con Enter es el
   * gesto de "no quería cambiar nada" — y borraba la localidad, que en la
   * edición venía precargada.
   *
   * @param {string} nuevaProvincia - id de la provincia elegida.
   * @returns {void}
   */
  const alElegirProvincia = (nuevaProvincia) => {
    if (nuevaProvincia === idProvinciaElegida) return;

    alCambiarCampos({
      [campoProvincia]: nuevaProvincia,
      [campoLocalidad]: '',
    });
  };

  return (
    <fieldset className="su-grupo">
      <legend className="su-titulo">{etiqueta}</legend>

      <div className="ds-fila-2">
        {/*
          Las etiquetas dicen "Provincia de origen" y no sólo "Provincia":
          un lector de pantalla las lee sin el contexto visual del recuadro, y
          cuatro campos llamados "Provincia" en la misma pantalla serían
          indistinguibles.
        */}
        <Campo
          id={`${prefijo}-${campoProvincia}`}
          etiqueta={`Provincia de ${etiqueta.toLowerCase()}`}
          error={errorDe(campoProvincia)}
        >
          {({ id, idError, tieneError }) => (
            <ComboBox
              id={id}
              idError={idError}
              tieneError={tieneError}
              refInput={refProvincia}
              opciones={provincias.map((provincia) => ({
                valor: provincia.id,
                etiqueta: provincia.nombre,
              }))}
              valor={valores[campoProvincia]}
              alElegir={alElegirProvincia}
              marcador={textoMarcadorProvincia()}
              alSalir={alSalirDelCampo?.(campoProvincia)}
            />
          )}
        </Campo>

        <Campo
          id={`${prefijo}-${campoLocalidad}`}
          etiqueta={`Localidad de ${etiqueta.toLowerCase()}`}
          error={errorDe(campoLocalidad)}
        >
          {({ id, idError, tieneError }) => (
            <ComboBox
              id={id}
              idError={idError}
              tieneError={tieneError}
              opciones={localidades.map((localidad) => ({
                valor: localidad.id,
                etiqueta: textoLocalidad(localidad),
              }))}
              valor={valores[campoLocalidad]}
              alElegir={(nuevoValor) => alCambiarCampos({ [campoLocalidad]: nuevoValor })}
              marcador={textoMarcadorLocalidad()}
              alSalir={alSalirDelCampo?.(campoLocalidad)}
            />
          )}
        </Campo>
      </div>
    </fieldset>
  );
}
