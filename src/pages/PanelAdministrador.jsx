import BarraSuperior from '../components/BarraSuperior';

/**
 * Panel de inicio del administrador (HU 15), en la ruta /panel-administrador.
 * A donde lo manda el login y el acceso "Inicio" de la barra.
 *
 * El contenido lo completa HU 16; esta pantalla sólo deja el lugar reservado
 * para que la navegación y el control de acceso de HU 15 tengan un destino
 * real que probar.
 *
 * @returns {JSX.Element}
 */
export default function PanelAdministrador() {
  return (
    <>
      <BarraSuperior />

      <main className="us-contenido">
        <div className="us-encabezado">
          <h1>Panel del administrador</h1>
        </div>

        <p>Panel en construcción.</p>
      </main>
    </>
  );
}
