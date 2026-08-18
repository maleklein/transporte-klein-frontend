import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './Login'; // Asegúrate de que tu archivo Login.jsx esté en la misma carpeta

function App() {
  return (
    <Routes>
      {/* Definimos que la ruta principal "/" muestre el componente Login */}
      <Route path="/" element={<Login />} />
    </Routes>
  );
}

export default App;