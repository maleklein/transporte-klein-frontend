import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
// Inter, la fuente de todo el sistema (ver --fuente en index.css). Viene en
// el paquete @fontsource-variable/inter: se sirve con la app, sin pedirla a
// Google Fonts.
import '@fontsource-variable/inter'
import './index.css'

// Safari del iPhone sólo aplica :active al tocar si la página escucha algún
// toque. Sin esto, las tarjetas no darían ninguna respuesta al apretarlas
// (el recuadro gris del navegador se sacó en index.css).
document.addEventListener('touchstart', () => {}, { passive: true })

// Router "de datos": hace falta para frenar la navegación y avisar antes de
// salir de un formulario con cambios sin guardar (`useBlocker`). Las rutas
// siguen declaradas con <Routes> en App.jsx: esta ruta comodín las contiene.
const router = createBrowserRouter([{ path: '*', element: <App /> }])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
