// Autenticación con JWT y control de acceso por rol (RF016, RNF002).
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/errores.js';

export const ROLES = Object.freeze({
  ADMINISTRADOR: 'Administrador',
  PILOTO: 'Piloto',
  CLIENTE: 'Cliente'
});

export const firmarToken = (usuario) => jwt.sign(
  { sub: usuario.idUsuario, rol: usuario.rol, nombre: usuario.nombres },
  env.jwt.secreto,
  { expiresIn: env.jwt.expiraEn }
);

const leerToken = (req) => {
  const encabezado = req.headers.authorization || '';
  const [tipo, token] = encabezado.split(' ');
  return tipo === 'Bearer' && token ? token : null;
};

const decodificar = (token) => {
  try {
    const datos = jwt.verify(token, env.jwt.secreto);
    return { idUsuario: Number(datos.sub), rol: datos.rol, nombre: datos.nombre };
  } catch {
    throw new HttpError(401, 'La sesión expiró o no es válida. Inicie sesión de nuevo.');
  }
};

/** Exige sesión iniciada. Deja los datos del usuario en req.usuario. */
export const autenticar = (req, _res, next) => {
  const token = leerToken(req);
  if (!token) throw new HttpError(401, 'Debe iniciar sesión');
  req.usuario = decodificar(token);
  next();
};

/** Si hay token lo lee; si no, continúa como invitado (req.usuario = null). */
export const autenticarOpcional = (req, _res, next) => {
  const token = leerToken(req);
  req.usuario = token ? decodificar(token) : null;
  next();
};

/** Permite el paso solo a los roles indicados. Úselo después de autenticar. */
export const autorizar = (...rolesPermitidos) => (req, _res, next) => {
  if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
    throw new HttpError(403, 'No tiene permisos para esta acción');
  }
  next();
};
