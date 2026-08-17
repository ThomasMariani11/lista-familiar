# Lista familiar: publicación y sincronización

## Lo que ya está listo

- La app puede instalarse como PWA desde una URL segura (HTTPS).
- Incluye `manifest.webmanifest`, un ícono y caché básica para la interfaz.
- `firestore.rules` contiene las reglas que permiten a todos leer, pero solo al autor borrar gastos.

## Configuración de Firebase (cuenta de Thomi)

1. Crear un proyecto en Firebase con el plan **Spark** (sin facturación).
2. Crear una app Web y copiar su configuración en `firebase-config.js`.
3. Activar Authentication con proveedor **Email/Password**.
4. Crear cuatro usuarios privados en Authentication. La interfaz muestra solo el nombre; los códigos serán sus contraseñas:
   - `thomi@lista-familiar.app`
   - `mati@lista-familiar.app`
   - `delfi@lista-familiar.app`
   - `mama@lista-familiar.app`
5. Crear Cloud Firestore y pegar el contenido de `firestore.rules` en la pestaña Reglas.

## Publicación

1. Crear un repositorio público de GitHub para estos archivos.
2. En GitHub Pages, publicar desde la rama principal y la carpeta raíz.
3. Abrir la URL final en cada celular y usar “Instalar” (Android) o “Agregar a pantalla de inicio” (iPhone).

> Firebase no debe habilitar modo de prueba ni reglas públicas. La configuración Web publicada no es una clave privada; las reglas y Authentication protegen los datos.
