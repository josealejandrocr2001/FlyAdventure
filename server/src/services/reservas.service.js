// Reservas: disponibilidad (RF003), registro (RF006), confirmación del pago
// por WhatsApp (RF009), consulta por código (RF010), gestión desde el panel
// (RF015) e historial del cliente con cuenta (RF010).
import crypto from 'node:crypto';
import { consultar, conTransaccion } from '../config/db.js';
import { ROLES } from '../middlewares/auth.js';
import { HttpError, conflicto, noEncontrado, solicitudInvalida } from '../utils/errores.js';
import {
  exigirCampos, hoyEnColombia, texto, validarCorreo, validarDocumento, validarEntero,
  validarFecha, validarNombre, validarNumero, validarTelefono, validarTipoDocumento
} from '../utils/validacion.js';
import { obtenerParametros } from './catalogos.service.js';

export const ESTADOS = Object.freeze({
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  ASIGNADA: 'Asignada',
  EJECUTADA: 'Ejecutada',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada'
});

// Estados que NO ocupan cupo en el bloque
const ESTADOS_LIBERAN_CUPO = [ESTADOS.CANCELADA, ESTADOS.EXPIRADA];

// Transiciones permitidas desde el panel del administrador.
// "Asignada" la produce el módulo de asignación piloto-equipo (RF013).
const TRANSICIONES = {
  [ESTADOS.PENDIENTE]: [ESTADOS.CONFIRMADA, ESTADOS.CANCELADA],
  [ESTADOS.CONFIRMADA]: [ESTADOS.ASIGNADA, ESTADOS.EJECUTADA, ESTADOS.CANCELADA],
  [ESTADOS.ASIGNADA]: [ESTADOS.EJECUTADA, ESTADOS.CANCELADA],
  [ESTADOS.EJECUTADA]: [],
  [ESTADOS.CANCELADA]: [],
  [ESTADOS.EXPIRADA]: []
};

const MEDIOS_PAGO = ['Transferencia', 'Nequi', 'Daviplata', 'Efectivo', 'Tarjeta'];

// Sin caracteres ambiguos (0/O, 1/I/L)
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generarCodigo = () => {
  const bytes = crypto.randomBytes(8);
  const sufijo = Array.from(bytes, (b) => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join('');
  return `FA-${sufijo}`; // 11 caracteres, la columna admite 12
};

export const generarTokenEncuesta = () => crypto.randomBytes(24).toString('hex');

const SQL_RESERVA = `
  SELECT r.id_reserva, r.codigo, r.fecha_vuelo, r.peso_pasajero, r.edad_pasajero,
         r.valor_total, r.canal, r.observaciones, r.fecha_creacion,
         r.id_servicio, s.titulo AS servicio,
         r.id_bloque, TIME_FORMAT(b.hora_inicio, '%H:%i') AS hora_inicio,
         TIME_FORMAT(b.hora_fin, '%H:%i') AS hora_fin,
         er.nombre_estado AS estado,
         c.id_cliente, c.tipo_documento, c.numero_documento, c.nombres, c.apellidos,
         c.correo, c.telefono, c.id_usuario AS id_usuario_cliente,
         en.satisfaccion, en.comentario AS comentario_encuesta, en.sentimiento,
         en.fecha_respuesta AS fecha_respuesta_encuesta, en.token AS token_encuesta,
         pg.medio_pago, ep.nombre_estado AS estado_pago
  FROM reserva r
  JOIN servicio_vuelo s ON s.id_servicio = r.id_servicio
  JOIN bloque_horario b ON b.id_bloque = r.id_bloque
  JOIN estado_reserva er ON er.id_estado_reserva = r.id_estado_reserva
  JOIN cliente c ON c.id_cliente = r.id_cliente
  LEFT JOIN encuesta en ON en.id_reserva = r.id_reserva
  LEFT JOIN pago pg ON pg.id_pago = (
      SELECT MAX(p2.id_pago) FROM pago p2 WHERE p2.id_reserva = r.id_reserva)
  LEFT JOIN estado_pago ep ON ep.id_estado_pago = pg.id_estado_pago`;

/** Vista completa (panel del administrador). */
const aReservaAdmin = (f) => ({
  id: f.id_reserva,
  codigo: f.codigo,
  fecha: f.fecha_vuelo,
  hora: f.hora_inicio,
  horaFin: f.hora_fin,
  idBloque: f.id_bloque,
  idServicio: f.id_servicio,
  servicio: f.servicio,
  valorTotal: Number(f.valor_total),
  estado: f.estado,
  estadoPago: f.estado_pago,
  medioPago: f.medio_pago,
  canal: f.canal,
  peso: Number(f.peso_pasajero),
  edad: f.edad_pasajero,
  observaciones: f.observaciones,
  fechaCreacion: f.fecha_creacion,
  cliente: {
    id: f.id_cliente,
    tipoDocumento: f.tipo_documento,
    numeroDocumento: f.numero_documento,
    nombres: f.nombres,
    apellidos: f.apellidos,
    nombreCompleto: `${f.nombres} ${f.apellidos}`,
    correo: f.correo,
    telefono: f.telefono,
    tieneCuenta: f.id_usuario_cliente !== null
  },
  encuesta: f.fecha_respuesta_encuesta ? {
    satisfaccion: f.satisfaccion,
    comentario: f.comentario_encuesta,
    sentimiento: f.sentimiento,
    fechaRespuesta: f.fecha_respuesta_encuesta
  } : null
});

/** Vista para el cliente: sin datos internos. */
const aReservaCliente = (f) => ({
  codigo: f.codigo,
  fecha: f.fecha_vuelo,
  hora: f.hora_inicio,
  horaFin: f.hora_fin,
  servicio: f.servicio,
  valorTotal: Number(f.valor_total),
  estado: f.estado,
  estadoPago: f.estado_pago,
  fechaCreacion: f.fecha_creacion,
  encuesta: f.fecha_respuesta_encuesta
    ? { satisfaccion: f.satisfaccion, comentario: f.comentario_encuesta }
    : null,
  // Si voló y no ha respondido, puede responder la encuesta desde su historial
  tokenEncuestaPendiente: f.estado === ESTADOS.EJECUTADA && !f.fecha_respuesta_encuesta
    ? f.token_encuesta
    : null
});

const idEstado = async (nombre, cx) => {
  const [fila] = await consultar(
    'SELECT id_estado_reserva FROM estado_reserva WHERE nombre_estado = ?', [nombre], cx
  );
  if (!fila) throw new Error(`Falta el estado ${nombre} en estado_reserva`);
  return fila.id_estado_reserva;
};

const idEstadoPago = async (nombre, cx) => {
  const [fila] = await consultar('SELECT id_estado_pago FROM estado_pago WHERE nombre_estado = ?', [nombre], cx);
  if (!fila) throw new Error(`Falta el estado de pago ${nombre} en estado_pago`);
  return fila.id_estado_pago;
};

// ---------------------------------------------------------------------------
// Disponibilidad (RF003)
// ---------------------------------------------------------------------------
export const consultarDisponibilidad = async (fecha) => {
  const dia = validarFecha(fecha);
  const filas = await consultar(
    `SELECT b.id_bloque,
            TIME_FORMAT(b.hora_inicio, '%H:%i') AS hora_inicio,
            TIME_FORMAT(b.hora_fin, '%H:%i') AS hora_fin,
            b.cupo_maximo,
            COUNT(r.id_reserva) AS ocupados
     FROM bloque_horario b
     LEFT JOIN reserva r
            ON r.id_bloque = b.id_bloque
           AND r.fecha_vuelo = ?
           AND r.id_estado_reserva NOT IN (
               SELECT id_estado_reserva FROM estado_reserva WHERE nombre_estado IN (?, ?))
     WHERE b.activo = TRUE
     GROUP BY b.id_bloque, b.hora_inicio, b.hora_fin, b.cupo_maximo
     ORDER BY b.hora_inicio`,
    [dia, ...ESTADOS_LIBERAN_CUPO]
  );
  return filas.map((f) => ({
    idBloque: f.id_bloque,
    horaInicio: f.hora_inicio,
    horaFin: f.hora_fin,
    cupoMaximo: f.cupo_maximo,
    ocupados: Number(f.ocupados),
    disponibles: Math.max(0, f.cupo_maximo - Number(f.ocupados))
  }));
};

/** Bloquea la fila del bloque y verifica el cupo dentro de la transacción. */
const verificarCupo = async (cx, { fecha, idBloque, excluirReserva = null }) => {
  const [bloque] = await consultar(
    'SELECT cupo_maximo, activo FROM bloque_horario WHERE id_bloque = ? FOR UPDATE', [idBloque], cx
  );
  if (!bloque || !bloque.activo) throw solicitudInvalida('El bloque horario no existe o no está disponible');

  const [{ ocupados }] = await consultar(
    `SELECT COUNT(*) AS ocupados
     FROM reserva r
     JOIN estado_reserva er ON er.id_estado_reserva = r.id_estado_reserva
     WHERE r.fecha_vuelo = ? AND r.id_bloque = ?
       AND er.nombre_estado NOT IN (?, ?)
       AND (? IS NULL OR r.id_reserva <> ?)`,
    [fecha, idBloque, ...ESTADOS_LIBERAN_CUPO, excluirReserva, excluirReserva], cx
  );
  if (Number(ocupados) >= bloque.cupo_maximo) {
    throw conflicto('El bloque horario seleccionado ya no tiene cupos. Elija otra hora.');
  }
};

// ---------------------------------------------------------------------------
// Registro de la reserva (RF006). Invitado o cliente con sesión.
// ---------------------------------------------------------------------------
export const crearReserva = async (cuerpo, usuarioSesion) => {
  const esClienteConSesion = usuarioSesion?.rol === ROLES.CLIENTE;

  exigirCampos(cuerpo, ['idServicio', 'fecha', 'idBloque', 'peso', 'edad']);
  if (!esClienteConSesion) {
    exigirCampos(cuerpo, ['tipoDocumento', 'numeroDocumento', 'nombres', 'apellidos', 'correo', 'telefono']);
  }
  if (cuerpo.aceptaTerminos !== true) {
    throw solicitudInvalida('Debe aceptar los términos del vuelo y autorizar el tratamiento de datos');
  }

  const fecha = validarFecha(cuerpo.fecha);
  if (fecha < hoyEnColombia()) throw solicitudInvalida('La fecha del vuelo no puede estar en el pasado');

  const idServicio = validarEntero(cuerpo.idServicio, 'idServicio', { min: 1 });
  const idBloque = validarEntero(cuerpo.idBloque, 'idBloque', { min: 1 });
  const peso = validarNumero(cuerpo.peso, 'peso', { min: 15, max: 150 });
  const edad = validarEntero(cuerpo.edad, 'edad', { min: 1, max: 100 });
  const observaciones = texto(cuerpo.observaciones).slice(0, 500) || null;

  return conTransaccion(async (cx) => {
    // Reglas del negocio configurables (RNF011)
    const parametros = await obtenerParametros(cx);
    if (parametros.peso_maximo_pasajero && peso > parametros.peso_maximo_pasajero) {
      throw solicitudInvalida(`El peso máximo permitido es ${parametros.peso_maximo_pasajero} kg`);
    }
    if (parametros.edad_minima_pasajero && edad < parametros.edad_minima_pasajero) {
      throw solicitudInvalida(`La edad mínima para volar es ${parametros.edad_minima_pasajero} años`);
    }

    const [servicio] = await consultar(
      'SELECT precio, activo FROM servicio_vuelo WHERE id_servicio = ?', [idServicio], cx
    );
    if (!servicio || !servicio.activo) throw solicitudInvalida('El servicio de vuelo no está disponible');

    await verificarCupo(cx, { fecha, idBloque });

    // Cliente: el de la sesión o el que corresponda al documento
    let idCliente;
    if (esClienteConSesion) {
      const [cliente] = await consultar(
        'SELECT id_cliente FROM cliente WHERE id_usuario = ?', [usuarioSesion.idUsuario], cx
      );
      if (!cliente) throw new HttpError(409, 'Su cuenta no tiene datos de cliente. Comuníquese con FlyAdventure.');
      idCliente = cliente.id_cliente;
    } else {
      const datos = {
        tipoDocumento: validarTipoDocumento(cuerpo.tipoDocumento),
        numeroDocumento: validarDocumento(cuerpo.numeroDocumento),
        nombres: validarNombre(cuerpo.nombres, 'nombres'),
        apellidos: validarNombre(cuerpo.apellidos, 'apellidos'),
        correo: validarCorreo(cuerpo.correo),
        telefono: validarTelefono(cuerpo.telefono)
      };
      const [existente] = await consultar(
        'SELECT id_cliente, id_usuario FROM cliente WHERE numero_documento = ? FOR UPDATE',
        [datos.numeroDocumento], cx
      );
      if (existente) {
        idCliente = existente.id_cliente;
        // Un invitado no puede modificar los datos de un cliente que tiene cuenta
        if (existente.id_usuario === null) {
          await consultar(
            'UPDATE cliente SET nombres = ?, apellidos = ?, correo = ?, telefono = ? WHERE id_cliente = ?',
            [datos.nombres, datos.apellidos, datos.correo, datos.telefono, idCliente], cx
          );
        }
      } else {
        const nuevo = await consultar(
          `INSERT INTO cliente
           (tipo_documento, numero_documento, nombres, apellidos, correo, telefono,
            autoriza_datos, fecha_autorizacion)
           VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())`,
          [datos.tipoDocumento, datos.numeroDocumento, datos.nombres, datos.apellidos,
            datos.correo, datos.telefono], cx
        );
        idCliente = nuevo.insertId;
      }
    }

    const idPendiente = await idEstado(ESTADOS.PENDIENTE, cx);
    const codigo = generarCodigo();
    const nueva = await consultar(
      `INSERT INTO reserva
       (codigo, id_cliente, id_servicio, id_bloque, id_estado_reserva, fecha_vuelo,
        peso_pasajero, edad_pasajero, valor_total, canal, observaciones, acepta_terminos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Web', ?, TRUE)`,
      [codigo, idCliente, idServicio, idBloque, idPendiente, fecha, peso, edad,
        servicio.precio, observaciones], cx
    );
    const idReserva = nueva.insertId;

    await consultar(
      `INSERT INTO cambio_estado (id_reserva, id_estado_anterior, id_estado_nuevo, id_usuario, observacion)
       VALUES (?, NULL, ?, ?, 'Reserva creada desde la web')`,
      [idReserva, idPendiente, usuarioSesion?.idUsuario ?? null], cx
    );

    // Pago pendiente: se acuerda por WhatsApp y lo confirma un administrador
    await consultar(
      'INSERT INTO pago (id_reserva, id_estado_pago, referencia, valor) VALUES (?, ?, ?, ?)',
      [idReserva, await idEstadoPago('Pendiente', cx), codigo, servicio.precio], cx
    );

    const [fila] = await consultar(`${SQL_RESERVA} WHERE r.id_reserva = ?`, [idReserva], cx);
    return aReservaCliente(fila);
  });
};

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/** Consulta pública por código + documento (RF010). Pedir ambos evita adivinar códigos. */
export const consultarPorCodigo = async ({ codigo, documento }) => {
  if (!codigo || !documento) throw solicitudInvalida('Envíe el código de la reserva y el documento');
  const [fila] = await consultar(
    `${SQL_RESERVA} WHERE r.codigo = ? AND c.numero_documento = ?`,
    [texto(codigo).toUpperCase(), texto(documento).toUpperCase()]
  );
  if (!fila) throw noEncontrado('No encontramos una reserva con ese código y documento');
  return aReservaCliente(fila);
};

/** Historial de vuelos del cliente con sesión (RF010). */
export const listarMisReservas = async (idUsuario) => {
  const filas = await consultar(
    `${SQL_RESERVA} WHERE c.id_usuario = ? ORDER BY r.fecha_vuelo DESC, b.hora_inicio DESC`,
    [idUsuario]
  );
  return filas.map(aReservaCliente);
};

/** Listado del panel con filtros opcionales (RF015). */
export const listarReservas = async ({ fecha, estado, idServicio, busqueda } = {}) => {
  const filtros = [];
  const parametros = [];
  if (fecha) { filtros.push('r.fecha_vuelo = ?'); parametros.push(validarFecha(fecha)); }
  if (estado) { filtros.push('er.nombre_estado = ?'); parametros.push(estado); }
  if (idServicio) { filtros.push('r.id_servicio = ?'); parametros.push(Number(idServicio)); }
  if (busqueda) {
    filtros.push('(c.nombres LIKE ? OR c.apellidos LIKE ? OR c.numero_documento LIKE ? OR r.codigo LIKE ?)');
    const patron = `%${texto(busqueda)}%`;
    parametros.push(patron, patron, patron, patron);
  }
  const filas = await consultar(
    `${SQL_RESERVA} ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}
     ORDER BY r.fecha_creacion DESC`,
    parametros
  );
  return filas.map(aReservaAdmin);
};

export const obtenerReservaAdmin = async (idReserva, cx) => {
  const [fila] = await consultar(`${SQL_RESERVA} WHERE r.id_reserva = ?`, [idReserva], cx);
  if (!fila) throw noEncontrado('La reserva no existe');
  return aReservaAdmin(fila);
};

export const obtenerHistorialEstados = async (idReserva) => {
  await obtenerReservaAdmin(idReserva);
  const filas = await consultar(
    `SELECT ea.nombre_estado AS estado_anterior, en.nombre_estado AS estado_nuevo,
            COALESCE(CONCAT(u.nombres, ' ', u.apellidos), 'Sistema') AS registrado_por,
            ce.observacion, ce.fecha_cambio
     FROM cambio_estado ce
     LEFT JOIN estado_reserva ea ON ea.id_estado_reserva = ce.id_estado_anterior
     JOIN estado_reserva en ON en.id_estado_reserva = ce.id_estado_nuevo
     LEFT JOIN usuario u ON u.id_usuario = ce.id_usuario
     WHERE ce.id_reserva = ?
     ORDER BY ce.fecha_cambio, ce.id_cambio`,
    [idReserva]
  );
  return filas.map((f) => ({
    estadoAnterior: f.estado_anterior,
    estadoNuevo: f.estado_nuevo,
    registradoPor: f.registrado_por,
    observacion: f.observacion,
    fecha: f.fecha_cambio
  }));
};

// ---------------------------------------------------------------------------
// Gestión desde el panel (RF009 y RF015)
// ---------------------------------------------------------------------------

/** Reprogramar: cambia servicio, fecha u hora, validando el cupo. */
export const actualizarReserva = async (idReserva, cuerpo, idAdministrador) => conTransaccion(async (cx) => {
  const actual = await obtenerReservaAdmin(idReserva, cx);
  if ([ESTADOS.EJECUTADA, ESTADOS.CANCELADA, ESTADOS.EXPIRADA].includes(actual.estado)) {
    throw conflicto(`No se puede modificar una reserva en estado ${actual.estado}`);
  }

  const fecha = cuerpo.fecha ? validarFecha(cuerpo.fecha) : actual.fecha;
  const idBloque = cuerpo.idBloque ? validarEntero(cuerpo.idBloque, 'idBloque', { min: 1 }) : actual.idBloque;
  const idServicio = cuerpo.idServicio
    ? validarEntero(cuerpo.idServicio, 'idServicio', { min: 1 })
    : actual.idServicio;

  if (fecha !== actual.fecha || idBloque !== actual.idBloque) {
    if (fecha < hoyEnColombia()) throw solicitudInvalida('La nueva fecha no puede estar en el pasado');
    await verificarCupo(cx, { fecha, idBloque, excluirReserva: idReserva });
  }

  let valorTotal = actual.valorTotal;
  if (idServicio !== actual.idServicio) {
    const [servicio] = await consultar(
      'SELECT precio, activo FROM servicio_vuelo WHERE id_servicio = ?', [idServicio], cx
    );
    if (!servicio || !servicio.activo) throw solicitudInvalida('El servicio de vuelo no está disponible');
    valorTotal = Number(servicio.precio);
  }

  await consultar(
    'UPDATE reserva SET fecha_vuelo = ?, id_bloque = ?, id_servicio = ?, valor_total = ? WHERE id_reserva = ?',
    [fecha, idBloque, idServicio, valorTotal, idReserva], cx
  );
  const idEstadoActual = await idEstado(actual.estado, cx);
  await consultar(
    `INSERT INTO cambio_estado (id_reserva, id_estado_anterior, id_estado_nuevo, id_usuario, observacion)
     VALUES (?, ?, ?, ?, ?)`,
    [idReserva, idEstadoActual, idEstadoActual, idAdministrador,
      `Reprogramada: ${fecha}, bloque ${idBloque}, servicio ${idServicio}`], cx
  );
  return obtenerReservaAdmin(idReserva, cx);
});

/**
 * Cambia el estado DENTRO de una transacción abierta y deja el rastro en cambio_estado.
 * Úsela desde otros módulos (asignación, resultado del vuelo) en lugar de escribir el UPDATE a mano:
 *   await aplicarCambioEstado(cx, { idReserva, estadoActual: 'Confirmada', nuevoEstado: 'Asignada', idUsuario, observacion });
 */
export const aplicarCambioEstado = async (cx, { idReserva, estadoActual, nuevoEstado, idUsuario = null, observacion = null }) => {
  if (!TRANSICIONES[estadoActual]?.includes(nuevoEstado)) {
    throw conflicto(`No se puede pasar de ${estadoActual} a ${nuevoEstado}`);
  }
  const idAnterior = await idEstado(estadoActual, cx);
  const idNuevo = await idEstado(nuevoEstado, cx);
  await consultar('UPDATE reserva SET id_estado_reserva = ? WHERE id_reserva = ?', [idNuevo, idReserva], cx);
  await consultar(
    `INSERT INTO cambio_estado (id_reserva, id_estado_anterior, id_estado_nuevo, id_usuario, observacion)
     VALUES (?, ?, ?, ?, ?)`,
    [idReserva, idAnterior, idNuevo, idUsuario, observacion], cx
  );
};

/** Crea (o reutiliza) la encuesta de una reserva ejecutada y devuelve su token. */
export const asegurarEncuesta = async (cx, idReserva) => {
  const [existente] = await consultar('SELECT token FROM encuesta WHERE id_reserva = ?', [idReserva], cx);
  if (existente) return existente.token;
  const token = generarTokenEncuesta();
  await consultar('INSERT INTO encuesta (id_reserva, token) VALUES (?, ?)', [idReserva, token], cx);
  return token;
};

/**
 * Cambia el estado de la reserva y deja el rastro en cambio_estado.
 * - Confirmada: el administrador verificó el pago recibido por WhatsApp.
 * - Ejecutada: se crea la encuesta y se devuelve su token para enviarla por correo.
 */
export const cambiarEstadoReserva = async (idReserva, cuerpo, idAdministrador) => {
  exigirCampos(cuerpo, ['estado']);
  const nuevoEstado = cuerpo.estado;
  if (!Object.values(ESTADOS).includes(nuevoEstado)) {
    throw solicitudInvalida(`Estado inválido. Use: ${Object.values(ESTADOS).join(', ')}`);
  }

  return conTransaccion(async (cx) => {
    const actual = await obtenerReservaAdmin(idReserva, cx);
    if (!TRANSICIONES[actual.estado].includes(nuevoEstado)) {
      throw conflicto(`No se puede pasar de ${actual.estado} a ${nuevoEstado}`);
    }

    let observacion = texto(cuerpo.observacion).slice(0, 200) || null;

    if (nuevoEstado === ESTADOS.CONFIRMADA) {
      const medioPago = cuerpo.medioPago || null;
      if (medioPago && !MEDIOS_PAGO.includes(medioPago)) {
        throw solicitudInvalida(`Medio de pago inválido. Use: ${MEDIOS_PAGO.join(', ')}`);
      }
      await consultar(
        `UPDATE pago SET id_estado_pago = ?, id_usuario = ?, medio_pago = ?, comprobante = ?, fecha_pago = NOW()
         WHERE id_reserva = ?`,
        [await idEstadoPago('Aprobado', cx), idAdministrador, medioPago,
          texto(cuerpo.comprobante).slice(0, 100) || null, idReserva], cx
      );
      observacion = observacion || 'Pago confirmado por WhatsApp';
    }

    const tokenEncuesta = nuevoEstado === ESTADOS.EJECUTADA ? await asegurarEncuesta(cx, idReserva) : null;

    await aplicarCambioEstado(cx, {
      idReserva, estadoActual: actual.estado, nuevoEstado, idUsuario: idAdministrador, observacion
    });

    const reserva = await obtenerReservaAdmin(idReserva, cx);
    return { reserva, tokenEncuesta };
  });
};
