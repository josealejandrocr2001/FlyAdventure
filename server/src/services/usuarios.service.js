// Gestión de cuentas internas: solo un Administrador crea administradores y pilotos.
import { consultar, conTransaccion } from '../config/db.js';
import { ROLES } from '../middlewares/auth.js';
import { HttpError, conflicto, noEncontrado, solicitudInvalida } from '../utils/errores.js';
import {
  exigirCampos, validarContrasena, validarCorreo, validarDocumento, validarEntero,
  validarFecha, validarNombre, validarNumero, validarTelefono, validarTipoDocumento, texto
} from '../utils/validacion.js';
import { cifrarContrasena, obtenerIdRol } from './auth.service.js';

const ROLES_CREABLES = [ROLES.ADMINISTRADOR, ROLES.PILOTO];
const NIVELES_PILOTO = ['Piloto biplaza', 'Instructor', 'Instructor examinador'];

const aUsuario = (f) => ({
  idUsuario: f.id_usuario,
  rol: f.nombre_rol,
  tipoDocumento: f.tipo_documento,
  numeroDocumento: f.numero_documento,
  nombres: f.nombres,
  apellidos: f.apellidos,
  correo: f.correo,
  telefono: f.telefono,
  activo: Boolean(f.activo),
  ultimoAcceso: f.ultimo_acceso,
  fechaRegistro: f.fecha_registro,
  piloto: f.id_piloto ? {
    idPiloto: f.id_piloto,
    numeroLicencia: f.numero_licencia,
    nivelCertificacion: f.nivel_certificacion,
    fechaVencCertificacion: f.fecha_venc_certificacion,
    horasVuelo: f.horas_vuelo,
    pesoKg: Number(f.peso_kg)
  } : null
});

export const listarUsuarios = async ({ rol } = {}) => {
  const filtros = [];
  const parametros = [];
  if (rol) {
    filtros.push('r.nombre_rol = ?');
    parametros.push(rol);
  }
  const filas = await consultar(
    `SELECT u.id_usuario, u.tipo_documento, u.numero_documento, u.nombres, u.apellidos,
            u.correo, u.telefono, u.activo, u.ultimo_acceso, u.fecha_registro, r.nombre_rol,
            p.id_piloto, p.numero_licencia, p.nivel_certificacion, p.fecha_venc_certificacion,
            p.horas_vuelo, p.peso_kg
     FROM usuario u
     JOIN rol r ON r.id_rol = u.id_rol
     LEFT JOIN piloto p ON p.id_usuario = u.id_usuario
     ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}
     ORDER BY r.nombre_rol, u.nombres`,
    parametros
  );
  return filas.map(aUsuario);
};

const validarDatosPiloto = (piloto) => {
  if (!piloto || typeof piloto !== 'object') {
    throw solicitudInvalida('Para crear un piloto envíe el objeto "piloto" con sus datos de certificación');
  }
  exigirCampos(piloto, ['numeroLicencia', 'nivelCertificacion', 'fechaVencCertificacion', 'pesoKg']);
  if (!NIVELES_PILOTO.includes(piloto.nivelCertificacion)) {
    throw solicitudInvalida(`Nivel de certificación inválido. Use: ${NIVELES_PILOTO.join(', ')}`);
  }
  return {
    numeroLicencia: texto(piloto.numeroLicencia).toUpperCase(),
    nivelCertificacion: piloto.nivelCertificacion,
    fechaVencCertificacion: validarFecha(piloto.fechaVencCertificacion, 'fechaVencCertificacion'),
    horasVuelo: validarEntero(piloto.horasVuelo ?? 0, 'horasVuelo', { min: 0, max: 100000 }),
    pesoKg: validarNumero(piloto.pesoKg, 'pesoKg', { min: 40, max: 150 })
  };
};

export const crearUsuario = async (cuerpo) => {
  exigirCampos(cuerpo, ['rol', 'tipoDocumento', 'numeroDocumento', 'nombres', 'apellidos',
    'correo', 'contrasena']);

  if (!ROLES_CREABLES.includes(cuerpo.rol)) {
    throw solicitudInvalida(`Desde el panel solo se crean cuentas de: ${ROLES_CREABLES.join(', ')}. Los clientes se registran solos.`);
  }

  const datos = {
    rol: cuerpo.rol,
    tipoDocumento: validarTipoDocumento(cuerpo.tipoDocumento),
    numeroDocumento: validarDocumento(cuerpo.numeroDocumento),
    nombres: validarNombre(cuerpo.nombres, 'nombres'),
    apellidos: validarNombre(cuerpo.apellidos, 'apellidos'),
    correo: validarCorreo(cuerpo.correo),
    telefono: cuerpo.telefono ? validarTelefono(cuerpo.telefono) : null,
    contrasena: validarContrasena(cuerpo.contrasena)
  };
  const piloto = datos.rol === ROLES.PILOTO ? validarDatosPiloto(cuerpo.piloto) : null;
  const hash = await cifrarContrasena(datos.contrasena);

  const idUsuario = await conTransaccion(async (cx) => {
    const idRol = await obtenerIdRol(datos.rol, cx);
    const resultado = await consultar(
      `INSERT INTO usuario
       (id_rol, tipo_documento, numero_documento, nombres, apellidos, correo, telefono, contrasena_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [idRol, datos.tipoDocumento, datos.numeroDocumento, datos.nombres, datos.apellidos,
        datos.correo, datos.telefono, hash], cx
    ).catch((error) => {
      if (error.code === 'ER_DUP_ENTRY') throw conflicto('Ya existe una cuenta con ese correo o documento');
      throw error;
    });

    if (piloto) {
      await consultar(
        `INSERT INTO piloto
         (id_usuario, numero_licencia, nivel_certificacion, fecha_venc_certificacion, horas_vuelo, peso_kg)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [resultado.insertId, piloto.numeroLicencia, piloto.nivelCertificacion,
          piloto.fechaVencCertificacion, piloto.horasVuelo, piloto.pesoKg], cx
      ).catch((error) => {
        if (error.code === 'ER_DUP_ENTRY') throw conflicto('Ya existe un piloto con ese número de licencia');
        throw error;
      });
    }
    return resultado.insertId;
  });

  const [creado] = (await listarUsuarios()).filter((u) => u.idUsuario === idUsuario);
  return creado;
};

export const cambiarEstadoUsuario = async (idUsuario, activo, idAdministrador) => {
  if (typeof activo !== 'boolean') throw solicitudInvalida('El campo "activo" debe ser true o false');
  if (idUsuario === idAdministrador && !activo) {
    throw new HttpError(400, 'No puede desactivar su propia cuenta');
  }
  const resultado = await consultar('UPDATE usuario SET activo = ? WHERE id_usuario = ?', [activo, idUsuario]);
  if (resultado.affectedRows === 0) throw noEncontrado('El usuario no existe');
  return { idUsuario, activo };
};
