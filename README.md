# Lista familiar: publicación y sincronización

## Lo que ya está listo

- La app puede instalarse como PWA desde una URL segura (HTTPS).
- Incluye `manifest.webmanifest`, un ícono y caché básica para la interfaz.
- Busca actualizaciones cada 15 segundos mientras está visible, al volver a la app y al recuperar conexión. Aplica la nueva versión automáticamente cuando no hay formularios en edición, diálogos abiertos ni operaciones pendientes.
- Los cinco integrantes comparten faltantes y gastos en tiempo real.
- Papá tiene las mismas funciones que Mati: administra faltantes, carga compras del súper y gastos mensuales, consulta el disponible y puede eliminar sus propios gastos. No tiene sección individual ni puede modificar el presupuesto familiar.
- En Gastos mensuales, solo Thomi puede definir o modificar el dinero de cada mes; los demás usuarios ven cuánto queda disponible después de restar todos los gastos.
- Mamá y Delfi tienen una pestaña privada de gastos individuales, cada una con disponible mensual y registros separados que solo su dueña puede consultar y administrar.
- `firestore.rules` limita el acceso a las cinco cuentas familiares, valida el autor de cada gasto y permite que solo ese autor lo elimine.
- Thomi puede cargar faltantes y gastos del súper, pero no gastos mensuales manuales; esta restricción también se aplica en Firestore.

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

## Publicación

1. Crear un repositorio público de GitHub para estos archivos.
2. En GitHub Pages, publicar desde la rama principal y la carpeta raíz.
3. Abrir la URL final en cada celular y usar “Instalar” (Android) o “Agregar a pantalla de inicio” (iPhone).

URL familiar: <https://thomasmariani11.github.io/lista-familiar/>

Para cada nueva publicación, incrementar `CACHE_NAME` en `service-worker.js` y la versión de los recursos modificados en `index.html`. Esto dispara la actualización automática de las apps abiertas. La primera instalación de esta función requiere recargar una vez la versión anterior. GitHub Pages debe terminar de publicar antes de que los dispositivos puedan detectar el cambio.

> Firebase no debe habilitar modo de prueba ni reglas públicas. La configuración Web publicada no es una clave privada; las reglas y Authentication protegen los datos.
