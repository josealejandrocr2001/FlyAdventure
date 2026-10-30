# FlyAdventure

Plataforma web de reservas de vuelos en parapente para un operador de San Félix (Bello, Antioquia). Proyecto de Aula, Ingeniería de Software, Tecnológico de Antioquia, 2026. Equipo 5: Jose Alejandro Colorado (Analista y Líder), Joselin Lisboa (Desarrolladora), Linay Muñoz (QA).

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8 + React Router 7 (carpeta raíz, `src/`) |
| Backend | Node.js 22 LTS + Express 5, API REST con JSON (carpeta `server/`) |
| Base de datos | MySQL 8.4 LTS, administrada con MySQL Workbench (carpeta `database/`) |
| Seguridad | JWT, BCrypt y control de acceso por rol (Administrador, Piloto, Cliente) |
| Notificaciones | EmailJS · Pago acordado por WhatsApp |
| Clima | API de Open-Meteo |
| Despliegue | Vercel (frontend). Vite es la herramienta de construcción, no el servidor. |

> **¿Vas a trabajar en el proyecto?** Lee primero [`docs/PLAN_DE_TRABAJO.md`](docs/PLAN_DE_TRABAJO.md) (qué hace cada quien) y [`CONTRIBUTING.md`](CONTRIBUTING.md) (cómo subir tus cambios sin dañar los de los demás).

---

## 1. Requisitos

- **Node.js 22 LTS** (`node -v` debe mostrar v22 o superior).
- **MySQL 8.4 LTS** y **MySQL Workbench** instalados en tu equipo.
- **Git** y acceso al repositorio.

Cada integrante trabaja con **su propio MySQL local**. Lo que se comparte por GitHub es el **script** de la base de datos, no los datos.

## 2. Crear la base de datos

1. Abre MySQL Workbench y conéctate a tu instancia local (normalmente `root@localhost:3306`).
2. *File → Open SQL Script…* → `database/FlyAdventure_MySQL_v2.sql`.
3. Ejecuta todo el script (rayo ⚡ sin seleccionar nada).

El script **borra y vuelve a crear** la base `flyadventure` con datos de prueba. Úsalo también cuando alguien cambie el modelo de datos: tus datos locales de prueba se pierden, pero quedas igual que el resto del equipo.

**Usuarios de prueba** (contraseña de todos: `FlyAdventure2026*`, solo para el ambiente local):

| Rol | Correo |
|---|---|
| Administrador | `admin@flyadventure.com` |
| Administrador | `santiago.admin@flyadventure.com` |
| Piloto | `mateo.piloto@flyadventure.com`, `valeria.piloto@flyadventure.com` |
| Cliente con cuenta | `ana@correo.com` |

## 3. Levantar el backend (API)

```bash
cd server
npm install
copy .env.example .env      # en macOS/Linux: cp .env.example .env
```

Abre `server/.env` y pon tu contraseña de MySQL en `DB_PASSWORD` y una cadena larga en `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```bash
npm run dev
```

Debes ver `✔ Conectado a MySQL` y `✔ API de FlyAdventure en http://localhost:4000/api`. Prueba `http://localhost:4000/api/salud` en el navegador.

## 4. Levantar el frontend

En **otra** terminal, desde la raíz del repositorio:

```bash
npm install
copy .env.example .env.local   # pide a Jose los valores de EmailJS
npm run dev
```

Abre `http://localhost:5173`. Necesitas las **dos** terminales abiertas: la API (puerto 4000) y Vite (puerto 5173).

## 5. Scripts

| Dónde | Comando | Qué hace |
|---|---|---|
| raíz | `npm run dev` | Frontend con recarga en caliente |
| raíz | `npm run build` | Construye el frontend en `dist/` (lo que publica Vercel) |
| raíz | `npm run lint` | Revisa frontend **y** backend con ESLint. Córrelo antes de cada commit |
| `server/` | `npm run dev` | API con reinicio automático al guardar |
| `server/` | `npm run hash -- "Clave123"` | Genera un hash BCrypt para insertar un usuario a mano |

## 6. Estructura

```
FlyAdventure/
├── database/
│   └── FlyAdventure_MySQL_v2.sql   Modelo completo + datos de prueba
├── server/                          API REST (Node.js + Express)
│   └── src/
│       ├── app.js                   Registro de rutas
│       ├── config/                  Variables de entorno y pool de MySQL
│       ├── middlewares/             JWT, roles y manejo de errores
│       ├── routes/                  Un archivo por módulo: solo HTTP
│       ├── services/                Un archivo por módulo: reglas y SQL
│       └── utils/                   Validaciones y errores HTTP
├── src/                             Frontend (React)
│   ├── context/                     Sesión (AuthProvider, useAuth)
│   ├── components/                  Header, Footer, RutaProtegida…
│   ├── pages/                       Una página por ruta
│   └── services/                    Llamadas a la API (api.js) y a servicios externos
└── docs/                            Plan de trabajo y referencia de la API
```

**Reglas de la casa**

- El frontend **nunca** habla con MySQL: todo pasa por la API (`src/services/api.js`).
- Toda consulta SQL usa parámetros `?`. Nunca concatenes valores en el SQL.
- Las rutas (`routes/`) solo reciben la petición y responden; las reglas van en `services/`.
- La protección de pantallas en React (`RutaProtegida`) es comodidad; la seguridad real es `autenticar` + `autorizar(...)` en la API.
- Ninguna credencial va en el código: `server/.env` y `.env.local` no se suben a GitHub.

La referencia de endpoints está en [`docs/API.md`](docs/API.md).

## 7. Roles

| Rol | Cómo se crea | Qué puede hacer |
|---|---|---|
| Cliente | Se registra solo en `/registro` (opcional) | Ver su historial de vuelos en `/mi-cuenta`. Reservar con sus datos precargados |
| Invitado | No tiene cuenta | Reservar y consultar su reserva con código + documento en `/mi-reserva` |
| Piloto | Lo crea un administrador | Ver su agenda en `/piloto` |
| Administrador | Lo crea otro administrador | Todo el panel `/admin-panel`, incluida la creación de administradores y pilotos |

## 8. Despliegue

Vercel publica el frontend desde `main`. **La API y MySQL corren en el equipo local**, así que la versión publicada en Vercel no tiene datos hasta que la API y la base se publiquen en un servidor con acceso desde internet; mientras tanto, la demostración se hace en local.
