import { useEffect, useId, useRef, useState } from 'react';
import { sugerirDirecciones } from '../api/direcciones';
import './ComboBox.css';

/** Espera entre la última tecla y el pedido a georef. */
const RETRASO_MS = 300;

/**
 * Input de dirección (calle y número) con sugerencias de georef.
 *
 * A diferencia de `ComboBox`, lo escrito vale tal cual: la lista sólo ayuda.
 * Si georef no tiene la calle (un camino rural, un campo) o no responde, no
 * aparece ninguna lista y se sigue escribiendo a mano.
 *
 * - Sin número escrito sugiere calles. Al elegir una, queda la calle con un
 *   espacio, lista para que se escriba la altura.
 * - Con número sugiere direcciones completas ("Av Pellegrini 1200").
 *
 * Accesibilidad: el mismo patrón de `ComboBox` (`role="combobox"`, opción
 * resaltada con `aria-activedescendant`, flechas, Enter y Escape).
 *
 * @param {object} props
 * @param {string} props.id - id del input.
 * @param {string} [props.idError] - id del mensaje de error.
 * @param {boolean} [props.tieneError]
 * @param {string} props.valor - texto actual.
 * @param {string} props.idLocalidad - localidad elegida; sin ella no se sugiere nada.
 * @param {function} props.alCambiar - `(texto) => void`.
 * @param {function} [props.alSalir] - al perder el foco.
 * @param {number} [props.maxLength]
 * @param {string} [props.marcador] - placeholder.
 * @returns {JSX.Element}
 */
export default function CampoDireccion({
  id,
  idError,
  tieneError = false,
  valor,
  idLocalidad,
  alCambiar,
  alSalir,
  maxLength,
  marcador,
}) {
  const idLista = `${useId()}-sugerencias`;
  const [sugerencias, setSugerencias] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(-1);
  // Sólo se busca después de que el usuario escribe: al abrir la edición con
  // una dirección ya cargada no tiene que aparecer una lista sola.
  const [escribio, setEscribio] = useState(false);
  const refInput = useRef(null);

  useEffect(() => {
    if (!escribio) return undefined;
    const controlador = new AbortController();
    const espera = setTimeout(() => {
      sugerirDirecciones(valor, idLocalidad, { signal: controlador.signal })
        .then((lista) => {
          // Si lo que sugiere es exactamente lo escrito, la lista no aporta nada.
          const utiles = lista.filter(
            (sugerencia) => sugerencia.texto.toLowerCase() !== valor.trim().toLowerCase(),
          );
          setSugerencias(utiles);
          setResaltado(-1);
          // georef puede contestar cuando el usuario ya pasó a otro campo:
          // ahí la lista no se abre, porque quedaría encima del campo siguiente.
          setAbierto(utiles.length > 0 && document.activeElement === refInput.current);
        })
        .catch(() => {});
    }, RETRASO_MS);
    return () => {
      clearTimeout(espera);
      controlador.abort();
    };
  }, [valor, idLocalidad, escribio]);

  // Al cambiar de localidad, las sugerencias de la anterior ya no sirven.
  useEffect(() => {
    setSugerencias([]);
    setAbierto(false);
  }, [idLocalidad]);

  const elegir = (sugerencia) => {
    alCambiar(sugerencia.esCalle ? `${sugerencia.texto} ` : sugerencia.texto);
    setAbierto(false);
    setSugerencias([]);
    refInput.current?.focus();
  };

  const alPresionarTecla = (evento) => {
    if (!abierto || sugerencias.length === 0) return;
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setResaltado((actual) => (actual + 1) % sugerencias.length);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setResaltado((actual) => (actual <= 0 ? sugerencias.length - 1 : actual - 1));
    } else if (evento.key === 'Enter' && resaltado >= 0) {
      // Sin opción resaltada, Enter hace lo de siempre (enviar el formulario).
      evento.preventDefault();
      elegir(sugerencias[resaltado]);
    } else if (evento.key === 'Escape') {
      evento.preventDefault();
      setAbierto(false);
    }
  };

  return (
    <div className="cb">
      <input
        id={id}
        ref={refInput}
        type="text"
        className={`ds-campo__input${tieneError ? ' ds-campo__input--error' : ''}`}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={abierto && resaltado >= 0 ? `${idLista}-${resaltado}` : undefined}
        aria-invalid={tieneError}
        aria-describedby={tieneError ? idError : undefined}
        autoComplete="off"
        maxLength={maxLength}
        placeholder={marcador}
        value={valor}
        onChange={(evento) => {
          setEscribio(true);
          alCambiar(evento.target.value);
        }}
        onKeyDown={alPresionarTecla}
        onBlur={() => {
          setAbierto(false);
          alSalir?.();
        }}
      />

      <ul className="cb-lista" id={idLista} role="listbox" hidden={!abierto}>
        {sugerencias.map((sugerencia, indice) => (
          <li
            key={sugerencia.texto}
            id={`${idLista}-${indice}`}
            role="option"
            aria-selected={indice === resaltado}
            className={`cb-opcion${indice === resaltado ? ' cb-opcion--resaltada' : ''}`}
            // Sin esto, el clic saca el foco del input y la lista se cierra antes del click.
            onMouseDown={(evento) => evento.preventDefault()}
            onClick={() => elegir(sugerencia)}
            onMouseEnter={() => setResaltado(indice)}
          >
            {sugerencia.texto}
          </li>
        ))}
      </ul>

      <span className="cb-anuncio" role="status" aria-live="polite">
        {abierto ? `${sugerencias.length} sugerencias` : ''}
      </span>
    </div>
  );
}
