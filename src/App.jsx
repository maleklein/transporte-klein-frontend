import { Routes, Route } from 'react-router-dom';
import Login from './login';
import Usuarios from './pages/Usuarios';
import AltaUsuario from './pages/AltaUsuario';

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
    </Routes>
  );
}

export default App;
