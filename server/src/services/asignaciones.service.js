// Asignación piloto + equipo con motor de recomendación (RF013, HU013).
// Es un motor de reglas: filtra lo que no es seguro y puntúa lo que queda (0 a 100).
import { conTransaccion, consultar } from '../config/db.js';
import { conflicto, solicitudInvalida } from '../utils/errores.js';
import { exigirCampos, texto, validarEntero } from '../utils/validacion.js';
import { ESTADOS, aplicarCambioEstado, obtenerReservaAdmin } from './reservas.service.js';

const MAX_RECOMENDACIONES = 3;

// Puntaje: 50 por peso centrado en el rango del equipo, 30 por certificación, 20 por experiencia
const PUNTOS_CERTIFICACION = { 'Instructor examinador': 30, Instructor: 22, 'Piloto biplaza': 15 };
const HORAS_PARA_PUNTAJE_MAXIMO = 2000;

// Reservas que ocupan a un piloto o a un equipo en su bloque
const ESTADOS_QUE_OCUPAN = [ESTADOS.CONFIRMADA, ESTADOS.ASIGNADA, ESTADOS.EJECUTADA];

/** Pilotos que pueden volar esa fecha y bloque. */
const pilotosAptos = async (cx, { idReserva, fecha, idBloque }) => {
  const filas = await consultar(
    `SELECT p.id_piloto, p.nivel_certificacion, p.fecha_venc_certificacion, p.horas_vuelo, p.peso_kg,
            u.nombres, u.apellidos
     FROM piloto p
     JOIN usuario u ON u.id_usuario = p.id_usuario
     WHERE p.disponible = TRUE
       AND u.activo = TRUE
       AND p.fecha_venc_certificacion >= ?
       AND EXISTS (SELECT 1 FROM disponibilidad_piloto d
                   WHERE d.id_piloto = p.id_piloto AND d.fecha = ? AND d.id_bloque = ?)
       AND NOT EXISTS (SELECT 1 FROM asignacion a
                       JOIN reserva r2 ON r2.id_reserva = a.id_reserva
                       JOIN estado_reserva e2 ON e2.id_estado_reserva = r2.id_estado_reserva
                       WHERE a.id_piloto = p.id_piloto AND r2.fecha_vuelo = ? AND r2.id_bloque = ?
                         AND r2.id_reserva <> ? AND e2.nombre_estado IN (?, ?, ?))
     ORDER BY u.nombres`,
    [fecha, fecha, idBloque, fecha, idBloque, idReserva, ...ESTADOS_QUE_OCUPAN], cx
  );
  return filas.map((f) => ({
    id: f.id_piloto,
    nombre: `${f.nombres} ${f.apellidos}`,
    nivelCertificacion: f.nivel_certificacion,
    fechaVencCertificacion: f.fecha_venc_certificacion,
    horasVuelo: f.horas_vuelo,
    pesoKg: Number(f.peso_kg)
  }));
};

/** Equipos disponibles, con la revisión al día y libres en ese bloque. */
const equiposAptos = async (cx, { idReserva, fecha, idBloque }) => {
  const filas = await consultar(
    `SELECT e.id_equipo, e.identificador, e.marca, e.modelo, e.peso_minimo, e.peso_maximo, e.fecha_proxima_revision
     FROM equipo_vuelo e
     WHERE e.estado = 'Disponible'
       AND e.tipo = 'Biplaza'
       AND e.fecha_proxima_revision >= ?
       AND NOT EXISTS (SELECT 1 FROM asignacion a
                       JOIN reserva r2 ON r2.id_reserva = a.id_reserva
                       JOIN estado_reserva e2 ON e2.id_estado_reserva = r2.id_estado_reserva
                       WHERE a.id_equipo = e.id_equipo AND r2.fecha_vuelo = ? AND r2.id_bloque = ?
                         AND r2.id_reserva <> ? AND e2.nombre_estado IN (?, ?, ?))
     ORDER BY e.identificador`,
    [fecha, fecha, idBloque, idReserva, ...ESTADOS_QUE_OCUPAN], cx
  );
  return filas.map((f) => ({
    id: f.id_equipo,
    identificador: f.identificador,
    nombre: `${f.identificador} · ${f.marca} ${f.modelo}`,
    pesoMinimo: Number(f.peso_minimo),
    pesoMaximo: Number(f.peso_maximo),
    fechaProximaRevision: f.fecha_proxima_revision
  }));
};

const redondear = (n) => Math.round(n * 100) / 100;

/** Puntúa una combinación. Devuelve null si el peso combinado no cabe en el equipo. */
const evaluar = (piloto, equipo, pesoPasajero) => {
  const pesoCombinado = redondear(piloto.pesoKg + pesoPasajero);
  if (pesoCombinado < equipo.pesoMinimo || pesoCombinado > equipo.pesoMaximo) return null;

  const centro = (equipo.pesoMinimo + equipo.pesoMaximo) / 2;
  const mitadRango = (equipo.pesoMaximo - equipo.pesoMinimo) / 2;
  const puntosPeso = 50 * (1 - Math.abs(pesoCombinado - centro) / mitadRango);
  const puntosCertificacion = PUNTOS_CERTIFICACION[piloto.nivelCertificacion] ?? 0;
  const puntosHoras = 20 * Math.min(piloto.horasVuelo / HORAS_PARA_PUNTAJE_MAXIMO, 1);
  const puntaje = redondear(puntosPeso + puntosCertificacion + puntosHoras);

  const explicacion = `Peso combinado ${pesoCombinado} kg (pasajero ${pesoPasajero} + piloto ${piloto.pesoKg}) `
    + `dentro del rango ${equipo.pesoMinimo} a ${equipo.pesoMaximo} kg del ${equipo.identificador}. `
    + `${piloto.nivelCertificacion} con ${piloto.horasVuelo} horas de vuelo. `
    + `Puntos: peso ${redondear(puntosPeso)}/50, certificación ${puntosCertificacion}/30, experiencia ${redondear(puntosHoras)}/20.`;

  return {
    piloto,
    equipo,
    pesoCombinado,
    puntaje,
    detalle: {
      peso: redondear(puntosPeso),
      certificacion: puntosCertificacion,
      experiencia: redondear(puntosHoras)
    },
    explicacion
  };
};

/** Explica por qué no hay combinaciones posibles. */
const motivoSinOpciones = (pilotos, equipos) => {
  if (pilotos.length === 0) {
    return 'No hay pilotos aptos: revise que tengan disponibilidad registrada para esa fecha y hora, '
      + 'la certificación vigente y que no tengan otro vuelo en ese bloque.';
  }
  if (equipos.length === 0) {
    return 'No hay equipos aptos: revise que estén Disponibles, con la revisión al día y libres en ese bloque.';
  }
  return 'Ninguna combinación de piloto y equipo cumple el rango de peso combinado del equipo.';
};

const analizar = async (cx, reserva) => {
  const filtro = { idReserva: reserva.id, fecha: reserva.fecha, idBloque: reserva.idBloque };
  const [pilotos, equipos] = await Promise.all([pilotosAptos(cx, filtro), equiposAptos(cx, filtro)]);
  const combinaciones = pilotos
    .flatMap((p) => equipos.map((e) => evaluar(p, e, reserva.peso)))
    .filter(Boolean)
    .sort((a, b) => b.puntaje - a.puntaje);
  return { pilotos, equipos, combinaciones };
};

const exigirConfirmada = (reserva) => {
  if (reserva.estado !== ESTADOS.CONFIRMADA) {
    throw conflicto(`Solo se asignan reservas Confirmadas; esta está en estado ${reserva.estado}`);
  }
};

/** GET /api/asignaciones/recomendacion/:idReserva */
export const recomendar = async (idReserva) => {
  const reserva = await obtenerReservaAdmin(idReserva);
  exigirConfirmada(reserva);
  const { pilotos, equipos, combinaciones } = await analizar(undefined, reserva);
  return {
    reserva: {
      id: reserva.id,
      codigo: reserva.codigo,
      fecha: reserva.fecha,
      hora: reserva.hora,
      servicio: reserva.servicio,
      pasajero: reserva.cliente.nombreCompleto,
      peso: reserva.peso,
      edad: reserva.edad,
      observaciones: reserva.observaciones
    },
    recomendaciones: combinaciones.slice(0, MAX_RECOMENDACIONES),
    // Para la asignación manual: todo lo que es seguro, aunque no esté en el top 3
    combinacionesValidas: combinaciones,
    pilotosAptos: pilotos,
    equiposAptos: equipos,
    motivo: combinaciones.length === 0 ? motivoSinOpciones(pilotos, equipos) : null
  };
};

/**
 * POST /api/asignaciones
 * { idReserva, idPiloto, idEquipo, recomendadaIa, justificacion }
 * Si el administrador no toma la recomendación principal, la justificación es obligatoria.
 */
export const asignar = async (cuerpo, idUsuario) => {
  exigirCampos(cuerpo, ['idReserva', 'idPiloto', 'idEquipo']);
  const idReserva = validarEntero(cuerpo.idReserva, 'idReserva', { min: 1 });
  const idPiloto = validarEntero(cuerpo.idPiloto, 'idPiloto', { min: 1 });
  const idEquipo = validarEntero(cuerpo.idEquipo, 'idEquipo', { min: 1 });
  const justificacion = texto(cuerpo.justificacion).slice(0, 300) || null;

  return conTransaccion(async (cx) => {
    // Bloquea la reserva para que dos administradores no la asignen a la vez
    await consultar('SELECT id_reserva FROM reserva WHERE id_reserva = ? FOR UPDATE', [idReserva], cx);
    const reserva = await obtenerReservaAdmin(idReserva, cx);
    exigirConfirmada(reserva);

    const { pilotos, equipos, combinaciones } = await analizar(cx, reserva);
    if (!pilotos.some((p) => p.id === idPiloto)) {
      throw conflicto('El piloto no está apto para ese vuelo (disponibilidad, certificación u otro vuelo en el mismo bloque)');
    }
    if (!equipos.some((e) => e.id === idEquipo)) {
      throw conflicto('El equipo no está apto para ese vuelo (estado, revisión u otro vuelo en el mismo bloque)');
    }
    const elegida = combinaciones.find((c) => c.piloto.id === idPiloto && c.equipo.id === idEquipo);
    if (!elegida) {
      throw conflicto('El peso combinado del piloto y el pasajero no está dentro del rango del equipo');
    }

    // Es "recomendada por la IA" solo si coincide con la primera recomendación
    const principal = combinaciones[0];
    const esRecomendada = principal.piloto.id === idPiloto && principal.equipo.id === idEquipo;
    if (!esRecomendada && (!justificacion || justificacion.length < 10)) {
      throw solicitudInvalida('No eligió la recomendación principal: escriba una justificación (mínimo 10 caracteres)');
    }

    const explicacion = esRecomendada
      ? elegida.explicacion
      : `La recomendación principal era ${principal.piloto.nombre} con ${principal.equipo.identificador} `
        + `(${principal.puntaje} puntos). Se eligió ${elegida.piloto.nombre} con ${elegida.equipo.identificador} `
        + `(${elegida.puntaje} puntos).`;

    try {
      await consultar(
        `INSERT INTO asignacion
           (id_reserva, id_piloto, id_equipo, id_usuario, puntaje, recomendada_ia, explicacion, justificacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [idReserva, idPiloto, idEquipo, idUsuario, elegida.puntaje, esRecomendada,
          explicacion.slice(0, 500), justificacion],
        cx
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') throw conflicto('Esta reserva ya tiene piloto y equipo asignados');
      throw error;
    }

    await aplicarCambioEstado(cx, {
      idReserva,
      estadoActual: ESTADOS.CONFIRMADA,
      nuevoEstado: ESTADOS.ASIGNADA,
      idUsuario,
      observacion: `Asignación aprobada: ${elegida.piloto.nombre} con ${elegida.equipo.identificador}`.slice(0, 200)
    });

    return {
      reserva: await obtenerReservaAdmin(idReserva, cx),
      asignacion: {
        piloto: elegida.piloto.nombre,
        equipo: elegida.equipo.nombre,
        puntaje: elegida.puntaje,
        recomendadaIa: esRecomendada,
        explicacion,
        justificacion
      }
    };
  });
};
