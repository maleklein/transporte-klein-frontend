import IniciarSesion from './login'; // Importamos el archivo login.jsx
import { Routes, Route } from 'react-router-dom';
import RutaProtegida from './components/RutaProtegida';
import Usuarios from './pages/Usuarios';
import AltaUsuario from './pages/AltaUsuario';
import EditarUsuario from './pages/EditarUsuario';
import DetalleUsuario from './pages/DetalleUsuario';
import AltaCarga from './pages/AltaCarga';
import EditarCarga from './pages/EditarCarga';
import Cargas from './pages/Cargas';
import DetalleCarga from './pages/DetalleCarga';
import Notificaciones from './pages/Notificaciones';
import Metricas from './pages/Metricas';
import Postulaciones from './pages/Postulaciones';
import PanelAdministrador from './pages/PanelAdministrador';
import PanelCamionero from './pages/PanelCamionero';

/**
 * Enrutador raíz de la aplicación.
 *
 * Las pantallas con sesión quedan agrupadas por el rol que el backend exige
 * para sus endpoints (HU 15): cada grupo pasa por `RutaProtegida`, que manda
 * al login si no hay sesión y al panel de inicio del usuario si su rol no es
 * el que corresponde a esa pantalla.
 *
 * @returns {JSX.Element}
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<IniciarSesion />} />

      {/* Sólo administrador */}
      <Route element={<RutaProtegida roles={['administrador']} />}>
        {/* HU 15/16 — Panel de inicio del administrador */}
        <Route path="/panel-administrador" element={<PanelAdministrador />} />
        {/* HU 1.1 — Alta de usuarios */}
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/usuarios/nuevo" element={<AltaUsuario />} />
        {/* HU 1.2 — Modificación de usuario */}
        <Route path="/usuarios/editar" element={<EditarUsuario />} />
        {/* HU 1.3 — Consulta de usuarios */}
        <Route path="/usuarios/detalle" element={<DetalleUsuario />} />
        {/* HU 2.1 + 2.1.1 — Alta de cargas */}
        <Route path="/cargas/nueva" element={<AltaCarga />} />
        {/* HU 2.2 — Modificación de carga */}
        <Route path="/cargas/:id/editar" element={<EditarCarga />} />
        {/* HU 13 — Panel de métricas */}
        <Route path="/metricas" element={<Metricas />} />
      </Route>

      {/* Sólo camionero */}
      <Route element={<RutaProtegida roles={['camionero']} />}>
        {/* HU 15/17 — Panel de inicio del camionero */}
        <Route path="/panel-camionero" element={<PanelCamionero />} />
        {/* HU 4 y HU 6 — Mis viajes del camionero: asignados y postulaciones */}
        <Route path="/mis-viajes" element={<Postulaciones />} />
      </Route>

      {/* Cualquiera con sesión, administrador o camionero */}
      <Route element={<RutaProtegida />}>
        {/* HU 2.5 — Consulta de cargas */}
        <Route path="/cargas" element={<Cargas />} />
        <Route path="/cargas/:id" element={<DetalleCarga />} />
        {/* HU 12 — Centro de notificaciones */}
        <Route path="/notificaciones" element={<Notificaciones />} />
      </Route>
    </Routes>
  );
}

export default App;
