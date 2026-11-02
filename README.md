# transporte-klein
Proyecto de Transporte Klein correspondiente a la materia Informática Aplicada I y II

## Notificaciones (HU 12)

El acceso a las notificaciones está en la barra superior de todas las pantallas
(`components/BarraSuperior.jsx`), con el contador de las que faltan leer.

**El contador se actualiza consultando `GET /notificaciones` cada 30 segundos**,
no porque el servidor lo empuje. Es una decisión, no una omisión: para el
alcance del proyecto alcanza, y evita sumar websockets. Con la pestaña en
segundo plano no consulta, y al volver a ella se actualiza en el acto.

## Sugerencias de camioneros (HU 5)

En el modal **Asignar camionero**, la vista **Postulados** conserva la selección
manual y **Sugeridos** consulta `GET /matching/:idCarga`. La nueva vista ordena
solo postulados pendientes aptos y muestra puntaje y explicación desplegable.
Elegir un sugerido usa la misma confirmación y el mismo endpoint de HU 6.

Las sugerencias se consultan al abrir esa vista, cada 30 segundos mientras está
visible y al volver a la ventana. También se pueden actualizar manualmente.
Durante una actualización no se puede confirmar una selección anterior; si un
candidato deja de ser apto, su selección se limpia. No se actualiza mientras se
está asignando. Un error permite reintentar y no habilita confirmar datos viejos.

Si mapas no puede calcular cercanía, el desglose avisa que aporta cero puntos.
El historial muestra experiencia en entregas, todavía no calificaciones.
El diseño de referencia está en `docs/hu5-sugeridos.svg` (datos ilustrativos).

## Costos y ganancia estimados (HU 10)

Sólo para el administrador. El camionero no ve montos: el backend ni siquiera
se los manda.

- **Detalle de carga**: el bloque **Estimación económica**
  (`components/EconomiaCarga.jsx`) muestra costo, ingreso y ganancia, y los
  parámetros con los que se calcularon. Si la distancia está pendiente, explica
  que no se puede estimar hasta tenerla; se completa sola con el Reintentar de
  la distancia.
- **Parámetros operativos** (`/parametros`, acceso en la barra superior):
  costo, peaje y tarifa por km, con la fecha de su última modificación. Valida
  que sean números positivos y pide confirmación antes de guardar.

Cambiar un parámetro **no recalcula las cargas que ya tienen su estimación**:
cada una guarda la cuenta como foto del momento en que se hizo. Por eso el
detalle muestra los parámetros usados en esa carga y no los vigentes. La
fórmula y el motivo están en el README del backend.

Capturas de referencia en `docs/hu10-*.png`.
