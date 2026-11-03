# HU 16: verificación

Panel principal del administrador en `/panel-administrador`. Reutiliza
`GET /metricas` (HU 13), `GET /cargas?estado=pendiente` (HU 2.5) y
`GET /notificaciones?solo_no_leidas=true` (HU 12): no se agregó ningún
endpoint. La verificación se hizo en Chrome contra la API y la base locales,
con dos cargas de prueba (una pendiente con un postulado y una disponible) que
se borraron al terminar. Los casos de error y de período vacío se simularon
interceptando la respuesta de `/metricas` en el navegador.

| Comprobación en navegador | Resultado |
|---|---|
| Pendientes de asignación | El número coincide con `GET /cargas?estado=pendiente`. |
| Notificaciones sin leer | El número coincide con `GET /notificaciones?solo_no_leidas=true` ("99+" desde 100). |
| Cargas por estado | Los seis números coinciden con `cargas_por_estado` de `/metricas` para los últimos 30 días. |
| Período del conteo | Se indica "Cargas creadas del … al …, según el estado en que están hoy". |
| Accesos directos | Usuarios, Cargas, Nueva carga, Estadísticas, Notificaciones y Parámetros. |
| "Ver pendientes" | Abre `/cargas?estado=pendiente` con el filtro elegido y sólo cargas pendientes. |
| "Cargas" de la barra estando filtrado | Vuelve a `/cargas` sin filtro. |
| Cambiar el filtro de estado en el listado | La URL se actualiza (`?estado=…`). |
| Falla `/metricas` (500) | Aviso arriba con "Reintentar", como el panel del camionero; tarjetas y accesos siguen visibles. |
| "Reintentar" | Vuelve a pedir y muestra los datos. |
| Período sin cargas | "No se crearon cargas en este período", con acceso a registrar una. |
| Pantalla de 390 px | Sin desplazamiento horizontal. |
| Camionero que abre `/panel-administrador` | Lo redirige a `/panel-camionero` (control de la HU 15). |
| Consola del navegador | Sin errores. |

`npm run build` verifica la compilación. `npm run lint` sigue sin poder
ejecutarse por la falta de configuración de ESLint, igual que en la HU 5.

Capturas: `docs/hu16-panel.png`, `docs/hu16-panel-error.png` y
`docs/hu16-panel-celular.png`.
