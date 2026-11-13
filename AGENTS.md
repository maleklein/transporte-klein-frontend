# Instrucciones para agentes: transporte-klein-frontend

Interfaz web de Transporte Klein, un sistema de gestión de cargas para la
materia Informática Aplicada (UAP). React y Vite. La API está en
`maleklein/transporte-klein-backend`.

Todo se escribe en español rioplatense: código, textos de la interfaz, commits,
PRs y documentación. Los textos que ve el usuario usan voseo ("Elegí una
localidad").

## Documentación del proyecto

El proyecto tiene tres documentos que tienen que coincidir con el código:

| Documento | Dónde está |
|---|---|
| SRS (`SRS_Transporte_Klein.docx`) | [OneDrive de Milena](https://uapeduar-my.sharepoint.com/:w:/r/personal/milena_seri_uap_edu_ar/_layouts/15/Doc.aspx?sourcedoc=%7BCD7049A0-1983-4EBD-B312-0BD4A8DC5CB6%7D&file=SRS_Transporte_Klein.docx&action=default) |
| Manual de usuario (`Manual_de_Usuario_Transporte_Klein.docx`) | [Drive de Gianna](https://docs.google.com/document/d/1Bi-bGt3aQe49anbhF4TWqDN51H_GM5yM/edit) |
| Banco de pruebas (`Bancos_de_Prueba_Transporte_Klein.docx`) | [Drive de Gianna](https://docs.google.com/document/d/14ZyBpCDsu3TXOB1qMSUldf-dgRwJxVDW/edit) |

Los tres son archivos Word. Si no podés abrir los links, pedíselos a quien te
está usando.

### Al hacer un cambio en el código

1. **No edites los documentos en la misma sesión.** Se actualizan los tres
   juntos, cada tanto, a partir de los PRs. Así dos sesiones no editan el mismo
   archivo a la vez.
2. **Completá "Impacto en la documentación" en la descripción del PR**
   (la plantilla está en `.github/pull_request_template.md`). Para cada
   documento, escribí qué hay que cambiar y dónde:
   - SRS: sección, requisito (RF, RN), HU, tabla de tareas o prototipo de
     pantalla.
   - Manual: sección y, si cambia una pantalla, qué captura rehacer.
   - Banco de pruebas: HU y número de caso.
   Copiá el texto exacto de botones, títulos y mensajes.
   Si el cambio no afecta ninguno, escribí "Ninguno".
3. **Si hay impacto, ponele al PR la etiqueta `documentacion-pendiente`.**

Afecta la documentación todo lo que cambia lo que el sistema hace o muestra:
pantallas, textos de la interfaz, botones, mensajes, navegación, qué ve cada
rol, validaciones y reglas de negocio. Un refactor o un cambio de estilos que
no cambia lo que se ve en una captura no la afectan.

### Al actualizar los documentos

Solo cuando te lo pidan. Partí de los PRs mergeados de los dos repos con la
etiqueta `documentacion-pendiente`:

```bash
gh pr list -R maleklein/transporte-klein-backend --state merged --label documentacion-pendiente
gh pr list -R maleklein/transporte-klein-frontend --state merged --label documentacion-pendiente
```

- Si un documento y el código no coinciden, manda el código: corregí el
  documento. Si parece un error del código, avisá en lugar de "arreglar" el
  documento.
- Editá sin control de cambios y guardá una copia del archivo anterior.
- En Drive, subí el archivo como versión nueva del mismo documento
  (Administrar versiones), no como archivo aparte: el link tiene que seguir
  siendo el mismo.
- Las capturas nuevas del manual van en el mismo formato que las que ya están.
- Cuidá que los tres documentos digan lo mismo entre sí: un mensaje que cambia
  en el manual cambia también en el banco y, si corresponde, en el SRS.
- Al terminar, sacá la etiqueta de los PRs que pasaste:
  `gh pr edit <número> --remove-label documentacion-pendiente`.

Además de esos tres, `docs/` tiene notas y capturas de verificación por HU, y
el README describe algunas funcionalidades. Esos sí se actualizan en el mismo
PR que cambia el código.

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173, contra la API de VITE_API_URL
npm run build    # lo que corre el Dockerfile; tiene que pasar antes del PR
```

Sin `VITE_API_URL`, en desarrollo se usa `http://localhost:3000` (el backend
local). En el build de producción la variable es obligatoria (ver el README).
El repo no tiene tests: probá el cambio en el navegador, con un usuario de cada
rol que corresponda (administrador y camionero).

## Cómo subir cambios

Las mismas reglas que el backend (detalle en su README):

- Ramas dentro del repo (no forks), creadas desde `main`, con nombre `fix/...`.
  No renombres una rama con PR abierto: GitHub cierra el PR.
- Commits con prefijo `feat:` o `fix:`; `docs:` o `refactor:` cuando no
  cambia el comportamiento.
- PR a `main`, mergeado con **Create a merge commit**, nunca squash.
- Al mergear a `main`, Railway publica la versión nueva.
- Si el cambio necesita algo nuevo del backend, el PR del backend se mergea
  primero.

## Estructura y convenciones

```
src/api/          un archivo por recurso de la API; sesion.js guarda el token
src/components/   piezas reutilizables, cada una con su .css al lado
src/pages/        una pantalla por archivo, cada una con su .css al lado
src/utils/        validaciones y funciones puras
src/index.css     variables de color y estilos comunes
docs/             notas y capturas de verificación por HU
```

- Las llamadas al backend van solo en `src/api/`; las páginas no usan `fetch`
  directo.
- Colores y espaciados con las variables de `src/index.css`, no con valores
  sueltos. Las pantallas tienen que verse consistentes entre sí (mismo estilo
  de título con ícono, mismo ancho).
- Revisá cada cambio de interfaz también en ancho de celular.
- Los estados de una carga y qué transiciones se ofrecen salen de
  `src/utils/estadosCarga.js`; tienen que coincidir con el backend
  (`src/domain/estadosCarga.js`).
- Nunca pongas tokens ni credenciales en el código o en los docs.
