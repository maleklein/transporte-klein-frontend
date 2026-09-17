import { useEffect, useId, useMemo, useRef, useState } from 'react';
import './ComboBox.css';

/**
 * Saca acentos y pasa a minúscula, para poder comparar lo que se escribe con
 * el nombre real de la localidad.
 *
 * Es la razón de ser de este componente: el `<select>` nativo también busca
 * por tecleo, pero compara el texto tal cual, así que "cordoba" no encuentra
 * "Córdoba" ni "parana" encuentra "Paraná". Con 642 localidades en Buenos
 * Aires, eso obliga a escribir los acentos bien o a bajar con la rueda.
 *
 * @param {string} texto
 * @returns {string} el texto en minúscula y sin marcas diacríticas.
 */
function paraComparar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Campo de selección con búsqueda: se escribe para filtrar y se elige de la
 * lista que aparece debajo.
 *
 * Implementa el patrón combobox de ARIA a mano, porque el proyecto no usa
 * ninguna librería de componentes. Lo que eso implica y que hay que mantener
 * si se toca:
 *
 * - El input lleva `role="combobox"` con `aria-expanded`, `aria-controls` y
 *   `aria-autocomplete="list"`.
 * - La opción resaltada se comunica con `aria-activedescendant`, no moviendo
 *   el foco: el foco se queda siempre en el input, que es lo que permite
 *   seguir escribiendo mientras se navega con las flechas.
 * - La lista existe siempre en el DOM y se oculta con `hidden`, para que
 *   `aria-controls` nunca apunte a un elemento que no está.
 * - La cantidad de resultados se anuncia por una región `aria-live`: quien no
 *   ve la pantalla necesita saber que al escribir quedaron tres opciones.
 *
 * @param {object} props
 * @param {string} props.id - id del input, para asociar label y mensaje de error.
 * @param {Array<{valor: string, etiqueta: string}>} props.opciones - las opciones elegibles.
 * @param {string} props.valor - `valor` de la opción elegida, o '' si no hay ninguna.
 * @param {function} props.alElegir - `(valor) => void`, se llama al elegir una opción o al limpiar.
 * @param {string} props.marcador - texto del placeholder cuando no hay nada elegido.
 * @param {string} [props.textoOpcionVacia] - si viene, agrega una opción al principio para limpiar la selección (ej: "Todas las provincias").
 * @param {boolean} [props.tieneError=false] - pinta el borde de error.
 * @param {string} [props.idError] - id del mensaje de error, para `aria-describedby`.
 * @param {function} [props.alSalir] - se llama al salir del campo, para marcarlo como tocado.
 * @param {import('react').Ref} [props.refInput] - ref al input, para poder enfocarlo desde afuera.
 * @returns {JSX.Element}
 */
export default function ComboBox({
  id,
  opciones,
  valor,
  alElegir,
  marcador,
  textoOpcionVacia,
  tieneError = false,
  idError,
  alSalir,
  refInput,
}) {
  const idInterno = useId();
  const idLista = `${id ?? idInterno}-lista`;

  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  // Índice de la opción resaltada dentro de `visibles`, o -1 si ninguna.
  const [resaltado, setResaltado] = useState(-1);

  const refRaiz = useRef(null);
  const refLista = useRef(null);

  // La opción vacía va como una opción más y no como un botón aparte: así se
  // navega con las mismas flechas y se anuncia igual que el resto.
  const todas = useMemo(
    () =>
      textoOpcionVacia
        ? [{ valor: '', etiqueta: textoOpcionVacia }, ...opciones]
        : opciones,
    [opciones, textoOpcionVacia],
  );

  const elegida = todas.find((opcion) => opcion.valor === valor && opcion.valor !== '') ?? null;

  // Mientras está abierto se muestra lo que se escribe; cerrado, la etiqueta
  // de lo elegido. Si no, al abrir habría que borrar a mano lo que hay.
  const textoInput = abierto ? busqueda : (elegida?.etiqueta ?? '');

  const visibles = useMemo(() => {
    const termino = paraComparar(busqueda.trim());
    if (!abierto || termino === '') return todas;
    // Coincidencia en cualquier parte del nombre, no sólo al principio:
    // "bariloche" tiene que encontrar "San Carlos de Bariloche".
    return todas.filter((opcion) => paraComparar(opcion.etiqueta).includes(termino));
  }, [todas, busqueda, abierto]);

  /**
   * Abre la lista dejando resaltada la opción que ya estaba elegida, para que
   * las flechas arranquen desde donde el usuario está parado. Si todavía no
   * hay nada elegido, resalta la primera: así se puede abrir con la flecha y
   * confirmar con Enter sin pasos de más.
   *
   * @returns {void}
   */
  const abrir = () => {
    if (abierto) return;
    setBusqueda('');
    setAbierto(true);
    const indice = todas.findIndex((opcion) => opcion.valor === valor);
    setResaltado(indice >= 0 ? indice : 0);
  };

  /**
   * Abre o cierra la lista. Va en el `mousedown` del input y no en su `focus`,
   * por dos motivos:
   *
   * - Al clickear el `<label>`, el navegador le pasa el foco al input. Si la
   *   lista se abriera con el foco, tocar el texto "Provincia de destino"
   *   desplegaría las 24 provincias, que no es lo que uno espera de una
   *   etiqueta. El `mousedown` ocurre sobre el label, no sobre el input, así
   *   que de esta forma el label sólo enfoca, como cualquier otro campo.
   * - Llegar con Tab tampoco despliega nada. Recorrer el formulario con el
   *   teclado abriría y cerraría listas de 642 opciones en cada paso.
   *
   * Para abrir sin mouse están la flecha abajo y escribir, que es el gesto
   * natural en un campo de búsqueda.
   *
   * @returns {void}
   */
  const alternar = () => {
    if (abierto) cerrar();
    else abrir();
  };

  /**
   * Cierra la lista sin cambiar lo elegido. El texto del input vuelve solo a
   * la etiqueta de la opción elegida, así no queda una búsqueda a medias
   * escrita en un campo que en realidad vale otra cosa.
   *
   * @returns {void}
   */
  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
    setResaltado(-1);
  };

  /**
   * @param {{valor: string}} opcion - la opción elegida.
   * @returns {void}
   */
  const elegir = (opcion) => {
    alElegir(opcion.valor);
    cerrar();
  };

  /**
   * Mueve el resaltado y lo deja siempre dentro de la lista.
   *
   * @param {number} paso - cuánto moverse; negativo va hacia arriba.
   * @returns {void}
   */
  const mover = (paso) => {
    if (visibles.length === 0) return;
    setResaltado((previo) => {
      const siguiente = previo + paso;
      if (siguiente < 0) return visibles.length - 1;
      if (siguiente >= visibles.length) return 0;
      return siguiente;
    });
  };

  /**
   * @param {import('react').KeyboardEvent} evento
   * @returns {void}
   */
  const alPresionarTecla = (evento) => {
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        if (!abierto) abrir();
        else mover(1);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        if (!abierto) abrir();
        else mover(-1);
        break;
      case 'Home':
        if (abierto) {
          evento.preventDefault();
          setResaltado(0);
        }
        break;
      case 'End':
        if (abierto) {
          evento.preventDefault();
          setResaltado(visibles.length - 1);
        }
        break;
      case 'Enter':
        // Sin esto, el Enter que elige una opción manda el formulario entero.
        if (abierto) {
          evento.preventDefault();
          if (resaltado >= 0 && visibles[resaltado]) elegir(visibles[resaltado]);
        }
        break;
      case 'Escape':
        if (abierto) {
          // No se deja propagar: si no, un diálogo o una pantalla de arriba
          // también se cerrarían con el mismo Escape.
          evento.stopPropagation();
          cerrar();
        }
        break;
      case 'Tab':
        // Tab sale del campo: se cierra sin elegir, como cualquier desplegable.
        if (abierto) cerrar();
        break;
      default:
        break;
    }
  };

  // Un clic afuera cierra la lista. Va en `mousedown` y no en `click` para que
  // se cierre apenas se aprieta, sin esperar a que se suelte el botón.
  useEffect(() => {
    if (!abierto) return undefined;

    const alApretarAfuera = (evento) => {
      if (!refRaiz.current?.contains(evento.target)) cerrar();
    };

    document.addEventListener('mousedown', alApretarAfuera);
    return () => document.removeEventListener('mousedown', alApretarAfuera);
  }, [abierto]);

  // Mantiene visible la opción resaltada al navegar con las flechas: con 642
  // localidades, el resaltado se va de pantalla enseguida.
  useEffect(() => {
    if (!abierto || resaltado < 0) return;
    const elemento = refLista.current?.children[resaltado];
    elemento?.scrollIntoView({ block: 'nearest' });
  }, [abierto, resaltado]);

  return (
    <div className="cb" ref={refRaiz}>
      <input
        id={id}
        ref={refInput}
        type="text"
        className={`ds-campo__input cb-input${tieneError ? ' ds-campo__input--error' : ''}`}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={
          abierto && resaltado >= 0 ? `${idLista}-opcion-${resaltado}` : undefined
        }
        aria-invalid={tieneError}
        aria-describedby={tieneError ? idError : undefined}
        // El autocompletado del navegador se superpondría con esta lista.
        autoComplete="off"
        placeholder={marcador}
        value={textoInput}
        onChange={(evento) => {
          if (!abierto) setAbierto(true);
          setBusqueda(evento.target.value);
          // Al cambiar el filtro, el resaltado anterior ya no significa nada.
          setResaltado(evento.target.value.trim() === '' ? -1 : 0);
        }}
        onMouseDown={alternar}
        onKeyDown={alPresionarTecla}
        onBlur={() => {
          cerrar();
          alSalir?.();
        }}
      />

      <span className="cb-flecha" aria-hidden="true" />

      <ul className="cb-lista" id={idLista} role="listbox" ref={refLista} hidden={!abierto}>
        {visibles.map((opcion, indice) => (
          <li
            key={opcion.valor || '(vacia)'}
            id={`${idLista}-opcion-${indice}`}
            role="option"
            aria-selected={opcion.valor === valor}
            className={`cb-opcion${indice === resaltado ? ' cb-opcion--resaltada' : ''}${
              opcion.valor === '' ? ' cb-opcion--vacia' : ''
            }`}
            // El clic en una opción sacaría el foco del input y dispararía su
            // onBlur, que cierra la lista antes de que llegue el click.
            onMouseDown={(evento) => evento.preventDefault()}
            onClick={() => elegir(opcion)}
            onMouseEnter={() => setResaltado(indice)}
          >
            {opcion.etiqueta}
          </li>
        ))}

        {visibles.length === 0 && (
          <li className="cb-sin-resultados">No hay resultados para "{busqueda.trim()}"</li>
        )}
      </ul>

      {/*
        Anuncia cuántas opciones quedaron al filtrar. Sin esto, quien usa lector
        de pantalla escribe y no se entera de si encontró algo.
      */}
      <span className="cb-anuncio" role="status" aria-live="polite">
        {abierto && busqueda.trim() !== ''
          ? `${visibles.length} ${visibles.length === 1 ? 'opción' : 'opciones'}`
          : ''}
      </span>
    </div>
  );
}
