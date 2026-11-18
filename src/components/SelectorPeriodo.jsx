import { useEffect, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import {
  PERIODOS_CREACION,
  fechaATexto,
  formatearFecha,
  nombrePeriodoCreacion,
  rangoDePeriodo,
  textoAFecha,
} from '../utils/carga';
import BotonQuitarFiltro from './BotonQuitarFiltro';
import './Calendario.css';
import './SelectorPeriodo.css';

/**
 * Campo para elegir un período (desde–hasta) en un solo calendario. Lo usan el
 * filtro "Creada" de Gestión de Cargas y el "Período" de Métricas, que cuentan
 * lo mismo: las cargas creadas en esas fechas.
 *
 * Se ve como los otros desplegables. Al tocarlo se abre un panel con accesos
 * rápidos (últimos 7 o 30 días, este mes) y un calendario donde se marca el
 * primer y el último día. Los accesos se aplican con un toque; el rango del
 * calendario, con "Aplicar". El campo muestra el nombre del acceso o el rango
 * elegido ("01/11/2026 – 15/11/2026").
 *
 * Se puede quedar sin período: el primer acceso es para eso ("Cualquier
 * fecha" en Cargas, "Todos los tiempos" en Métricas). Con un período elegido,
 * el campo se marca como filtro aplicado y lleva una × que lo quita.
 *
 * Una carga no puede crearse en el futuro: los días después de hoy no se
 * pueden elegir.
 *
 * @param {object} props
 * @param {string} props.id - id del campo (para la etiqueta).
 * @param {string} props.etiqueta - el nombre que se ve arriba del campo ("Creada", "Período").
 * @param {string} [props.textoVacio='Cualquier fecha'] - lo que muestra sin período, en el campo y en su acceso.
 * @param {string} [props.className] - clase de maquetación del contenedor, la de los otros filtros de la pantalla.
 * @param {string} props.desde - AAAA-MM-DD, o '' sin límite.
 * @param {string} props.hasta - AAAA-MM-DD, o '' sin límite.
 * @param {function({desde: string, hasta: string}): void} props.alCambiar - recibe el período nuevo ('' y '' sin período).
 * @returns {JSX.Element}
 */
export default function SelectorPeriodo({
  id,
  etiqueta,
  desde,
  hasta,
  alCambiar,
  textoVacio = 'Cualquier fecha',
  className = '',
}) {
  const idEtiqueta = useId();
  const idPanel = useId();
  const [abierto, setAbierto] = useState(false);
  // Rango que se está marcando en el calendario, todavía sin aplicar.
  const [borrador, setBorrador] = useState(undefined);
  const refContenedor = useRef(null);
  const refBoton = useRef(null);
  const refPanel = useRef(null);

  const hoy = new Date();
  const nombre = nombrePeriodoCreacion(desde, hasta, hoy);

  const abrir = () => {
    const inicio = textoAFecha(desde);
    setBorrador(inicio ? { from: inicio, to: textoAFecha(hasta) ?? inicio } : undefined);
    setAbierto(true);
  };

  /** Cierra el panel y devuelve el foco al campo, para seguir con el teclado. */
  const cerrar = () => {
    setAbierto(false);
    refBoton.current?.focus();
  };

  const elegir = (periodo) => {
    alCambiar(periodo);
    cerrar();
  };

  const aplicarRango = () => {
    if (!borrador?.from) return;
    elegir({ desde: fechaATexto(borrador.from), hasta: fechaATexto(borrador.to ?? borrador.from) });
  };

  // Cierra al tocar afuera y con Escape. Al abrir, el foco va al panel.
  useEffect(() => {
    if (!abierto) return undefined;
    (refPanel.current?.querySelector('.sp-acceso--elegido') ?? refPanel.current?.querySelector('button'))?.focus();

    const alTocarAfuera = (evento) => {
      if (!refContenedor.current?.contains(evento.target)) setAbierto(false);
    };
    const alTeclear = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        setAbierto(false);
        refBoton.current?.focus();
      }
    };
    document.addEventListener('mousedown', alTocarAfuera);
    document.addEventListener('touchstart', alTocarAfuera, { passive: true });
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alTocarAfuera);
      document.removeEventListener('touchstart', alTocarAfuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  const textoBorrador = !borrador?.from
    ? 'Tocá el primer día del período.'
    : !borrador.to || borrador.to.getTime() === borrador.from.getTime()
      ? `Desde el ${formatearFecha(fechaATexto(borrador.from))}: tocá el último día.`
      : `Del ${formatearFecha(fechaATexto(borrador.from))} al ${formatearFecha(fechaATexto(borrador.to))}`;

  return (
    <div className={`sp${className ? ` ${className}` : ''}`} ref={refContenedor}>
      <span className="ds-campo__label" id={idEtiqueta}>
        {etiqueta}
      </span>
      <div className="ds-filtro-control">
        <button
          type="button"
          id={id}
          ref={refBoton}
          className={`ds-campo__input ds-campo__input--desplegable sp-campo${
            nombre ? ' ds-campo__input--activo' : ' sp-campo--vacio'
          }`}
          aria-labelledby={`${idEtiqueta} ${id}`}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          aria-controls={abierto ? idPanel : undefined}
          onClick={() => (abierto ? cerrar() : abrir())}
        >
          {nombre || textoVacio}
        </button>

        {nombre && (
          <BotonQuitarFiltro
            etiqueta={etiqueta}
            alQuitar={() => {
              setAbierto(false);
              alCambiar({ desde: '', hasta: '' });
              refBoton.current?.focus();
            }}
          />
        )}
      </div>

      {abierto && (
        <div className="sp-panel" id={idPanel} ref={refPanel} role="dialog" aria-label={etiqueta}>
          <ul className="sp-accesos">
            <li>
              <button
                type="button"
                className={`sp-acceso${nombre ? '' : ' sp-acceso--elegido'}`}
                aria-pressed={!nombre}
                onClick={() => elegir({ desde: '', hasta: '' })}
              >
                {textoVacio}
              </button>
            </li>
            {PERIODOS_CREACION.map((periodo) => (
              <li key={periodo.id}>
                <button
                  type="button"
                  className={`sp-acceso${nombre === periodo.texto ? ' sp-acceso--elegido' : ''}`}
                  aria-pressed={nombre === periodo.texto}
                  onClick={() => elegir(rangoDePeriodo(periodo.id, hoy))}
                >
                  {periodo.texto}
                </button>
              </li>
            ))}
          </ul>

          <div className="sp-calendario calendario">
            <DayPicker
              mode="range"
              locale={es}
              weekStartsOn={1}
              selected={borrador}
              // Con un rango ya completo, el próximo toque empieza uno nuevo
              // desde ese día (el calendario, por defecto, estiraba el que había).
              onSelect={(rango, dia) =>
                setBorrador((previo) => (previo?.from && previo?.to ? { from: dia, to: undefined } : rango))
              }
              disabled={{ after: hoy }}
              endMonth={hoy}
              defaultMonth={borrador?.from ?? hoy}
            />
            <p className="sp-resumen" aria-live="polite">
              {textoBorrador}
            </p>
            <div className="sp-acciones">
              <button type="button" className="ds-boton ds-boton--cancelar sp-boton" onClick={cerrar}>
                Cancelar
              </button>
              <button
                type="button"
                className="ds-boton ds-boton--primario sp-boton"
                onClick={aplicarRango}
                disabled={!borrador?.from}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
