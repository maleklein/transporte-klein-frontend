import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ContextoConexion } from './contextoConexion';
import PantallaSinConexion from './PantallaSinConexion';
import { servidorDisponible } from '../api/conexion';
import { esperaDeReconexion } from '../utils/conexion';

/**
 * Layout route que maneja la falta de conexión en todas las pantallas con
 * sesión. Hay dos casos:
 *
 * - **No se pudo abrir la pantalla** (`avisarSinConexion`, desde
 *   `useAvisoSinConexion`): la pantalla entera se reemplaza por
 *   `PantallaSinConexion`. Si el usuario toca otra sección de la barra, se
 *   intenta abrir esa.
 * - **Se cortó con la pantalla ya cargada** (`avisarConexionInestable`, desde
 *   la consulta periódica de notificaciones, o el navegador avisa que se quedó
 *   sin internet): la barra superior muestra una franja y la pantalla sigue
 *   como estaba.
 *
 * En los dos, se prueba solo si volvió (`GET /health`), cada vez más espaciado
 * (`esperaDeReconexion`), y enseguida si el navegador avisa que recuperó
 * internet. Cuando vuelve, la franja se va y la pantalla caída se abre de
 * nuevo, que es lo que hace que pida sus datos otra vez.
 *
 * @returns {JSX.Element}
 */
export default function ControlConexion() {
  const location = useLocation();

  // `key` de la navegación cuya pantalla no se pudo abrir, o null.
  const [caidaEn, setCaidaEn] = useState(null);
  const [conexionInestable, setConexionInestable] = useState(false);
  // Cuándo va a ser el próximo intento (timestamp), para la cuenta regresiva.
  const [proximoIntento, setProximoIntento] = useState(null);
  const [probando, setProbando] = useState(false);

  const claveActual = useRef(location.key);
  claveActual.current = location.key;

  // Al cambiar de pantalla se olvida la caída: la nueva prueba por su cuenta.
  useEffect(() => {
    setCaidaEn((anterior) => (anterior === location.key ? anterior : null));
  }, [location.key]);

  const pantallaCaida = caidaEn !== null && caidaEn === location.key;
  const sinConexion = pantallaCaida || conexionInestable;

  const avisarSinConexion = useCallback(() => setCaidaEn(claveActual.current), []);

  const avisarConexionInestable = useCallback(() => setConexionInestable(true), []);

  // El navegador avisa que se quedó sin internet.
  useEffect(() => {
    const alPerderInternet = () => setConexionInestable(true);
    window.addEventListener('offline', alPerderInternet);
    return () => window.removeEventListener('offline', alPerderInternet);
  }, []);

  // `probarAhora` del botón Reintentar; lo define el efecto de reconexión.
  const probarAhoraRef = useRef(() => {});

  // Reconexión automática, mientras falte la conexión.
  useEffect(() => {
    if (!sinConexion) return undefined;

    let cancelado = false;
    let temporizador = null;
    let intento = 0;

    const programar = () => {
      const espera = esperaDeReconexion(intento);
      setProximoIntento(Date.now() + espera);
      temporizador = setTimeout(() => probar({ automatico: true }), espera);
    };

    /**
     * Prueba si volvió. Solo los intentos automáticos alargan la espera
     * siguiente: tocar Reintentar (o que vuelva internet) no la agranda.
     */
    async function probar({ automatico = false } = {}) {
      clearTimeout(temporizador);
      setProbando(true);
      const volvio = await servidorDisponible();
      if (cancelado) return;
      setProbando(false);
      if (volvio) {
        setCaidaEn(null);
        setConexionInestable(false);
        return;
      }
      if (automatico) intento += 1;
      programar();
    }

    const probarAhora = () => probar();
    probarAhoraRef.current = probarAhora;
    programar();
    window.addEventListener('online', probarAhora);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      window.removeEventListener('online', probarAhora);
      probarAhoraRef.current = () => {};
      setProbando(false);
      setProximoIntento(null);
    };
  }, [sinConexion]);

  const valor = useMemo(
    () => ({ pantallaCaida, conexionInestable, avisarSinConexion, avisarConexionInestable }),
    [pantallaCaida, conexionInestable, avisarSinConexion, avisarConexionInestable],
  );

  return (
    <ContextoConexion.Provider value={valor}>
      {pantallaCaida ? (
        <PantallaSinConexion
          proximoIntento={proximoIntento}
          probando={probando}
          alReintentar={() => probarAhoraRef.current()}
        />
      ) : (
        <Outlet />
      )}
    </ContextoConexion.Provider>
  );
}
