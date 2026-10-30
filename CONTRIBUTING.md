# Cómo subir cambios a FlyAdventure

Somos tres trabajando a la vez sobre el mismo repositorio. Estas reglas evitan que el trabajo de una persona borre o rompa el de otra.

## Ramas

- `main` es la versión estable y la que publica Vercel. **Nadie hace push directo a `main`.**
- Cada tarea va en su propia rama, creada desde `main` actualizado:

```bash
git checkout main
git pull origin main
git checkout -b feature/HU013-asignacion-piloto
```

Nombres: `feature/HUxxx-descripcion-corta` para funcionalidades, `test/...` para pruebas, `docs/...` para documentación, `fix/...` para correcciones.

## Mientras trabajas

- Commits pequeños y con mensaje claro en español: `Agrega endpoint de equipos de vuelo`, no `cambios`.
- Antes de cada commit: `npm run lint` (raíz) sin errores.
- **Nunca** subas `server/.env`, `.env.local`, `node_modules` ni `dist`. Revisa `git status` antes de `git add`.
- Trae lo nuevo de `main` al menos una vez al día para que los conflictos sean pequeños:

```bash
git fetch origin
git merge origin/main
```

## Archivos compartidos (dónde suelen aparecer conflictos)

| Archivo | Regla |
|---|---|
| `server/src/app.js` | Agrega **una línea** `app.use(...)` por módulo, en el bloque marcado. No reordenes las demás |
| `src/App.jsx` | Agrega tus `<Route>` sin mover las existentes |
| `src/pages/AdminPanel.jsx` | Lo modifica **Joselin**. Si otra persona necesita algo ahí, lo coordina con ella |
| `src/pages/Booking.jsx` y `server/src/services/reservas.service.js` (función `crearReserva`) | Los modifica **Linay** (triage). Joselin solo **usa** `aplicarCambioEstado` y `asegurarEncuesta`, no los edita |
| `database/FlyAdventure_MySQL_v2.sql` | **No lo edites directamente.** Crea un archivo nuevo en `database/migraciones/` (ver abajo) |
| `package.json` / `package-lock.json` | Instala dependencias con `npm install paquete`, nunca edites el lock a mano. Si hay conflicto en el lock: acepta el de `main` y vuelve a correr `npm install` |

## Cambios en la base de datos

1. Crea `database/migraciones/NNN_descripcion.sql` (por ejemplo `002_equipos_estado_revision.sql`) con los `ALTER TABLE` / `INSERT` necesarios.
2. Pruébalo sobre tu base local recién creada con el script v2.
3. Avísale al equipo en el grupo: "corran la migración 002".
4. Jose integra las migraciones al script principal antes de cada entrega.

## Pull Request

1. `git push origin tu-rama`
2. En GitHub: *Compare & pull request* hacia `main`.
3. En la descripción: qué HU cubre, cómo probarlo y capturas si cambió la interfaz.
4. Revisión cruzada: Linay revisa los PR de Joselin, Joselin revisa los de Linay, Jose revisa todos y hace el *merge*.
5. Linay valida contra los criterios de aceptación de la tarjeta de Trello antes de aprobar.

## Si algo sale mal

- `git status` te dice en qué estado estás.
- Conflicto al hacer merge: VS Code muestra *Accept Current / Incoming / Both*. Si no estás segura de cuál dejar, **no adivines**: escribe en el grupo antes de hacer commit.
- Nunca uses `git push --force` sobre una rama que otra persona también usa.
