import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Safari del iPhone sólo aplica :active al tocar si la página escucha algún
// toque. Sin esto, las tarjetas no darían ninguna respuesta al apretarlas
// (el recuadro gris del navegador se sacó en index.css).
document.addEventListener('touchstart', () => {}, { passive: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
