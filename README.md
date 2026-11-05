# Lista familiar: publicación y sincronización

## Lo que ya está listo

- La app puede instalarse como PWA desde una URL segura (HTTPS).
- Incluye `manifest.webmanifest`, un ícono y caché básica para la interfaz.
- Busca actualizaciones cada 15 segundos mientras está visible, al volver a la app y al recuperar conexión. Aplica la nueva versión automáticamente cuando no hay formularios en edición, diálogos abiertos ni operaciones pendientes.
- Thomi, Mati, Papá y Delfi comparten faltantes y gastos en tiempo real. Mamá entra directamente a Gastos individuales; su interfaz no muestra ni carga las secciones compartidas.
- Papá tiene las mismas funciones que Mati: administra faltantes, carga compras del súper y gastos mensuales, consulta el disponible y puede eliminar sus propios gastos. No tiene sección individual ni puede modificar el presupuesto familiar.
- En Gastos mensuales, solo Thomi puede definir o modificar el dinero de cada mes; los demás usuarios ven cuánto queda disponible después de restar todos los gastos.
- Mamá y Delfi tienen una pestaña privada de gastos individuales, cada una con disponible mensual y registros separados que solo su dueña puede consultar y administrar.
- La vista exclusiva de Mamá es una restricción de interfaz. Las reglas actuales conservan sus permisos sobre los datos compartidos; revocar ese acceso requiere un cambio de reglas aparte.
- `firestore.rules` limita el acceso a las cinco cuentas familiares, valida el autor de cada gasto y permite que solo ese autor lo elimine.
- Thomi puede cargar faltantes, gastos del súper y gastos mensuales manuales. Conserva el permiso exclusivo para modificar el presupuesto familiar.

## Configuración de Firebase (cuenta de Thomi)

1. Crear un proyecto en Firebase con el plan **Spark** (sin facturación).
2. Crear una app Web y copiar su configuración en `firebase-config.js`.
3. Activar Authentication con proveedor **Email/Password**.
4. Crear cinco usuarios privados en Authentication. La interfaz muestra solo el nombre; los códigos serán sus contraseñas:
   - `thomi@lista-familiar.app`
   - `mati@lista-familiar.app`
   - `papa@lista-familiar.app`
   - `delfi@lista-familiar.app`
   - `mama@lista-familiar.app`
5. Crear Cloud Firestore y pegar el contenido de `firestore.rules` en la pestaña Reglas.

Si la app ya está publicada, para habilitar a Papá hay que crear `papa@lista-familiar.app` en Authentication con su contraseña, publicar las reglas actualizadas de `firestore.rules` y publicar los archivos de la app. Agregar el botón no crea automáticamente la cuenta de Firebase.

## Categorización automática con Gemini

Al agregar un producto, la app busca su categoría en este orden:

1. **Memoria familiar** (`families/default/meta/categories`): clasificaciones ya hechas por Gemini o corregidas a mano. Si está, no se consulta a Gemini.
2. **Gemini**, a través del servidor de `server/`. La respuesta se valida contra las categorías permitidas y se guarda en la memoria.
3. **Otros**, si Gemini falla o se alcanzó el límite gratuito. El producto se agrega igual, con aviso y el selector resaltado para elegir la categoría.

Si `categorizer-config.js` no tiene URL, se usan las palabras clave de `RULES` en `app.js` como antes.

Cada producto tiene un selector de categoría. Cambiarlo corrige el producto y actualiza la memoria, así la próxima vez se usa la corrección.

La clave `GEMINI_API_KEY` vive solo en el servidor (un Cloudflare Worker gratuito). El servidor verifica la sesión de Firebase y solo atiende a las cinco cuentas familiares.

### Configuración (una sola vez)

1. Crear la clave en <https://aistudio.google.com/apikey> (proyecto sin facturación = nivel gratuito).
2. Crear una cuenta gratuita en Cloudflare y, desde la carpeta `server/`:
   ```bash
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```
3. Copiar la URL que muestra `deploy` (`https://lista-familiar-categorias.<cuenta>.workers.dev`) en `categorizer-config.js` y publicar la app.

El modelo se cambia en `server/wrangler.toml` (`GEMINI_MODEL`) y se aplica con `npx wrangler deploy`. Antes de cambiarlo, verificar en <https://ai.google.dev/gemini-api/docs/pricing> que tenga nivel gratuito. Si el modelo no acepta `GEMINI_THINKING_LEVEL = "minimal"`, dejarlo vacío.

### Prueba local

1. Crear `server/.dev.vars` (ignorado por git) con `GEMINI_API_KEY=tu_clave`.
2. En `server/`, ejecutar `npx wrangler dev` (queda en `http://localhost:8787`).
3. Poner temporalmente `http://localhost:8787` en `categorizer-config.js` y abrir la app en `http://localhost:5180`.

Antes de publicar, volver a dejar la URL de producción en `categorizer-config.js`.

## Publicación

1. Crear un repositorio público de GitHub para estos archivos.
2. En GitHub Pages, publicar desde la rama principal y la carpeta raíz.
3. Abrir la URL final en cada celular y usar “Instalar” (Android) o “Agregar a pantalla de inicio” (iPhone).

URL familiar: <https://thomasmariani11.github.io/lista-familiar/>

Para cada nueva publicación, incrementar `CACHE_NAME` en `service-worker.js`, usar el mismo valor en `APP_VERSION` de `app.js` y actualizar la versión de los recursos modificados en `index.html`. Esto dispara la actualización automática de las apps abiertas. También se compara la versión del worker activo para detectar actualizaciones cuyo evento de activación haya ocurrido antes de abrir la página. La primera instalación de esta función requiere recargar una vez la versión anterior. GitHub Pages debe terminar de publicar antes de que los dispositivos puedan detectar el cambio.

> Firebase no debe habilitar modo de prueba ni reglas públicas. La configuración Web publicada no es una clave privada; las reglas y Authentication protegen los datos.
