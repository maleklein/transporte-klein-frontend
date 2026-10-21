import IniciarSesion from './login'; // Importamos el archivo login.jsx
import { Routes, Route } from 'react-router-dom';
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

/**
 * Enrutador raíz de la aplicación.
 *
 * @returns {JSX.Element}
 */
function App() {
  return (
  
    <Routes>
      <Route path="/" element={<IniciarSesion />} />
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
      {/* HU 2.5 — Consulta de cargas */}
      <Route path="/cargas" element={<Cargas />} />
      <Route path="/cargas/:id" element={<DetalleCarga />} />
      {/* HU 4 y HU 6 — Mis viajes del camionero: asignados y postulaciones */}
      <Route path="/mis-viajes" element={<Postulaciones />} />
      {/* HU 12 — Centro de notificaciones */}
      <Route path="/notificaciones" element={<Notificaciones />} />
      {/* HU 13 — Panel de métricas (solo administrador) */}
      <Route path="/metricas" element={<Metricas />} />
    </Routes>
  );
}

export default App;
