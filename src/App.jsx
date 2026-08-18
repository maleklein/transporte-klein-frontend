import { Routes, Route } from 'react-router-dom';
import Login from './login';
import Usuarios from './pages/Usuarios';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      {/* HU 1.1 — Alta de usuarios */}
      <Route path="/usuarios" element={<Usuarios />} />
    </Routes>
  );
}

export default App;
