// Pilotos: ficha, disponibilidad, agenda y resultado del vuelo (RF012, RF014, HU012, HU017, HU018).
// El usuario del piloto se crea en usuarios.service.js; aquí se edita su ficha de vuelo.
import { conTransaccion, consultar } from '../config/db.js';
import { HttpError, conflicto, noEncontrado, solicitudInvalida } from '../utils/errores.js';
import {
  exigirCampos, hoyEnColombia, texto, validarEntero, validarFecha, validarNumero
} from '../utils/validacion.js';
import { ESTADOS, aplicarCambioEstado, asegurarEncuesta } from './reservas.service.js';

export const NIVELES_PILOTO = ['Piloto biplaza', 'Instructor', 'Instructor examinador'];

const SQL_PILOTO = `
  SELECT p.id_piloto, p.id_usuario, p.numero_licencia, p.nivel_certificacion,
         p.fecha_venc_certificacion, p.horas_vuelo, p.peso_kg, p.disponible,
         u.nombres, u.apellidos, u.correo, u.telefono, u.activo
  FROM piloto p
  JOIN usuario u ON u.id_usuario = p.id_usuario`;

const aPiloto = (f) => ({
  id: f.id_piloto,
  idUsuario: f.id_usuario,
  nombres: f.nombres,
  apellidos: f.apellidos,
  nombreCompleto: `${f.nombres} ${f.apellidos}`,
  correo: f.correo,
  telefono: f.telefono,
  activo: Boolean(f.activo),
  numeroLicencia: f.numero_licencia,
  nivelCertificacion: f.nivel_certificacion,
  fechaVencCertificacion: f.fecha_venc_certificacion,
  horasVuelo: f.horas_vuelo,
  pesoKg: Number(f.peso_kg),
  disponible: Boolean(f.disponible)
});

// ---------------------------------------------------------------------------
// Ficha del piloto (solo Administrador)
// ---------------------------------------------------------------------------

export const listarPilotos = async () => {
  const filas = await consultar(`${SQL_PILOTO} ORDER BY u.nombres, u.apellidos`);
  return filas.map(aPiloto);
};

export const obtenerPiloto = async (idPiloto, cx) => {
  const [fila] = await consultar(`${SQL_PILOTO} WHERE p.id_piloto = ?`, [idPiloto], cx);
  if (!fila) throw noEncontrado('El piloto no existe');
  return aPiloto(fila);
};

/** Edita certificación, horas, peso y si está disponible para volar. */
export const actualizarPiloto = async (idPiloto, cuerpo) => {
  await obtenerPiloto(idPiloto);
  exigirCampos(cuerpo, ['numeroLicencia', 'nivelCertificacion', 'fechaVencCertificacion', 'pesoKg']);
  if (!NIVELES_PILOTO.includes(cuerpo.nivelCertificacion)) {
    throw solicitudInvalida(`Nivel de certificación inválido. Use: ${NIVELES_PILOTO.join(', ')}`);
  }
  const datos = {
    numeroLicencia: texto(cuerpo.numeroLicencia).toUpperCase().slice(0, 20),
    nivelCertificacion: cuerpo.nivelCertificacion,
    fechaVencCertificacion: validarFecha(cuerpo.fechaVencCertificacion, 'fechaVencCertificacion'),
    horasVuelo: validarEntero(cuerpo.horasVuelo ?? 0, 'horasVuelo', { min: 0, max: 100000 }),
    pesoKg: validarNumero(cuerpo.pesoKg, 'pesoKg', { min: 40, max: 150 }),
    disponible: cuerpo.disponible === undefined ? true : Boolean(cuerpo.disponible)
  };
  try {
    await consultar(
      `UPDATE piloto
       SET numero_licencia = ?, nivel_certificacion = ?, fecha_venc_certificacion = ?,
           horas_vuelo = ?, peso_kg = ?, disponible = ?
       WHERE id_piloto = ?`,
      [datos.numeroLicencia, datos.nivelCertificacion, datos.fechaVencCertificacion,
        datos.horasVuelo, datos.pesoKg, datos.disponible, idPiloto]
    );
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw conflicto('Ya existe un piloto con ese número de licencia');
    throw error;
  }
  return obtenerPiloto(idPiloto);
};

// ---------------------------------------------------------------------------
// Disponibilidad por fecha y bloque horario (solo Administrador)
// ---------------------------------------------------------------------------

/** Disponibilidad desde hoy en adelante (o desde la fecha indicada). */
export const listarDisponibilidad = async (idPiloto, { desde } = {}) => {
  await obtenerPiloto(idPiloto);
  const fechaDesde = desde ? validarFecha(desde, 'desde') : hoyEnColombia();
  const filas = await consultar(
    `SELECT d.id_disponibilidad, d.fecha, d.id_bloque,
            TIME_FORMAT(b.hora_inicio, '%H:%i') AS hora_inicio,
            TIME_FORMAT(b.hora_fin, '%H:%i') AS hora_fin
     FROM disponibilidad_piloto d
     JOIN bloque_horario b ON b.id_bloque = d.id_bloque
     WHERE d.id_piloto = ? AND d.fecha >= ?
     ORDER BY d.fecha, b.hora_inicio`,
    [idPiloto, fechaDesde]
  );
  return filas.map((f) => ({
    id: f.id_disponibilidad,
    fecha: f.fecha,
    idBloque: f.id_bloque,
    horaInicio: f.hora_inicio,
    horaFin: f.hora_fin
  }));
};

/**
 * Registra la disponibilidad de un piloto en una fecha.
 * Cuerpo: { fecha: 'AAAA-MM-DD', idBloques: [1, 2, 3] }  (o idBloque: 1)
 * Si un bloque ya estaba registrado, no lo duplica.
 */
export const agregarDisponibilidad = async (idPiloto, cuerpo) => {
  await obtenerPiloto(idPiloto);
  exigirCampos(cuerpo, ['fecha']);
  const fecha = validarFecha(cuerpo.fecha);
  if (fecha < hoyEnColombia()) throw solicitudInvalida('No se puede registrar disponibilidad en fechas pasadas');

  const lista = Array.isArray(cuerpo.idBloques) ? cuerpo.idBloques : [cuerpo.idBloque];
  const bloques = [...new Set(lista.filter((b) => b !== undefined && b !== null && b !== '')
    .map((b) => validarEntero(b, 'idBloque', { min: 1, max: 1000 })))];
  if (bloques.length === 0) throw solicitudInvalida('Seleccione al menos un bloque horario');

  const existentes = await consultar(
    `SELECT id_bloque FROM bloque_horario WHERE activo = TRUE AND id_bloque IN (${bloques.map(() => '?').join(', ')})`,
    bloques
  );
  if (existentes.length !== bloques.length) throw solicitudInvalida('Uno de los bloques horarios no existe');

  await conTransaccion(async (cx) => {
    for (const idBloque of bloques) {
      await consultar(
        `INSERT INTO disponibilidad_piloto (id_piloto, id_bloque, fecha) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE id_disponibilidad = id_disponibilidad`,
        [idPiloto, idBloque, fecha], cx
      );
    }
  });
  return listarDisponibilidad(idPiloto);
};

export const eliminarDisponibilidad = async (idPiloto, idDisponibilidad) => {
  const resultado = await consultar(
    'DELETE FROM disponibilidad_piloto WHERE id_disponibilidad = ? AND id_piloto = ?',
    [idDisponibilidad, idPiloto]
  );
  if (resultado.affectedRows === 0) throw noEncontrado('La disponibilidad no existe');
};

// ---------------------------------------------------------------------------
// Agenda y resultado del vuelo (rol Piloto)
// ---------------------------------------------------------------------------

const idPilotoDeUsuario = async (idUsuario, cx) => {
  const [fila] = await consultar('SELECT id_piloto FROM piloto WHERE id_usuario = ?', [idUsuario], cx);
  if (!fila) throw new HttpError(403, 'Su cuenta no tiene ficha de piloto');
  return fila.id_piloto;
};

const SQL_AGENDA = `
  SELECT r.id_reserva, r.codigo, r.fecha_vuelo, r.peso_pasajero, r.edad_pasajero, r.observaciones,
         s.titulo AS servicio, s.duracion_minutos,
         TIME_FORMAT(b.hora_inicio, '%H:%i') AS hora_inicio, TIME_FORMAT(b.hora_fin, '%H:%i') AS hora_fin,
         er.nombre_estado AS estado,
         c.nombres, c.apellidos, c.correo, c.telefono, c.contacto_emergencia, c.telefono_emergencia,
         e.identificador AS equipo, e.marca AS equipo_marca, e.modelo AS equipo_modelo,
         a.id_piloto
  FROM asignacion a
  JOIN reserva r ON r.id_reserva = a.id_reserva
  JOIN servicio_vuelo s ON s.id_servicio = r.id_servicio
  JOIN bloque_horario b ON b.id_bloque = r.id_bloque
  JOIN estado_reserva er ON er.id_estado_reserva = r.id_estado_reserva
  JOIN cliente c ON c.id_cliente = r.id_cliente
  JOIN equipo_vuelo e ON e.id_equipo = a.id_equipo`;

const aVueloAgenda = (f) => ({
  id: f.id_reserva,
  codigo: f.codigo,
  fecha: f.fecha_vuelo,
  hora: f.hora_inicio,
  horaFin: f.hora_fin,
  servicio: f.servicio,
  duracionMinutos: f.duracion_minutos,
  estado: f.estado,
  equipo: `${f.equipo} · ${f.equipo_marca} ${f.equipo_modelo}`,
  pasajero: {
    nombres: f.nombres,
    nombreCompleto: `${f.nombres} ${f.apellidos}`,
    correo: f.correo,
    telefono: f.telefono,
    peso: Number(f.peso_pasajero),
    edad: f.edad_pasajero,
    observaciones: f.observaciones,
    contactoEmergencia: f.contacto_emergencia,
    telefonoEmergencia: f.telefono_emergencia
  }
});

/** Vuelos asignados (pendientes de volar) del piloto con sesión. */
export const obtenerAgenda = async (idUsuario) => {
  const idPiloto = await idPilotoDeUsuario(idUsuario);
  const filas = await consultar(
    `${SQL_AGENDA}
     WHERE a.id_piloto = ? AND er.nombre_estado = ?
     ORDER BY r.fecha_vuelo, b.hora_inicio`,
    [idPiloto, ESTADOS.ASIGNADA]
  );
  return filas.map(aVueloAgenda);
};

/**
 * Registra el resultado del vuelo.
 * Si se realizó: la reserva pasa a Ejecutada y se genera la encuesta.
 * Si no: el motivo es obligatorio y la reserva pasa a Cancelada.
 */
export const registrarResultado = async (idUsuario, idReserva, cuerpo) => {
  if (typeof cuerpo?.ejecutado !== 'boolean') {
    throw solicitudInvalida('Indique si el vuelo se realizó (ejecutado: true o false)');
  }
  const ejecutado = cuerpo.ejecutado;
  const motivo = texto(cuerpo.motivoNoRealizado).slice(0, 200) || null;
  if (!ejecutado && !motivo) throw solicitudInvalida('Si el vuelo no se realizó, el motivo es obligatorio');

  const opcional = (valor, campo, limites, validar) => (
    valor === undefined || valor === null || valor === '' ? null : validar(valor, campo, limites)
  );
  const duracion = ejecutado ? opcional(cuerpo.duracionRealMin, 'duracionRealMin', { min: 1, max: 600 }, validarEntero) : null;
  const viento = opcional(cuerpo.vientoDespegueKmh, 'vientoDespegueKmh', { min: 0, max: 200 }, validarNumero);
  const observaciones = texto(cuerpo.observaciones).slice(0, 300) || null;

  return conTransaccion(async (cx) => {
    const idPiloto = await idPilotoDeUsuario(idUsuario, cx);
    const [fila] = await consultar(`${SQL_AGENDA} WHERE a.id_reserva = ?`, [idReserva], cx);
    if (!fila) throw noEncontrado('La reserva no existe o no tiene asignación');
    if (fila.id_piloto !== idPiloto) throw new HttpError(403, 'Este vuelo está asignado a otro piloto');
    if (fila.estado !== ESTADOS.ASIGNADA) {
      throw conflicto(`El vuelo está en estado ${fila.estado}; solo se registra el resultado de vuelos asignados`);
    }

    try {
      await consultar(
        `INSERT INTO resultado_vuelo
           (id_reserva, ejecutado, duracion_real_min, viento_despegue_kmh, motivo_no_realizado, observaciones)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idReserva, ejecutado, duracion, viento, ejecutado ? null : motivo, observaciones], cx
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') throw conflicto('El resultado de este vuelo ya fue registrado');
      throw error;
    }

    const tokenEncuesta = ejecutado ? await asegurarEncuesta(cx, idReserva) : null;
    await aplicarCambioEstado(cx, {
      idReserva,
      estadoActual: ESTADOS.ASIGNADA,
      nuevoEstado: ejecutado ? ESTADOS.EJECUTADA : ESTADOS.CANCELADA,
      idUsuario,
      observacion: ejecutado ? 'Vuelo realizado (registrado por el piloto)' : `No realizado: ${motivo}`.slice(0, 200)
    });

    const vuelo = aVueloAgenda({ ...fila, estado: ejecutado ? ESTADOS.EJECUTADA : ESTADOS.CANCELADA });
    return { vuelo, tokenEncuesta };
  });
};
