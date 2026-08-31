import { Routes, Route } from 'react-router-dom';
import Login from './login';
import Usuarios from './pages/Usuarios';
import AltaUsuario from './pages/AltaUsuario';
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
      {/* HU 2.1 + 2.1.1 — Alta de cargas */}
      <Route path="/cargas/nueva" element={<AltaCarga />} />
      {/* HU 2.5 — Consulta de cargas */}
      <Route path="/cargas" element={<Cargas />} />
      <Route path="/cargas/detalle" element={<DetalleCarga />} />
    </Routes>
  );
}

export default App;
