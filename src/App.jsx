import { Routes, Route } from 'react-router-dom';
import Login from './login';
import Usuarios from './pages/Usuarios';
import AltaUsuario from './pages/AltaUsuario';
import EditarUsuario from './pages/EditarUsuario';
import DetalleUsuario from './pages/DetalleUsuario';
import AltaCarga from './pages/AltaCarga';
import Cargas from './pages/Cargas';
import DetalleCarga from './pages/DetalleCarga';

/**
 * Enrutador raíz de la aplicación.
 *
 * @returns {JSX.Element}
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      {/* HU 1.1 — Alta de usuarios */}
      <Route path="/usuarios" element={<Usuarios />} />
      <Route path="/usuarios/nuevo" element={<AltaUsuario />} />
      {/* HU 1.2 — Modificación de usuario */}
      <Route path="/usuarios/editar" element={<EditarUsuario />} />
      {/* HU 1.3 — Consulta de usuarios */}
      <Route path="/usuarios/detalle" element={<DetalleUsuario />} />
      {/* HU 2.1 + 2.1.1 — Alta de cargas */}
      <Route path="/cargas/nueva" element={<AltaCarga />} />
      {/* HU 2.5 — Consulta de cargas */}
      <Route path="/cargas" element={<Cargas />} />
      <Route path="/cargas/detalle" element={<DetalleCarga />} />
    </Routes>
  );
}

export default App;
