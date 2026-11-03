# Bancos de prueba de Tomás — interfaz

Complementa el Word y los casos automáticos del backend. Historias: HU 1.4, HU 2.3, HU 4, HU 6, HU 5 y HU 11.

## Preparación

Usar backend y frontend actualizados, PostgreSQL local y cuentas de prueba de administrador creador y dos camioneros activos. Preparar cargas disponibles, pendientes con postulados y entregadas con asignado. No usar datos personales reales para capturas. Las cuentas sintéticas del banco automático se eliminan al finalizar: no quedan disponibles para iniciar sesión en la aplicación.

Las pruebas automáticas no certifican la interfaz. Todos los casos siguientes están pendientes de ejecución manual en esta revisión. Para cada caso registrar fecha, navegador, resultado observado y evidencia; no marcar aprobado antes de ejecutarlo.

## HU 1.4 — Autenticar usuario (login)

### LOGIN-UI-01 Inicio y error visible

1. Abrir login; ingresar una contraseña incorrecta; corregir e iniciar sesión como administrador y camionero.
2. Verificar: El error se entiende; cada usuario accede a su pantalla y los controles corresponden a su rol.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

### LOGIN-UI-02 Cerrar sesión

1. Cerrar sesión y volver con Atrás o abrir una ruta protegida.
2. Verificar: No permite operar sin una sesión válida.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

## HU 2.3 — Publicar carga

### PUB-UI-01 Publicación visible

1. Como administrador, crear una carga válida; luego entrar como camionero y buscarla en Cargas disponibles.
2. Verificar: La carga aparece disponible con origen, destino, fecha y peso correctos.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

### PUB-UI-02 Formulario inválido

1. Dejar un campo obligatorio vacío y enviar; corregirlo.
2. Verificar: Mensaje por campo; no aparece una publicación incompleta ni duplicada por el intento inválido.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

## HU 4 — Postularse a una carga

### POST-UI-01 Postular y consultar

1. Como camionero, abrir una carga disponible, postularse y consultar Mis postulaciones.
2. Verificar: Confirma la postulación y muestra la carga con estado pendiente.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

### POST-UI-02 Postulación repetida

1. Volver a la misma carga e intentar postularse otra vez.
2. Verificar: La interfaz informa la postulación existente o impide repetir; no duplica filas.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

## HU 6 — Asignar carga a camionero

### ASIG-UI-01 Confirmar asignación

1. Como administrador, abrir una carga pendiente con dos postulados; seleccionar uno y confirmar.
2. Verificar: Se muestra el ganador y estado aceptada; los avisos corresponden a ganador y rechazado.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

### ASIG-UI-02 Volver sin asignar

1. Abrir el modal, seleccionar candidato y pulsar Volver.
2. Verificar: La carga continúa pendiente y no hay asignación.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

## HU 5 — Sugerir camioneros mediante matching automático

### MAT-UI-01 Puntaje y explicación

1. Abrir Asignar camionero, pestaña Sugeridos; desplegar cada fila.
2. Verificar: Ranking ordenado; total y cuatro criterios; ubicación reconocida y advertencias visibles.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

### MAT-UI-02 Sin candidatos aptos

1. Preparar una carga con postulados no disponibles o con capacidad insuficiente y abrir Sugeridos.
2. Verificar: Mensaje explicativo y ninguna selección apta para confirmar desde Sugeridos.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

### MAT-UI-03 Actualización

1. Con el modal abierto, modificar datos de un candidato en otra sesión; volver y actualizar o esperar la actualización.
2. Verificar: El ranking refleja los datos nuevos; una selección que deja de ser válida se limpia.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

### MAT-UI-04 Mapas reales

1. Con ORS_API_KEY local configurada y ubicaciones reconocidas distintas, consultar Sugeridos.
2. Verificar: Distancia por ruta y puntaje coherentes; si falla el proveedor, advertencia y cercanía cero. Registrar cuál ocurrió.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

## HU 11 — Calificaciones y reputación

### CAL-UI-01 Calificar ambas partes

1. Usar una carga entregada: entrar como creador y puntuar al asignado; entrar como asignado y puntuar al creador.
2. Verificar: Cada parte puede enviar una sola evaluación de 1 a 5; el receptor es correcto.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

### CAL-UI-02 Perfil e historial

1. Abrir Mi perfil y el perfil autorizado de la contraparte; revisar promedio, comentarios y más evaluaciones.
2. Verificar: Promedio ponderado, historial ordenado; sin evaluaciones muestra Sin calificaciones.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

### CAL-UI-03 Comentario como texto

1. Guardar un comentario de prueba con <b>texto</b> y ver el historial.
2. Verificar: Se muestra como texto, sin interpretar etiquetas HTML.

Estado: pendiente. Fecha: —. Resultado observado: —. Evidencia: —.

## Verificación de construcción

`npm run build` completado el 02/11/2026. Vite advierte que el paquete principal supera 500 kB; la construcción finaliza correctamente. Esto no reemplaza los casos visuales.
