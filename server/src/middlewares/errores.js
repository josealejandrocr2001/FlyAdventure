// Manejo centralizado de errores: toda respuesta de error tiene la forma
// { "error": "mensaje", "detalles": ... }
import { HttpError } from '../utils/errores.js';

export const rutaNoEncontrada = (req, _res, next) => {
  next(new HttpError(404, `No existe la ruta ${req.method} ${req.originalUrl}`));
};

// Traduce los errores de integridad de MySQL a respuestas HTTP entendibles.
const ERRORES_MYSQL = {
  ER_DUP_ENTRY: [409, 'Ya existe un registro con esos datos'],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, 'Los datos no cumplen las reglas del negocio'],
  ER_ROW_IS_REFERENCED_2: [409, 'No se puede eliminar: hay registros que dependen de este'],
  ER_NO_REFERENCED_ROW_2: [400, 'Se hace referencia a un registro que no existe'],
  ECONNREFUSED: [503, 'No hay conexión con la base de datos. ¿Está encendido MySQL?'],
  ER_ACCESS_DENIED_ERROR: [503, 'MySQL rechazó el usuario o la contraseña de server/.env'],
  ER_BAD_DB_ERROR: [503, 'La base de datos no existe. Ejecute database/FlyAdventure_MySQL_v2.sql']
};

export const manejadorErrores = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.estado).json({ error: error.message, detalles: error.detalles });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }

  const conocido = ERRORES_MYSQL[error.code];
  if (conocido) {
    const [estado, mensaje] = conocido;
    if (estado >= 500) console.error(error);
    return res.status(estado).json({ error: mensaje });
  }

  console.error(error);
  return res.status(500).json({ error: 'Error interno del servidor' });
};
