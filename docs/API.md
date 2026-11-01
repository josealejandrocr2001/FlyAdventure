# Referencia de la API — FlyAdventure

Base: `http://localhost:4000/api`. Todas las respuestas son JSON. Los errores tienen la forma `{ "error": "mensaje", "detalles": ... }`.

Autenticación: encabezado `Authorization: Bearer <token>` con el token que devuelve el login o el registro (dura 8 horas).

Leyenda de acceso: **Público** (sin token) · **Opcional** (con o sin token) · **Cliente** / **Piloto** / **Admin** (token con ese rol).

## Autenticación

| Método | Ruta | Acceso | Cuerpo / notas |
|---|---|---|---|
| POST | `/auth/registro` | Público | `tipoDocumento, numeroDocumento, nombres, apellidos, correo, telefono, contrasena, autorizaDatos: true`. Siempre crea rol **Cliente**. Si el documento ya reservó como invitado con el mismo correo, enlaza ese historial |
| POST | `/auth/login` | Público | `correo, contrasena` → `{ token, usuario }` |
| GET | `/auth/perfil` | Cualquier rol | Datos del usuario con sesión |

## Usuarios internos

| Método | Ruta | Acceso | Cuerpo / notas |
|---|---|---|---|
| GET | `/usuarios?rol=Piloto` | Admin | Lista; incluye datos de piloto |
| POST | `/usuarios` | Admin | `rol: 'Administrador' \| 'Piloto'`, datos personales, `contrasena`. Si es piloto: `piloto: { numeroLicencia, nivelCertificacion, fechaVencCertificacion, horasVuelo, pesoKg }` |
| PATCH | `/usuarios/:id/activo` | Admin | `{ activo: false }`. No puede desactivarse a sí mismo |

## Servicios de vuelo

| Método | Ruta | Acceso | Notas |
|---|---|---|---|
| GET | `/servicios` | Público | Solo visibles |
| GET | `/servicios/todos` | Admin | Incluye ocultos |
| POST / PUT | `/servicios`, `/servicios/:id` | Admin | `titulo, descripcion, precio, duracionMinutos, imagen, activo` |
| PATCH | `/servicios/:id/activo` | Admin | `{ activo }` |
| DELETE | `/servicios/:id` | Admin | 409 si tiene reservas: ocúltelo |

## Catálogos

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/catalogos/bloques` | Público |
| GET | `/catalogos/parametros` | Público |

## Reservas

| Método | Ruta | Acceso | Cuerpo / notas |
|---|---|---|---|
| GET | `/reservas/disponibilidad?fecha=AAAA-MM-DD` | Público | Cupos por bloque |
| POST | `/reservas` | Opcional | `idServicio, fecha, idBloque, peso, edad, observaciones, aceptaTerminos: true` + datos personales si **no** hay sesión de Cliente. Valida cupo, fecha, peso y edad (parámetros de operación). Devuelve el `codigo` |
| GET | `/reservas/consulta?codigo=&documento=` | Público | Pide ambos para que nadie consulte reservas ajenas |
| GET | `/reservas/mias` | Cliente | Historial de vuelos |
| GET | `/reservas?fecha=&estado=&idServicio=&busqueda=` | Admin | Listado del panel |
| GET | `/reservas/:id` · `/reservas/:id/historial` | Admin | Detalle y auditoría de estados |
| PUT | `/reservas/:id` | Admin | Reprogramar: `idServicio, fecha, idBloque` |
| PATCH | `/reservas/:id/estado` | Admin | `{ estado, medioPago?, comprobante?, observacion? }`. `Ejecutada` devuelve `tokenEncuesta` |

Transiciones permitidas: `Pendiente → Confirmada | Cancelada`, `Confirmada → Asignada | Ejecutada | Cancelada`, `Asignada → Ejecutada | Cancelada`. Desde otros módulos use `aplicarCambioEstado(cx, {...})` de `reservas.service.js`.

## Equipos de vuelo

| Método | Ruta | Acceso | Cuerpo / notas |
|---|---|---|---|
| GET | `/equipos?estado=Disponible` | Admin | Filtro opcional por estado |
| GET | `/equipos/:id` | Admin | — |
| POST / PUT | `/equipos`, `/equipos/:id` | Admin | `identificador, marca, modelo, tipo ('Biplaza' \| 'Monoplaza'), pesoMinimo, pesoMaximo, fechaUltimaRevision, fechaProximaRevision, estado` |
| PATCH | `/equipos/:id/estado` | Admin | `{ estado: 'Disponible' \| 'En mantenimiento' \| 'Fuera de servicio' }` |

## Pilotos

| Método | Ruta | Acceso | Cuerpo / notas |
|---|---|---|---|
| GET | `/pilotos` | Admin | Ficha de vuelo de todos los pilotos |
| GET / PUT | `/pilotos/:id` | Admin | `numeroLicencia, nivelCertificacion, fechaVencCertificacion, horasVuelo, pesoKg, disponible` |
| GET | `/pilotos/:id/disponibilidad?desde=` | Admin | Desde hoy si no se envía `desde` |
| POST | `/pilotos/:id/disponibilidad` | Admin | `{ fecha, idBloques: [1, 2] }`. No duplica bloques ya registrados |
| DELETE | `/pilotos/:id/disponibilidad/:idDisponibilidad` | Admin | — |
| GET | `/pilotos/agenda` | Piloto | Vuelos `Asignada` del piloto con sesión |
| POST | `/pilotos/agenda/:idReserva/resultado` | Piloto | `{ ejecutado, duracionRealMin, vientoDespegueKmh, motivoNoRealizado, observaciones }`. Ejecutado → `Ejecutada` + `tokenEncuesta`; no ejecutado → motivo obligatorio y `Cancelada`. 403 si el vuelo es de otro piloto |

## Asignaciones (motor de recomendación)

| Método | Ruta | Acceso | Cuerpo / notas |
|---|---|---|---|
| GET | `/asignaciones/recomendacion/:idReserva` | Admin | Solo reservas `Confirmada`. Devuelve las 3 mejores combinaciones piloto + equipo con `puntaje` (0 a 100) y `explicacion`, todas las combinaciones válidas y `motivo` si no hay ninguna |
| POST | `/asignaciones` | Admin | `{ idReserva, idPiloto, idEquipo, justificacion }`. Si no es la recomendación principal, la justificación es obligatoria. La reserva pasa a `Asignada` |

Reglas del motor: piloto activo, disponible, con certificación vigente a la fecha del vuelo, con disponibilidad en ese bloque y sin otro vuelo en el mismo bloque; equipo biplaza `Disponible`, con revisión vigente y libre en ese bloque; peso combinado (pasajero + piloto) dentro del rango del equipo. Puntaje: 50 por cercanía al centro del rango de peso, 30 por certificación (Instructor examinador 30, Instructor 22, Piloto biplaza 15) y 20 por horas de vuelo (máximo con 2000 horas).

## Encuestas

| Método | Ruta | Acceso | Cuerpo |
|---|---|---|---|
| GET | `/encuestas/:token` | Público | — |
| POST | `/encuestas/:token` | Público | `{ satisfaccion: 1..5, comentario }` |

## Códigos de estado

`200` bien · `201` creado · `204` eliminado · `400` datos inválidos · `401` sin sesión o token vencido · `403` rol sin permiso · `404` no existe · `409` conflicto (duplicado, sin cupo, transición inválida) · `503` MySQL apagado o mal configurado.
