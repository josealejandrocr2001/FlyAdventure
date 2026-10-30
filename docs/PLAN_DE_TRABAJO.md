# Plan de trabajo — Etapa de desarrollo

Este documento es el punto de partida para Jose, Joselin y Linay. Explica qué cambió, qué ya está hecho y qué le toca a cada una, con el detalle suficiente para trabajar sin esperar a nadie.

## 1. Qué cambió frente a lo que veníamos haciendo

| Antes | Ahora | Por qué |
|---|---|---|
| Firebase (Firestore + Auth) desde el navegador | **MySQL local + API propia en Node.js/Express** | Decisión del equipo y del curso: modelo relacional y backend propio |
| Sin backend: el navegador escribía directo en la base | Todo pasa por la API (`server/`) | Las credenciales y las reglas del negocio no pueden vivir en el navegador |
| Solo había login de administrador (cualquier cuenta entraba a todo) | **Roles: Administrador, Piloto y Cliente** con JWT + BCrypt | Lo pidió el profesor |
| El cliente no podía registrarse | **El cliente puede registrarse (opcional)** y ve su historial de vuelos en "Mi cuenta" | Lo pidió el profesor. Registrarse **no** es obligatorio para reservar |
| Pasarela Mercado Pago (planeada) | **Se descarta**: el pago sigue por WhatsApp y el administrador lo confirma en el panel | Decisión del equipo |
| Rol Operador | **Eliminado**. Solo un Administrador crea administradores y pilotos | Simplifica el alcance |

## 2. Lo que ya está hecho (Fase 0 — Jose)

Rama `feature/base-mysql-backend`. Es la base sobre la que trabajan las demás.

- `database/FlyAdventure_MySQL_v2.sql`: modelo v2 (rol Cliente, `cliente.id_usuario`, pagos sin pasarela, bloques de 30 min con 5 cupos, usuarios de prueba con contraseña real).
- `server/`: API con conexión a MySQL, manejo de errores, validaciones, JWT, BCrypt y `autorizar(rol)`.
- Módulos de la API: autenticación y registro de cliente, usuarios internos (solo admin), servicios, catálogos, reservas (disponibilidad, creación como invitado o con cuenta, consulta por código, historial, reprogramación, cambios de estado con auditoría, confirmación del pago) y encuestas con token.
- Frontend sin Firebase: `api.js`, `AuthProvider`/`useAuth`, `RutaProtegida` por rol, login único, registro, "Mi cuenta" con historial, consulta de reserva por código, reserva conectada a la API, panel de administrador conectado a la API con la nueva vista **Usuarios** (crear administradores y pilotos).
- Atributos `data-cy` en los formularios principales para las pruebas con Cypress.
- `README.md`, `CONTRIBUTING.md` y `docs/API.md`.

**Pendiente de Jose (en paralelo con ustedes):** documento PPI v2, diagramas (casos de uso, clases, entidad-relación), Proyección de Desarrollo, ajuste de las HU en Trello, revisión y merge de los PR, presentación.

## 3. Orden: ¿consecutivo o simultáneo?

```
Fase 0 (Jose)  ──► merge a main ──┬──► Joselin: operación del vuelo ─────────┐
                                  │                                          ├──► Fase 3: integración, pruebas de regresión, entrega
Linay: plan de pruebas y          └──► Linay: triage, encuesta, Cypress ─────┘
estimación (empieza YA, no
depende del código)
```

- **Consecutivo solo al inicio:** nadie toca código hasta que la rama de Jose esté en `main`. Así todas parten de la misma base.
- **Después, simultáneo:** Joselin y Linay trabajan a la vez porque tocan archivos distintos (ver `CONTRIBUTING.md`, tabla de archivos compartidos).
- **Linay puede empezar hoy** con el Plan de Pruebas y la Estimación de Tiempos: no dependen del código.

## 4. Primer día (las dos)

1. Instalar Node.js 22 LTS, MySQL 8.4 y MySQL Workbench.
2. `git clone https://github.com/josealejandrocr2001/FlyAdventure.git` (o `git pull` si ya lo tienen) y `git checkout main`.
3. Seguir el `README.md` secciones 2 a 4: crear la base con el script v2, configurar `server/.env`, levantar API y frontend.
4. Probar con los usuarios de prueba: reservar como invitado, registrarse, ver "Mi cuenta", entrar como administrador, confirmar un pago, marcar un vuelo como ejecutado y responder la encuesta.
5. Leer `CONTRIBUTING.md` antes del primer commit.

---

## 5. Joselin — Operación del vuelo (RF011, RF012, RF013, RF014)

**Objetivo:** que el administrador registre pilotos y equipos, asigne piloto + equipo a cada reserva confirmada con una recomendación del sistema, y que el piloto vea su agenda y registre el resultado del vuelo.

**HU de Trello:** HU012, HU013, HU017, HU018.

### 5.1 Backend (en `server/src/`)

Siga el patrón de `servicios.routes.js` + `servicios.service.js`: la ruta recibe la petición, el servicio valida y hace el SQL.

| Archivo nuevo | Endpoints | Notas |
|---|---|---|
| `routes/equipos.routes.js` + `services/equipos.service.js` | `GET/POST/PUT /api/equipos`, `PATCH /api/equipos/:id/estado` | Tabla `equipo_vuelo`. Estados: Disponible, En mantenimiento, Fuera de servicio. Solo Admin |
| `routes/pilotos.routes.js` + `services/pilotos.service.js` | `GET /api/pilotos`, `PUT /api/pilotos/:id` (certificación, horas, peso), `GET/POST/DELETE /api/pilotos/:id/disponibilidad` | Crear el **usuario** del piloto ya existe (`POST /api/usuarios`); aquí se edita su ficha y su disponibilidad (`disponibilidad_piloto`) |
| `routes/asignaciones.routes.js` + `services/asignaciones.service.js` | `GET /api/asignaciones/recomendacion/:idReserva`, `POST /api/asignaciones` | Ver 5.2 |
| (en `pilotos.routes.js`) | `GET /api/pilotos/agenda` (rol **Piloto**), `POST /api/pilotos/agenda/:idReserva/resultado` | Ver 5.3 |

Registre cada archivo de rutas en `app.js` con **una línea** en el bloque marcado.

### 5.2 Motor de recomendación piloto-equipo (RF013)

Es un **motor de reglas** (la "IA" de la decisión de seguridad), no un modelo de lenguaje. Para una reserva `Confirmada`:

1. Candidatos piloto: `piloto.disponible = TRUE`, usuario activo, `fecha_venc_certificacion >= fecha_vuelo`, con fila en `disponibilidad_piloto` para esa fecha y bloque, y sin otra asignación en ese mismo bloque y fecha.
2. Candidatos equipo: `estado = 'Disponible'`, `fecha_proxima_revision >= fecha_vuelo`, sin otra asignación en ese bloque y fecha.
3. Peso combinado = `peso_pasajero + peso_kg del piloto`; el equipo sirve si queda entre `peso_minimo` y `peso_maximo`.
4. Puntaje 0-100 (sugerencia): 50 por quedar en el centro del rango de peso del equipo, 30 por nivel de certificación (Instructor examinador > Instructor > Piloto biplaza), 20 por horas de vuelo. Devuelva las 3 mejores combinaciones con una `explicacion` en texto.
5. `POST /api/asignaciones` recibe `idReserva, idPiloto, idEquipo, recomendadaIa, justificacion`. Si `recomendadaIa` es `false`, la justificación es obligatoria (la base ya lo exige con `ck_asignacion_justificacion`).

Haga todo dentro de `conTransaccion` y cambie el estado con la función que ya existe:

```js
import { aplicarCambioEstado } from './reservas.service.js';
await aplicarCambioEstado(cx, { idReserva, estadoActual: 'Confirmada', nuevoEstado: 'Asignada', idUsuario: req.usuario.idUsuario, observacion: 'Asignación aprobada' });
```

### 5.3 Agenda y resultado del vuelo (RF014)

- `GET /api/pilotos/agenda`: reservas `Asignada` del piloto con sesión (busque su `id_piloto` por `req.usuario.idUsuario`), con nombre, peso, edad y **observaciones** del pasajero.
- `POST .../resultado`: inserta en `resultado_vuelo` (`ejecutado`, `duracionRealMin`, `vientoDespegueKmh`, `motivoNoRealizado`, `observaciones`). Si `ejecutado` es `true` → `aplicarCambioEstado(... 'Ejecutada')` y `asegurarEncuesta(cx, idReserva)` (devuelve el token para el correo). Si es `false` → el motivo es obligatorio y la reserva pasa a `Cancelada`.
- Valide que la reserva le pertenezca al piloto con sesión: un piloto no puede registrar vuelos de otro (403).

### 5.4 Frontend

- `src/pages/PanelPiloto.jsx`: hoy es un marcador; conviértalo en la agenda con el formulario de resultado.
- `src/pages/AdminPanel.jsx`: nuevas vistas **Pilotos** (ficha + disponibilidad) y **Equipos**; en Gestión de Reservas, botón "Asignar" en las reservas `Confirmada` que abra un modal con las recomendaciones.
- Cree `src/services/pilotosApi.js`, `equiposApi.js` y `asignacionesApi.js` siguiendo `usuariosApi.js`.
- Ponga `data-cy` en botones y campos nuevos para que Linay los pruebe.

### 5.5 Terminado significa

- Los criterios de aceptación de HU012, HU013, HU017 y HU018 se cumplen en local.
- Un piloto no ve el panel de administrador ni la agenda de otro piloto (probado con Postman o Thunder Client).
- `npm run lint` y `npm run build` sin errores.
- PR revisado por Linay.

**Si queda tiempo:** RF018 (consultar los datos del panel en lenguaje natural).

---

## 6. Linay — Calidad y experiencia del cliente (RF005, RF020 y pruebas)

**Objetivo:** documentar y ejecutar las pruebas del proyecto (incluida una automatizada con Cypress) y completar el triage de aptitud y la encuesta con análisis de sentimiento.

**HU de Trello:** HU004, HU015 y la validación de todas.

### 6.1 Documentos de pruebas (empezar ya)

Jose deja un borrador de los dos formatos del profesor en la carpeta *Documentación FlyAdventure*: `Plan de Pruebas FlyAdventure (borrador).docx` y `Estimación de Tiempos FlyAdventure (borrador).xlsx`. Linay los revisa, ajusta las horas a lo real y los completa con:

- **Casos de prueba**: una matriz (Excel o en el mismo plan) por HU con camino exitoso y caminos alternos. Ejemplo para el login: correo y contraseña correctos; contraseña incorrecta; correo inexistente; campos vacíos; cuenta desactivada.
- **Evidencias**: capturas o video por caso ejecutado y el resultado (pasó / falló / bloqueado).
- **Reporte de defectos**: en Trello o en una hoja, con pasos para reproducir.

### 6.2 Prueba automatizada con Cypress (flujo E2E del profesor)

El flujo pedido: **registro → login → funcionalidad principal (reserva) → validación del backend**.

```bash
npm install --save-dev cypress
npx cypress open        # la primera vez crea la carpeta cypress/
```

`cypress.config.js` en la raíz:

```js
import { defineConfig } from 'cypress';
export default defineConfig({
  e2e: { baseUrl: 'http://localhost:5173', specPattern: 'cypress/e2e/**/*.cy.js' }
});
```

Agregue en `package.json` los scripts `"cy:open": "cypress open"` y `"cy:run": "cypress run"`.

Esqueleto de `cypress/e2e/flujo-cliente.cy.js`:

```js
describe('Flujo E2E del cliente', () => {
  const id = Date.now();                       // datos únicos en cada corrida
  const correo = `qa${id}@correo.com`;
  const fecha = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);

  it('se registra, inicia sesión, reserva y el backend lo valida', () => {
    cy.visit('/registro');
    cy.get('[data-cy=reg-documento]').type(String(id).slice(-10));
    cy.get('[data-cy=reg-nombres]').type('Prueba');
    cy.get('[data-cy=reg-apellidos]').type('Cypress');
    cy.get('[data-cy=reg-correo]').type(correo);
    cy.get('[data-cy=reg-telefono]').type('3001234567');
    cy.get('[data-cy=reg-contrasena]').type('Prueba2026');
    cy.get('[data-cy=reg-confirmar]').type('Prueba2026');
    cy.get('[data-cy=reg-autoriza]').check();
    cy.get('[data-cy=reg-enviar]').click();
    cy.url().should('include', '/mi-cuenta');

    cy.get('[data-cy=btn-cerrar-sesion]').click();
    cy.visit('/login');
    cy.get('[data-cy=login-correo]').type(correo);
    cy.get('[data-cy=login-contrasena]').type('Prueba2026');
    cy.get('[data-cy=login-enviar]').click();
    cy.url().should('include', '/mi-cuenta');

    cy.visit('/reservar');
    cy.get('[data-cy=res-servicio]').select(1);
    cy.get('[data-cy=res-fecha]').type(fecha);
    cy.get('[data-cy=res-hora] option').should('have.length.greaterThan', 1);
    cy.get('[data-cy=res-hora]').select(1);
    cy.get('[data-cy=res-peso]').type('70');
    cy.get('[data-cy=res-edad]').type('30');
    cy.get('[data-cy=res-acepta]').check();
    cy.intercept('POST', '**/api/reservas').as('crearReserva');
    cy.get('[data-cy=res-enviar]').click();

    // Validación del backend: la API respondió 201 y devolvió el código
    cy.wait('@crearReserva').its('response.statusCode').should('eq', 201);
    cy.get('[data-cy=codigo-reserva]').should('contain', 'FA-');

    cy.visit('/mi-cuenta');
    cy.get('[data-cy=tabla-historial]').should('contain', 'Pendiente');
  });

  it('el backend rechaza un peso por encima del máximo', () => {
    cy.request({
      method: 'POST', url: 'http://localhost:4000/api/reservas', failOnStatusCode: false,
      body: { tipoDocumento: 'CC', numeroDocumento: '99887766', nombres: 'Peso', apellidos: 'Alto',
        correo: 'peso@correo.com', telefono: '3001234567', idServicio: 1, fecha, idBloque: 1,
        peso: 140, edad: 30, aceptaTerminos: true }
    }).its('status').should('eq', 400);
  });
});
```

Ideas para más casos: login con contraseña incorrecta (`[data-cy=login-error]`), registro duplicado (409), un cliente que intenta abrir `/admin-panel` (lo redirige), bloque lleno (409), consulta por código con documento ajeno (404). Necesita la API y Vite corriendo antes de `npm run cy:run`.

### 6.3 Triage de aptitud del pasajero (RF005, HU004)

- Base de datos: ya existen `condicion_salud` (catálogo con efecto Informativa / Precaución / Excluyente), `declaracion_aptitud` y `declaracion_condicion`.
- Backend: `GET /api/catalogos/condiciones` y, dentro de `crearReserva` (en `reservas.service.js`), recibir `condiciones: [ids]`, calcular el nivel (`Apto`, `Apto con precaución`, `No apto`) e insertar la declaración en la **misma transacción**. Si alguna es Excluyente → responder 400 y no crear la reserva.
- Frontend: en `Booking.jsx`, casillas de verificación con las condiciones (además del campo de observaciones).

### 6.4 Encuesta con análisis de sentimiento (RF020, HU015)

- `Encuesta.jsx`: cambiar 👍/👎 por una escala de 1 a 5 estrellas (la API ya acepta 1..5).
- Backend: `services/ia.service.js` con una función `analizarSentimiento(comentario)` que llame a la API del modelo de lenguaje con la llave en `server/.env` (`IA_API_KEY`, nunca en el frontend). Guardar `sentimiento` (Positivo/Neutro/Negativo) y `tema` en `encuesta` al responder.
- **Si la IA falla o no hay llave**, la encuesta se guarda igual sin sentimiento (RNF006, operación degradada). Pruébelo.

### 6.5 Terminado significa

- Plan de Pruebas y Estimación completos y en la carpeta de documentación.
- `npm run cy:run` pasa en local, con video o capturas como evidencia.
- Criterios de HU004 y HU015 cumplidos.
- PR revisado por Joselin.

**Si queda tiempo:** RF007 (asistente conversacional de reservas).

---

## 7. Referencias rápidas

- Endpoints: `docs/API.md`.
- Modelo de datos: `database/FlyAdventure_MySQL_v2.sql` (los comentarios explican cada tabla).
- Requisitos: *Documentación FlyAdventure / Proyecto PPI FlyAdventure (v2 desarrollo).docx*.
- Historias de usuario: Trello, "My Trello board".
- Dudas de alcance: Jose. Dudas de código base (API, auth, MySQL): Jose. Dudas de pruebas: Linay.
