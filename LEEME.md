# Mis pagos

Una página web gratuita que funciona como una pequeña app en iPhone. Los pagos se guardan en el navegador del dispositivo y no se envían a ningún servidor. Puedes añadir, editar y borrar pagos en tres apartados: **Lo pago yo**, **Casa a medias** y **Con otras personas**.

## Publicarla gratis

La carpeta está preparada para publicarse como sitio estático en **GitHub Pages** (gratis):

1. Crea una cuenta gratuita en [GitHub](https://github.com/) si aún no tienes una.
2. Crea un repositorio público nuevo, por ejemplo `mis-pagos`.
3. Sube el contenido de esta carpeta (`index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `service-worker.js` e `icon.svg`) a la raíz del repositorio.
4. En el repositorio, abre **Settings → Pages** y elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`. Guarda los cambios.
5. GitHub te dará una dirección web parecida a `https://tu-usuario.github.io/mis-pagos/`.

## Añadirla al iPhone

1. Abre esa dirección en **Safari**.
2. Toca **Compartir** (el cuadrado con la flecha hacia arriba).
3. Elige **Añadir a pantalla de inicio** y confirma con **Añadir**.

La página necesita abrirse una primera vez con conexión para guardar la aplicación y luego podrá abrirse sin conexión. Cada navegador y dispositivo tiene su propia lista de pagos: los datos no se sincronizan entre distintos dispositivos. Si borras los datos del sitio en Safari, también se borrarán los pagos guardados.

## Probarla en un ordenador

Para probar la instalación y el modo sin conexión, sirve la carpeta mediante HTTPS o desde `localhost` (por ejemplo, con cualquier servidor local estático). Abrir el HTML como archivo no activa el modo sin conexión de la PWA.
