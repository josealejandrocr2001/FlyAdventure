// Encuesta de satisfacción (RF020). El enlace usa un token aleatorio, no el id
// de la reserva, para que nadie pueda responder encuestas ajenas.
// PENDIENTE (Linay): clasificar sentimiento y tema con la IA al guardar.
import { consultar } from '../config/db.js';
import { conflicto, noEncontrado } from '../utils/errores.js';
import { texto, validarEntero } from '../utils/validacion.js';

const buscarPorToken = async (token) => {
  const [fila] = await consultar(
    `SELECT e.id_encuesta, e.fecha_respuesta, r.codigo, r.fecha_vuelo, s.titulo AS servicio,
            c.nombres
     FROM encuesta e
     JOIN reserva r ON r.id_reserva = e.id_reserva
     JOIN servicio_vuelo s ON s.id_servicio = r.id_servicio
     JOIN cliente c ON c.id_cliente = r.id_cliente
     WHERE e.token = ?`,
    [texto(token)]
  );
  if (!fila) throw noEncontrado('El enlace de la encuesta no es válido');
  return fila;
};

export const obtenerEncuesta = async (token) => {
  const fila = await buscarPorToken(token);
  return {
    codigo: fila.codigo,
    fechaVuelo: fila.fecha_vuelo,
    servicio: fila.servicio,
    nombre: fila.nombres,
    respondida: fila.fecha_respuesta !== null
  };
};

export const responderEncuesta = async (token, cuerpo) => {
  const fila = await buscarPorToken(token);
  if (fila.fecha_respuesta) throw conflicto('Esta encuesta ya fue respondida. ¡Gracias!');

  const satisfaccion = validarEntero(cuerpo.satisfaccion, 'satisfaccion', { min: 1, max: 5 });
  const comentario = texto(cuerpo.comentario).slice(0, 500) || null;

  await consultar(
    'UPDATE encuesta SET satisfaccion = ?, comentario = ?, fecha_respuesta = NOW() WHERE id_encuesta = ?',
    [satisfaccion, comentario, fila.id_encuesta]
  );
  return { respondida: true };
};
