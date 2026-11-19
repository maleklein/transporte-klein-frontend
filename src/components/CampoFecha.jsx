import { useEffect, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { fechaATexto, formatearFecha, textoAFecha } from '../utils/carga';
import BotonQuitarFiltro from './BotonQuitarFiltro';
import './Calendario.css';
import './CampoFecha.css';

/**
 * Campo para elegir un día con el calendario del sistema (react-day-picker).
 *
 * Reemplaza al `<input type="date">`: el calendario nativo era distinto en
 * cada navegador (en el iPhone, una rueda; en la computadora, uno chiquito en
 * inglés según el sistema) y no se le podía dar el estilo del sistema. Este es
 * el mismo calendario del filtro "Creada", en todos lados.
 *
 * El campo es un botón con la forma de los demás y un calendario a la
 * derecha. Al tocarlo se abre el calendario debajo; al tocar un día se elige y
 * se cierra. Se cierra sin cambiar nada con Escape o tocando afuera. Con el
 * teclado: las flechas recorren los días y Enter elige.
 *
 * Los valores entran y salen como texto AAAA-MM-DD, igual que con el input
 * nativo, así que las validaciones y la API no cambian.
 *
 * @param {object} props
 * @param {string} props.id - id del campo, para el `<label htmlFor>`.
 * @param {string} props.etiqueta - nombre del campo; el lector de pantalla lo lee junto con la fecha elegida.
 * @param {string} props.valor - AAAA-MM-DD, o '' sin fecha.
 * @param {function(string): void} props.alCambiar - recibe el día elegido (AAAA-MM-DD), o '' al quitarlo.
 * @param {function(): void} [props.alSalir] - al cerrar el calendario, para marcar el campo como tocado.
 * @param {string} [props.min] - AAAA-MM-DD: los días anteriores no se pueden elegir.
 * @param {string} [props.max] - AAAA-MM-DD: los días posteriores no se pueden elegir.
 * @param {string} [props.marcador='Elegí una fecha'] - lo que muestra el campo sin fecha.
 * @param {boolean} [props.tieneError=false] - pinta el borde de error.
 * @param {string} [props.idError] - id del mensaje de error, para `aria-describedby`.
 * @param {boolean} [props.esFiltro=false] - es un filtro de un listado: con una
 *   fecha elegida se marca como aplicado y lleva una × para quitarla.
 * @param {boolean} [props.abrirAlEntrar=false] - al mostrarse, baja suave hasta
 *   el campo y abre el calendario (con el foco en el día elegido o en hoy).
 *   Lo usa "Cambiar la fecha de retiro" del detalle de una carga vencida.
 * @param {boolean} [props.quitable=false] - campo opcional de un formulario:
 *   con una fecha elegida lleva una × para sacarla (sin marcarse como filtro).
 * @returns {JSX.Element}
 */
export default function CampoFecha({
  id,
  etiqueta,
  valor,
  alCambiar,
  alSalir,
  min,
  max,
  marcador = 'Elegí una fecha',
  tieneError = false,
  idError,
  esFiltro = false,
  quitable = false,
  abrirAlEntrar = false,
}) {
  const idPanel = useId();
  const [abierto, setAbierto] = useState(false);
  const refContenedor = useRef(null);

  // `abrirAlEntrar`: la pantalla baja suave hasta el campo y, al llegar, se
  // abre el calendario. En ese orden porque el calendario pone el foco en un
  // día, y el navegador saltaría hasta ahí cortando la animación. Con "reducir
  // movimiento" activado en el dispositivo, baja sin animación.
  useEffect(() => {
    if (!abrirAlEntrar || !refContenedor.current) return undefined;
    const sinAnimacion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let abrio = false;
    const abrir = () => {
      if (abrio) return;
      abrio = true;
      setAbierto(true);
    };
    // Si el campo ya está a la vista, no hay nada que bajar: se abre enseguida.
    const { top, bottom } = refContenedor.current.getBoundingClientRect();
    if (top >= 0 && bottom <= window.innerHeight) {
      abrir();
      return undefined;
    }
    refContenedor.current.scrollIntoView({ behavior: sinAnimacion ? 'auto' : 'smooth', block: 'center' });
    // `scrollend` avisa cuando termina de bajar; el temporizador cubre a los
    // navegadores que no lo tienen y al caso en que no hacía falta bajar.
    window.addEventListener('scrollend', abrir, { once: true });
    const temporizador = setTimeout(abrir, sinAnimacion ? 0 : 700);
    return () => {
      window.removeEventListener('scrollend', abrir);
      clearTimeout(temporizador);
    };
  }, [abrirAlEntrar]);
  const refBoton = useRef(null);
  // `alSalir` cambia en cada render de la página; el efecto de abajo lo lee de
  // acá para no tener que volver a suscribirse por eso.
  const refAlSalir = useRef(alSalir);
  refAlSalir.current = alSalir;

  const elegida = textoAFecha(valor);
  const desde = textoAFecha(min);
  const hasta = textoAFecha(max);
  const filtroAplicado = esFiltro && Boolean(elegida);
  const conQuitar = filtroAplicado || (quitable && Boolean(elegida));
  const texto = elegida ? formatearFecha(valor) : marcador;

  /** Cierra el calendario; con `enfocar`, devuelve el foco al campo. */
  const cerrar = (enfocar = true) => {
    setAbierto(false);
    if (enfocar) refBoton.current?.focus();
    refAlSalir.current?.();
  };

  /** @param {Date|undefined} dia */
  const elegir = (dia) => {
    // Tocar el día que ya estaba elegido lo deselecciona en react-day-picker:
    // acá eso no quiere decir "sin fecha", sino que se queda el mismo.
    if (dia) alCambiar(fechaATexto(dia));
    cerrar();
  };

  // Cierra al tocar afuera (sin mover el foco: el usuario ya está en otro
  // lado) y con Escape.
  useEffect(() => {
    if (!abierto) return undefined;

    const alTocarAfuera = (evento) => {
      if (!refContenedor.current?.contains(evento.target)) {
        setAbierto(false);
        refAlSalir.current?.();
      }
    };
    const alTeclear = (evento) => {
      if (evento.key === 'Escape') {
        // Que no cierre también un diálogo o pantalla de arriba.
        evento.preventDefault();
        evento.stopPropagation();
        setAbierto(false);
        refBoton.current?.focus();
        refAlSalir.current?.();
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

  const deshabilitados = [];
  if (desde) deshabilitados.push({ before: desde });
  if (hasta) deshabilitados.push({ after: hasta });

  return (
    <div className="cf ds-filtro-control" ref={refContenedor}>
      <button
        type="button"
        id={id}
        ref={refBoton}
        className={`ds-campo__input ds-campo__input--fecha cf-campo${elegida ? '' : ' cf-campo--vacio'}${
          tieneError ? ' ds-campo__input--error' : ''
        }${filtroAplicado ? ' ds-campo__input--activo' : ''}${conQuitar && !filtroAplicado ? ' cf-campo--quitable' : ''}`}
        aria-label={`${etiqueta}: ${texto}`}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        aria-invalid={tieneError}
        aria-describedby={tieneError ? idError : undefined}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
      >
        {texto}
      </button>

      {conQuitar && (
        <BotonQuitarFiltro
          etiqueta={etiqueta}
          textoLector={filtroAplicado ? undefined : `Quitar ${etiqueta.toLowerCase()}`}
          alQuitar={() => {
            setAbierto(false);
            alCambiar('');
            refBoton.current?.focus();
          }}
        />
      )}

      {abierto && (
        <div className="cf-panel calendario" id={idPanel} role="dialog" aria-label={etiqueta}>
          <DayPicker
            mode="single"
            locale={es}
            weekStartsOn={1}
            selected={elegida}
            onSelect={elegir}
            // Abre en el mes del día elegido y le pasa el foco (o a hoy, si no
            // hay ninguno), para seguir con las flechas.
            autoFocus
            // Si el día elegido ya no se puede elegir (una fecha vencida),
            // abre en el primer mes que sí.
            defaultMonth={
              elegida && (!desde || elegida >= desde)
                ? elegida
                : desde && desde > new Date()
                  ? desde
                  : undefined
            }
            disabled={deshabilitados.length > 0 ? deshabilitados : undefined}
            startMonth={desde}
            endMonth={hasta}
          />
        </div>
      )}
    </div>
  );
}
