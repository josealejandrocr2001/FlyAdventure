// Registro de clientes, inicio de sesión y perfil (RF016).
import bcrypt from 'bcryptjs';
import { consultar, conTransaccion } from '../config/db.js';
import { ROLES, firmarToken } from '../middlewares/auth.js';
import { HttpError, conflicto, noEncontrado } from '../utils/errores.js';
import {
  exigirCampos, validarContrasena, validarCorreo, validarDocumento,
  validarNombre, validarTelefono, validarTipoDocumento
} from '../utils/validacion.js';

const COSTO_BCRYPT = 10;

export const obtenerIdRol = async (nombreRol, conexion) => {
  const [rol] = await consultar('SELECT id_rol FROM rol WHERE nombre_rol = ?', [nombreRol], conexion);
  if (!rol) throw new Error(`El rol ${nombreRol} no existe en la tabla rol`);
  return rol.id_rol;
};

export const cifrarContrasena = (contrasena) => bcrypt.hash(contrasena, COSTO_BCRYPT);

const aUsuarioPublico = (fila) => ({
  idUsuario: fila.id_usuario,
  rol: fila.nombre_rol,
  tipoDocumento: fila.tipo_documento,
  numeroDocumento: fila.numero_documento,
  nombres: fila.nombres,
  apellidos: fila.apellidos,
  correo: fila.correo,
  telefono: fila.telefono
});

const SQL_USUARIO = `
  SELECT u.*, r.nombre_rol
  FROM usuario u
  JOIN rol r ON r.id_rol = u.id_rol`;

/**
 * Registro público: SIEMPRE crea una cuenta con rol Cliente, aunque el
 * cuerpo de la petición diga otra cosa. Administradores y pilotos solo los
 * crea un administrador (usuarios.service.js).
 *
 * Si el documento ya tiene reservas como invitado y el correo coincide,
 * la cuenta se enlaza a ese cliente y su historial aparece en "Mi cuenta".
 */
export const registrarCliente = async (cuerpo) => {
  exigirCampos(cuerpo, ['tipoDocumento', 'numeroDocumento', 'nombres', 'apellidos',
    'correo', 'telefono', 'contrasena']);

  if (cuerpo.autorizaDatos !== true) {
    throw new HttpError(400, 'Debe autorizar el tratamiento de datos personales (Ley 1581 de 2012)');
  }

  const datos = {
    tipoDocumento: validarTipoDocumento(cuerpo.tipoDocumento),
    numeroDocumento: validarDocumento(cuerpo.numeroDocumento),
    nombres: validarNombre(cuerpo.nombres, 'nombres'),
    apellidos: validarNombre(cuerpo.apellidos, 'apellidos'),
    correo: validarCorreo(cuerpo.correo),
    telefono: validarTelefono(cuerpo.telefono),
    contrasena: validarContrasena(cuerpo.contrasena)
  };

  const hash = await cifrarContrasena(datos.contrasena);

  const idUsuario = await conTransaccion(async (cx) => {
    const repetidos = await consultar(
      'SELECT correo, numero_documento FROM usuario WHERE correo = ? OR numero_documento = ?',
      [datos.correo, datos.numeroDocumento], cx
    );
    if (repetidos.some((u) => u.correo === datos.correo)) {
      throw conflicto('Ya existe una cuenta con ese correo');
    }
    if (repetidos.length > 0) throw conflicto('Ya existe una cuenta con ese número de documento');

    const [clienteExistente] = await consultar(
      'SELECT id_cliente, id_usuario, correo FROM cliente WHERE numero_documento = ? FOR UPDATE',
      [datos.numeroDocumento], cx
    );
    if (clienteExistente && clienteExistente.correo.toLowerCase() !== datos.correo) {
      throw conflicto('Ese documento ya tiene reservas con otro correo. Regístrese con el correo que usó al reservar o escríbanos por WhatsApp.');
    }

    const idRolCliente = await obtenerIdRol(ROLES.CLIENTE, cx);
    const resultado = await consultar(
      `INSERT INTO usuario
       (id_rol, tipo_documento, numero_documento, nombres, apellidos, correo, telefono, contrasena_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [idRolCliente, datos.tipoDocumento, datos.numeroDocumento, datos.nombres,
        datos.apellidos, datos.correo, datos.telefono, hash], cx
    );
    const nuevoId = resultado.insertId;

    if (clienteExistente) {
      // Reclama el historial que tenía como invitado
      await consultar(
        `UPDATE cliente SET id_usuario = ?, nombres = ?, apellidos = ?, telefono = ?
         WHERE id_cliente = ?`,
        [nuevoId, datos.nombres, datos.apellidos, datos.telefono, clienteExistente.id_cliente], cx
      );
    } else {
      await consultar(
        `INSERT INTO cliente
         (id_usuario, tipo_documento, numero_documento, nombres, apellidos, correo, telefono,
          autoriza_datos, fecha_autorizacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
        [nuevoId, datos.tipoDocumento, datos.numeroDocumento, datos.nombres,
          datos.apellidos, datos.correo, datos.telefono], cx
      );
    }
    return nuevoId;
  });

  return iniciarSesionPorId(idUsuario);
};

const iniciarSesionPorId = async (idUsuario) => {
  const [fila] = await consultar(`${SQL_USUARIO} WHERE u.id_usuario = ?`, [idUsuario]);
  const usuario = aUsuarioPublico(fila);
  return { token: firmarToken(usuario), usuario };
};

export const iniciarSesion = async (cuerpo) => {
  exigirCampos(cuerpo, ['correo', 'contrasena']);
  const correo = String(cuerpo.correo).trim().toLowerCase();

  const [fila] = await consultar(`${SQL_USUARIO} WHERE u.correo = ?`, [correo]);
  // Mismo mensaje si el correo no existe o la contraseña falla: no revela qué cuentas existen
  const valida = fila && await bcrypt.compare(String(cuerpo.contrasena), fila.contrasena_hash);
  if (!valida) throw new HttpError(401, 'Correo o contraseña incorrectos');
  if (!fila.activo) throw new HttpError(403, 'La cuenta está desactivada. Comuníquese con el administrador.');

  await consultar('UPDATE usuario SET ultimo_acceso = NOW() WHERE id_usuario = ?', [fila.id_usuario]);
  const usuario = aUsuarioPublico(fila);
  return { token: firmarToken(usuario), usuario };
};

export const obtenerPerfil = async (idUsuario) => {
  const [fila] = await consultar(`${SQL_USUARIO} WHERE u.id_usuario = ? AND u.activo = TRUE`, [idUsuario]);
  if (!fila) throw noEncontrado('La cuenta no existe o está desactivada');
  return aUsuarioPublico(fila);
};
