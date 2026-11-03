# HU 11 Calificaciones y reputación

## Probar en localhost

1. Reiniciar backend con `npm start` y frontend con `npm run dev`.
2. Ingresar como administrador creador de una carga. Asignarla a un camionero postulado y registrar los estados En viaje y Entregada. Usar un viaje de prueba, porque la entrega es definitiva.
3. En el detalle entregado aparece Calificación del viaje. Elegir un puntaje de 1 a 5, escribir opcionalmente un comentario y enviar.
4. Comprobar la confirmación y que el formulario se reemplaza por la evaluación guardada. Al recargar sigue guardada y no permite volver a calificar.
5. Abrir el enlace de la contraparte: su perfil muestra promedio, cantidad e historial. «Cómo se calcula» explica los pesos acordados.
6. Ingresar con el camionero asignado. Desde Mis viajes abrir el mismo viaje entregado y calificar al administrador creador.
7. Consultar Mi perfil desde la barra de navegación. Los administradores también ven reputación desde Usuarios → Ver.
8. Una carga sin entregar no ofrece el formulario. Un administrador distinto del creador no puede calificar ese viaje.

## Reglas

Puntajes enteros de 1 a 5; comentario opcional de hasta 1000 caracteres. Últimas diez evaluaciones con pesos 10, 9, ... 1 desde la más reciente. Sin evaluaciones se muestra «Sin calificaciones». Historial de a veinte registros por página.

## Verificación realizada el 2 de noviembre de 2026

- Frontend compilado con Vite.
- Backend: 83 comprobaciones aprobadas con `MATCHING_DB_TEST=1` y `CALIFICACIONES_DB_TEST=1`, incluyendo SQL real, permisos, concurrencia, ambos sentidos de calificación y recorrido postulación → asignación → entrega → calificación.
- Navegador con servidor real y datos sintéticos en esquema aislado: administrador inició sesión, abrió carga entregada, envió 5 con comentario y consultó el perfil del camionero con promedio 5,00 e historial. Se comprobó el bloqueo del botón sin puntaje y su reemplazo por la evaluación guardada.
- Se comprobó inicio de sesión y accesos del camionero. La validación visual de su envío quedó pendiente por interrupción del navegador; el envío y permisos de ese rol sí están cubiertos por la prueba HTTP con PostgreSQL.

Las migraciones 006 (costos, requisito del develop actualizado) y 007 (calificaciones) ya fueron aplicadas a la base local. Otros entornos deben aplicarlas antes de ejecutar la nueva versión. No ejecutar nuevamente sobre tablas existentes.

Los bancos formales de las historias de Tomás y el manual se completarán después de su prueba de aceptación. Este registro documenta la verificación de implementación.
