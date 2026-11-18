import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { IconoMasAcciones } from './Iconos';
import './MenuAcciones.css';

/** Separación entre el botón y el menú, y margen mínimo con el borde de la ventana. */
const SEPARACION = 6;

/**
 * Botón de tres puntos (⋮) que despliega las acciones de una fila (Ver ficha,
 * Editar), como en Gmail o Google Drive. Reemplaza a los botones sueltos de
 * cada fila, que ocupaban mucho ancho. No tiene texto visible: el lector de
 * pantalla lee `etiqueta`, y al pasar el mouse aparece "Acciones".
 *
 * Funciona como un menú de botón (patrón "menu button" de WAI-ARIA): al
 * abrirlo el foco va a la primera opción; las flechas recorren las opciones,
 * Inicio y Fin van a la primera y a la última, y Escape lo cierra y devuelve el
 * foco al botón. Tab, un click afuera, desplazar la página o cambiar el tamaño
 * de la ventana también lo cierran.
 *
 * El menú va con `position: fixed`, calculado desde el botón: la tabla está en
 * una caja con desplazamiento horizontal, y un menú absoluto quedaba recortado.
 * Abre hacia abajo, alineado a la derecha del botón; si abajo no entra, hacia
 * arriba.
 *
 * @param {object} props
 * @param {string} props.etiqueta - para lectores de pantalla ("Acciones para Ana Suárez").
 * @param {{ texto: string, Icono: function, alElegir: function }[]} props.opciones
 * @returns {JSX.Element}
 */
export default function MenuAcciones({ etiqueta, opciones }) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState(null);
  const refBoton = useRef(null);
  const refMenu = useRef(null);
  const refOpciones = useRef([]);
  const idMenu = useId();

  const cerrar = (devolverFoco = false) => {
    setAbierto(false);
    setPosicion(null);
    if (devolverFoco) refBoton.current?.focus();
  };

  // Ubica el menú antes de pintarlo, para que no aparezca en otro lado y salte.
  useLayoutEffect(() => {
    if (!abierto || !refBoton.current || !refMenu.current) return;
    const boton = refBoton.current.getBoundingClientRect();
    const menu = refMenu.current.getBoundingClientRect();
    const entraAbajo = boton.bottom + SEPARACION + menu.height <= window.innerHeight - SEPARACION;
    const top = entraAbajo ? boton.bottom + SEPARACION : Math.max(SEPARACION, boton.top - SEPARACION - menu.height);
    const left = Math.max(SEPARACION, Math.min(boton.right - menu.width, window.innerWidth - SEPARACION - menu.width));
    setPosicion({ top, left });
  }, [abierto]);

  // Ya ubicado, el foco pasa a la primera opción.
  useEffect(() => {
    if (abierto && posicion) refOpciones.current[0]?.focus({ preventScroll: true });
  }, [abierto, posicion]);

  // Click afuera, desplazamiento o cambio de tamaño: se cierra.
  useEffect(() => {
    if (!abierto) return undefined;
    const alTocarAfuera = (evento) => {
      if (!refMenu.current?.contains(evento.target) && !refBoton.current?.contains(evento.target)) cerrar();
    };
    // El evento de scroll puede venir del documento, que no es un elemento.
    const alDesplazar = (evento) => {
      if (!(evento.target instanceof Node) || !refMenu.current?.contains(evento.target)) cerrar();
    };
    const alCambiarTamano = () => cerrar();
    document.addEventListener('mousedown', alTocarAfuera);
    document.addEventListener('touchstart', alTocarAfuera, { passive: true });
    window.addEventListener('scroll', alDesplazar, true);
    window.addEventListener('resize', alCambiarTamano);
    return () => {
      document.removeEventListener('mousedown', alTocarAfuera);
      document.removeEventListener('touchstart', alTocarAfuera);
      window.removeEventListener('scroll', alDesplazar, true);
      window.removeEventListener('resize', alCambiarTamano);
    };
  }, [abierto]);

  /** Flechas, Inicio, Fin, Escape y Tab dentro del menú. */
  const alTeclearEnMenu = (evento) => {
    const items = refOpciones.current.filter(Boolean);
    const actual = items.indexOf(document.activeElement);
    const ir = (indice) => {
      evento.preventDefault();
      items[(indice + items.length) % items.length]?.focus({ preventScroll: true });
    };
    if (evento.key === 'ArrowDown') ir(actual + 1);
    else if (evento.key === 'ArrowUp') ir(actual - 1);
    else if (evento.key === 'Home') ir(0);
    else if (evento.key === 'End') ir(items.length - 1);
    else if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrar(true);
    } else if (evento.key === 'Tab') cerrar();
  };

  /** Flecha abajo o arriba sobre el botón cerrado también lo abre. */
  const alTeclearEnBoton = (evento) => {
    if (!abierto && (evento.key === 'ArrowDown' || evento.key === 'ArrowUp')) {
      evento.preventDefault();
      setAbierto(true);
    }
  };

  return (
    <>
      <button
        ref={refBoton}
        type="button"
        className="ma-boton"
        aria-label={etiqueta}
        title="Acciones"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        onKeyDown={alTeclearEnBoton}
      >
        <IconoMasAcciones width={22} height={22} />
      </button>

      {abierto && (
        <ul
          ref={refMenu}
          id={idMenu}
          className="ma-menu"
          role="menu"
          aria-label={etiqueta}
          onKeyDown={alTeclearEnMenu}
          style={posicion ? { top: posicion.top, left: posicion.left } : { visibility: 'hidden', top: 0, left: 0 }}
        >
          {opciones.map(({ texto, Icono, alElegir }, indice) => (
            <li key={texto} role="none">
              <button
                ref={(elemento) => {
                  refOpciones.current[indice] = elemento;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="ma-opcion"
                onClick={() => {
                  cerrar();
                  alElegir();
                }}
              >
                <Icono width={18} height={18} />
                {texto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
