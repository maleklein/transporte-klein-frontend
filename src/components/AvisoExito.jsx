import { IconoCerrar, IconoCheck } from './Iconos';

/**
 * Aviso verde de que algo salió bien ("Los datos de Ana Suárez se guardaron
 * correctamente."), arriba del contenido, con una × para cerrarlo.
 *
 * No se va solo: los usuarios del sistema tienen poca experiencia con
 * plataformas web, y un aviso que desaparece mientras miran otra cosa los deja
 * con la duda de si se guardó. Queda hasta que lo cierran o salen de la
 * pantalla. Es lo que hacen GOV.UK y Material para las confirmaciones que
 * tienen que poder leerse con calma (un "banner", no un "toast"). El único
 * aviso que se va solo es el del progreso de la carga, que ofrece "Deshacer".
 *
 * Al cerrarlo con el teclado, el foco pasa al título de la pantalla: si no,
 * quedaría en un botón que ya no existe.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children - el texto del aviso.
 * @param {function(): void} props.alCerrar - lo saca de pantalla.
 * @param {import('react').Ref<HTMLDivElement>} [props.ref] - si la pantalla le
 *   lleva el foco al aparecer (después de un modal, por ejemplo).
 * @returns {JSX.Element}
 */
export default function AvisoExito({ children, alCerrar, ref }) {
  const cerrar = (evento) => {
    const conTeclado = evento.detail === 0;
    const titulo = evento.currentTarget.closest('main')?.querySelector('h1');
    alCerrar();
    if (conTeclado && titulo) {
      if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1');
      titulo.focus({ preventScroll: true });
    }
  };

  return (
    <div
      className="ds-aviso ds-aviso--exito"
      role="status"
      ref={ref}
      tabIndex={ref ? -1 : undefined}
    >
      <IconoCheck width={20} height={20} />
      <span className="ds-aviso__texto">{children}</span>
      <button type="button" className="ds-aviso__cerrar" aria-label="Cerrar aviso" onClick={cerrar}>
        <IconoCerrar width={20} height={20} />
      </button>
    </div>
  );
}
