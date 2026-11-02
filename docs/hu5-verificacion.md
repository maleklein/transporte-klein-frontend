# HU 5: verificación inicial

Alcance acordado: postulados pendientes aptos. Pesos 40/25/20/15.
La verificación de pantalla usó respuestas sintéticas, sin crear usuarios,
cargas, postulaciones ni asignaciones en la base de uso.

| Comprobación en navegador | Resultado |
|---|---|
| Abrir Asignar camionero y alternar Postulados / Sugeridos | Las dos vistas conservan la confirmación de HU 6. |
| Consultar candidatos y desplegar explicación | Se ven posición, total y aportes por criterio. |
| Elegir un sugerido y confirmar | La selección llega al callback de asignación y el modal se cierra. |
| Volver a pulsar Sugeridos estando activa | Conserva la selección y la posibilidad de confirmar. |
| Consultar sin candidatos aptos | Mensaje explicativo y confirmación deshabilitada. |
| Respuesta de error | Mensaje visible, botón de actualización disponible y confirmación deshabilitada. |
| Actualizar después de que el candidato elegido deje de ser apto | La selección se limpia y no se permite confirmar. |
| Desplegar el detalle en una ventana de 720 px de alto | Contenido desplazable con título y botones visibles. |

`npm run build` verifica la compilación. `npm run lint` no puede ejecutarse
porque falta la configuración de ESLint en el repositorio previo a esta HU.
No se agregó una configuración global como parte del matching.

El backend contiene pruebas de reglas, servicio, permisos HTTP y SQL con tablas
temporales. Estas comprobaciones no reemplazan la prueba integral contra los
datos de uso. La conexión de HU 5 con el módulo de mapas de HU 9 ya transforma
los nombres de localidades a coordenadas del catálogo. El backend prueba el
circuito completo con PostgreSQL y una respuesta controlada del proveedor.
El 02/11/2026 también se verificó la consulta real a mapas en el backend:
Santa Fe → Paraná devolvió HTTP 200, 29,62 km y 22,53 puntos de cercanía sin
advertencias, usando candidatos temporales. El registro está en
`docs/hu5-validacion-mapas.md` del repositorio backend. Esa prueba no cambia el
carácter sintético de los datos usados en la revisión visual anterior.
