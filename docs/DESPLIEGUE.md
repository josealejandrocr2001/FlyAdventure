# Despliegue de FlyAdventure (Aiven + Render + Vercel)

La versión publicada tiene tres piezas. Cada una vive en un servicio gratuito y se actualiza sola cuando se fusiona un PR a `main`, excepto la base de datos.

| Pieza | Servicio | Dirección |
|---|---|---|
| Página (React + Vite) | Vercel | `https://fly-adventure.vercel.app` |
| API (Node + Express) | Render, Free Web Service | `https://<nombre>.onrender.com/api` |
| Base de datos (MySQL 8) | Aiven for MySQL, plan Free | La que asigne Aiven |

> **Regla del equipo:** cada integrante sigue desarrollando con su MySQL local. La base de Aiven es solo para la versión publicada; no se usa para hacer pruebas de desarrollo.

---

## 1. Base de datos en Aiven

1. Entra a [aiven.io](https://aiven.io) con tu cuenta de GitHub.
2. **Create service** → **MySQL** → plan **Free**. Elige la nube y la región que ofrezca (anota cuál es). Nombre: `flyadventure-db`.
3. Espera a que el estado diga **Running**.
4. En **Overview → Connection information** anota: **Host**, **Port**, **User** (`avnadmin`) y **Password**. Descarga el **CA certificate** (archivo `ca.pem`) y guárdalo fuera del repositorio.
5. **MySQL Workbench → nueva conexión:**
   - Hostname, Port, Username y Password: los de Aiven.
   - Pestaña **SSL**: *Use SSL* = **Require and Verify CA**, *SSL CA File* = el `ca.pem` descargado.
   - **Test Connection** debe responder OK.
6. Con esa conexión abre `database/FlyAdventure_MySQL_v2.sql` y ejecútalo completo (⚡). Crea la base `flyadventure` con los datos de prueba.
7. **Cambia la contraseña del administrador.** La contraseña de prueba está publicada en el README:
   ```bash
   cd server
   npm run hash -- "UnaClaveNuevaSegura2026"
   ```
   Copia el resultado y ejecútalo en Workbench, sobre la base de Aiven:
   ```sql
   UPDATE flyadventure.usuario
   SET contrasena_hash = 'PEGA_AQUI_EL_HASH'
   WHERE correo = 'admin@flyadventure.com';
   ```
   Haz lo mismo con los demás usuarios de prueba, o desactívalos desde el panel (Usuarios → Desactivar).

> El plan Free de Aiven puede apagar el servicio si pasa mucho tiempo sin uso. Aiven avisa por correo antes y se vuelve a encender con un clic en la consola.

## 2. API en Render

1. Entra a [render.com](https://render.com) con tu cuenta de GitHub.
2. **New → Web Service** → conecta el repositorio `FlyAdventure` (dale acceso si te lo pide).
3. Configuración:

   | Campo | Valor |
   |---|---|
   | Name | `flyadventure-api` |
   | Region | La más cercana a la región de Aiven |
   | Branch | `main` |
   | Root Directory | `server` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |

4. **Environment Variables** (no subas estos valores al repositorio):

   | Variable | Valor |
   |---|---|
   | `DB_HOST` | Host de Aiven |
   | `DB_PORT` | Puerto de Aiven |
   | `DB_USER` | `avnadmin` |
   | `DB_PASSWORD` | Contraseña de Aiven |
   | `DB_NAME` | `flyadventure` |
   | `DB_SSL` | `true` |
   | `DB_SSL_CA` | El contenido completo de `ca.pem`, desde `-----BEGIN CERTIFICATE-----` hasta `-----END CERTIFICATE-----` |
   | `JWT_SECRET` | Una cadena nueva (no la de tu PC): `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `8h` |
   | `CORS_ORIGIN` | `https://fly-adventure.vercel.app` (sin `/` al final) |

   `PORT` no se define: Render lo asigna solo.

5. **Create Web Service.** En **Logs** debe aparecer `✔ Conectado a MySQL`.
6. Copia la dirección del servicio y prueba en el navegador `https://<nombre>.onrender.com/api/salud`. Debe responder `{"estado":"ok", ...}`.

> El servicio gratuito se duerme tras 15 minutos sin uso y tarda cerca de un minuto en despertar. Antes de una presentación, abre `/api/salud` unos minutos antes.

## 3. Página en Vercel

1. En [vercel.com](https://vercel.com) abre el proyecto `fly-adventure` → **Settings → Environment Variables**. Agrega, para *Production*:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://<nombre>.onrender.com/api` |
   | `VITE_SITE_URL` | `https://fly-adventure.vercel.app` |
   | `VITE_EMAILJS_SERVICE_ID` | El mismo de `.env.local` |
   | `VITE_EMAILJS_PUBLIC_KEY` | El mismo de `.env.local` |
   | `VITE_EMAILJS_TEMPLATE_CONFIRMACION` | El mismo de `.env.local` |
   | `VITE_EMAILJS_TEMPLATE_ENCUESTA` | El mismo de `.env.local` |

2. **Deployments** → el último → **⋯ → Redeploy**. Vite solo lee las variables al construir, así que sin este paso no las toma.
3. Abre `https://fly-adventure.vercel.app/registro`, crea una cuenta y haz una reserva de prueba.

## 4. Después de cada entrega (cada merge a `main`)

1. Render y Vercel se actualizan solos. Revisa en ambos que el despliegue quedó en verde.
2. Si el PR trae archivos en `database/migraciones/`, ejecútalos **también en Aiven** con Workbench, en orden.
3. Prueba rápida en la versión publicada: inicio de sesión del administrador, una reserva y "Mi cuenta".

## 5. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| "No hay conexión con el servidor" en Vercel | Falta `VITE_API_URL` o no se hizo Redeploy | Revisa la variable y vuelve a desplegar |
| Error de CORS en la consola del navegador | `CORS_ORIGIN` en Render no coincide con la dirección de Vercel | Debe ser exactamente `https://fly-adventure.vercel.app` |
| Logs de Render: `No fue posible conectarse a MySQL` | Servicio de Aiven apagado o datos mal copiados | Enciende el servicio en Aiven y revisa las variables `DB_*` |
| Logs de Render: `self-signed certificate` o `unable to verify` | `DB_SSL_CA` incompleto | Pega de nuevo todo el contenido de `ca.pem` |
| La primera petición tarda un minuto | Render estaba dormido | Es normal en el plan gratuito |
| No llegan los correos | Faltan variables de EmailJS en Vercel | Agrégalas y vuelve a desplegar |

En EmailJS → **Account → Security** se pueden limitar los dominios permitidos a `localhost` y `fly-adventure.vercel.app`.
