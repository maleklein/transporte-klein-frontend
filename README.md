# transporte-klein
Proyecto de Transporte Klein correspondiente a la materia Informática Aplicada I y II

## Producción

El frontend se publica en Railway, en el mismo proyecto que el backend, como
un servicio más. Railway mira la rama `main`: cada merge a `main` arma y
publica una versión nueva. Lo que está en `develop` no llega a producción
hasta pasar a `main` por un PR.

Se construye con el `Dockerfile` del repo: Node corre `vite build` y nginx
sirve el resultado (`nginx.conf.template`). nginx devuelve `index.html` para
cualquier ruta, así que recargar `/panel-administrador` o cualquier otra
pantalla funciona.

Variable del servicio en Railway:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://transporte-klein-backend-production.up.railway.app` |

Vite la mete dentro del JavaScript **al construir**, no al arrancar: si se
cambia, hay que volver a desplegar. Si falta, el build falla a propósito, para
que el sitio no quede apuntando a `localhost`.

Para probar la imagen en local (con Docker Desktop abierto):

```bash
docker build -t transporte-klein-frontend --build-arg VITE_API_URL=https://transporte-klein-backend-production.up.railway.app .
docker run --rm -p 8080:80 transporte-klein-frontend
```

y abrir http://localhost:8080.

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
El backend de HU 5 resuelve la ubicación del perfil contra el catálogo y envía
coordenadas al servicio de HU 9. El desglose muestra la localidad reconocida;
son distancias estimadas entre localidades, no posiciones GPS del camión.
Para el perfil se recomienda `Localidad, Provincia`; si el nombre se repite,
`Localidad, Departamento, Provincia`. Un nombre desconocido o ambiguo muestra
una advertencia y no se utiliza para consultar mapas.
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

## Panel principal del administrador (HU 16)

Es la pantalla de inicio del administrador (`/panel-administrador`, a donde
lleva el login y el acceso "Inicio" de la barra). Tiene tres bloques:

- **Requiere tu atención**: cuántas cargas están pendientes de asignación (las
  que ya tienen camioneros postulados), con "Ver pendientes", y cuántas
  notificaciones faltan leer, con "Abrir notificaciones".
- **Cargas por estado**: los seis estados de las cargas creadas en los últimos
  30 días, según el estado en que están hoy. Es el mismo conteo y el mismo
  período por defecto que el panel de métricas.
- **Accesos directos** a usuarios, cargas, nueva carga, estadísticas,
  notificaciones y parámetros.

No hay endpoint de resumen: reutiliza `GET /metricas`, `GET /cargas?estado=pendiente`
y `GET /notificaciones?solo_no_leidas=true`. Cada dato se pide por separado: si
falla alguno, se avisa arriba con "Reintentar" y las tarjetas y los accesos
directos siguen llevando a su sección.

Sigue el mismo esquema que el panel del camionero (HU 17) y reusa sus tarjetas
(`PanelCamionero.css`, clases `pcm-`), así los dos paneles se ven igual.

"Ver pendientes" abre el listado ya filtrado: el filtro de estado del listado de
cargas ahora vive en la URL (`/cargas?estado=pendiente`).

Verificación en `docs/hu16-verificacion.md` y capturas en `docs/hu16-*.png`.
