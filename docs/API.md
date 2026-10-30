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

## Encuestas

| Método | Ruta | Acceso | Cuerpo |
|---|---|---|---|
| GET | `/encuestas/:token` | Público | — |
| POST | `/encuestas/:token` | Público | `{ satisfaccion: 1..5, comentario }` |

## Códigos de estado

`200` bien · `201` creado · `204` eliminado · `400` datos inválidos · `401` sin sesión o token vencido · `403` rol sin permiso · `404` no existe · `409` conflicto (duplicado, sin cupo, transición inválida) · `503` MySQL apagado o mal configurado.
