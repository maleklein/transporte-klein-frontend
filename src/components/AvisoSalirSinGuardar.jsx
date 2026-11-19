import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import ModalConfirmacion from './ModalConfirmacion';

/**
 * Avisa antes de salir de un formulario con cambios sin guardar.
 *
 * Frena toda navegación dentro del sistema mientras `hayCambios` sea true:
 * Cancelar, la flecha ‹ de la barra, las migas, el menú y el "atrás" del
 * navegador. En su lugar abre un modal: "Seguir editando" se queda y "Salir
 * sin guardar" sigue a donde iba. Al recargar o cerrar la pestaña, el que
 * pregunta es el navegador, con su propio cartel (no se puede cambiar el
 * texto).
 *
 * Después de guardar bien, quien llama tiene que avisar con `permitirSalida()`
 * antes de navegar: si no, el modal saltaría al irse con lo recién guardado.
 *
 * Necesita el router de datos (`createBrowserRouter`, en main.jsx): con
 * `BrowserRouter` solo, `useBlocker` no funciona.
 *
 * @param {boolean} hayCambios - si lo escrito difiere de lo que había al entrar.
 * @returns {{ permitirSalida: function(): void, modal: JSX.Element }} `modal` va en el JSX del formulario.
 */
export function useAvisoSalirSinGuardar(hayCambios) {
  const salidaPermitida = useRef(false);

  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hayCambios && !salidaPermitida.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // Recargar o cerrar la pestaña: el navegador muestra su propio aviso.
  useEffect(() => {
    if (!hayCambios) return undefined;
    const alSalirDeLaPagina = (evento) => {
      if (salidaPermitida.current) return;
      evento.preventDefault();
      // Chrome viejo y Safari lo piden para mostrar el aviso.
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', alSalirDeLaPagina);
    return () => window.removeEventListener('beforeunload', alSalirDeLaPagina);
  }, [hayCambios]);

  const modal = (
    <ModalConfirmacion
      abierto={bloqueo.state === 'blocked'}
      titulo="¿Salir sin guardar?"
      detalle="Hiciste cambios en este formulario que todavía no se guardaron. Si salís ahora, se pierden."
      textoConfirmar="Salir sin guardar"
      textoVolver="Seguir editando"
      variante="peligro"
      alConfirmar={() => bloqueo.proceed?.()}
      alCancelar={() => bloqueo.reset?.()}
    />
  );

  return {
    permitirSalida: () => {
      salidaPermitida.current = true;
    },
    modal,
  };
}

