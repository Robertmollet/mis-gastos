# Mis pagos

Web app gratuita para iPhone. Los gastos se guardan en el navegador del dispositivo y no se envían a un servidor. Incluye tres apartados —**Mi cuenta**, **Cuenta Casa** y uno que puedes nombrar—, recordatorios únicos, mensuales y con varias fechas.

Los pagos mensuales muestran su próxima fecha. Si esa fecha cae en sábado o domingo, se adelanta al viernes anterior. Las tarjetas se ordenan por fecha y usan rojo para los próximos 0–5 días, amarillo para 6–20, verde para 21–31 y blanco para más de 31 días. La lista se desplaza dentro de la pantalla para que el encabezado y los apartados siempre permanezcan visibles.

## Publicar en GitHub Pages

La carpeta se publica como sitio estático. En un repositorio público de GitHub Free:

1. Sube el contenido de esta carpeta a la raíz del repositorio.
2. Abre **Settings → Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. Pulsa **Save** y espera a que el flujo de Pages termine correctamente en la pestaña **Actions**.

La web tendrá una dirección similar a `https://tu-usuario.github.io/nombre-del-repositorio/`.

## Añadirla al iPhone

1. Abre la dirección de la web en Safari.
2. Toca **Compartir** y luego **Añadir a pantalla de inicio**.

La primera visita requiere conexión. Después, la app puede abrirse sin conexión. Cada dispositivo mantiene sus propios gastos. Si borras los datos del sitio en Safari, también se borrarán los gastos guardados.

## Actualizar una web que ya está publicada

1. En el ordenador, abre la carpeta `gastos` del proyecto.
2. En GitHub, abre tu repositorio y elige **Add file → Upload files**.
3. Sube a la raíz los archivos actualizados `index.html`, `app.js`, `styles.css` y `service-worker.js`.
4. Pulsa **Commit changes** para guardar la actualización.
5. En **Actions**, espera a que **pages build and deployment** termine en verde. Luego recarga la web en Safari.

Actualizar el código de la página no borra los gastos guardados en el iPhone.
