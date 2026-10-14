# transporte-klein
Proyecto de Transporte Klein correspondiente a la materia Informática Aplicada I y II

## Notificaciones (HU 12)

El acceso a las notificaciones está en la barra superior de todas las pantallas
(`components/BarraSuperior.jsx`), con el contador de las que faltan leer.

**El contador se actualiza consultando `GET /notificaciones` cada 30 segundos**,
no porque el servidor lo empuje. Es una decisión, no una omisión: para el
alcance del proyecto alcanza, y evita sumar websockets. Con la pestaña en
segundo plano no consulta, y al volver a ella se actualiza en el acto.
