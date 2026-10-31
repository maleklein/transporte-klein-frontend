import BarraSuperior from '../components/BarraSuperior';

/**
 * Panel de inicio del camionero (HU 15), en la ruta /panel-camionero.
 * A donde lo manda el login y el acceso "Inicio" de la barra.
 *
 * El contenido lo completa HU 17; esta pantalla sólo deja el lugar reservado
 * para que la navegación y el control de acceso de HU 15 tengan un destino
 * real que probar.
 *
 * @returns {JSX.Element}
 */
export default function PanelCamionero() {
  return (
    <>
      <BarraSuperior />

      <main className="us-contenido">
        <div className="us-encabezado">
          <h1>Panel del camionero</h1>
        </div>

        <p>Panel en construcción.</p>
      </main>
    </>
  );
}
