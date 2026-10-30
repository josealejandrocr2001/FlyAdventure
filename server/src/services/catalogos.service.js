// Catálogos de solo lectura: bloques horarios, estados y parámetros de operación.
import { consultar } from '../config/db.js';

export const listarBloques = async () => {
  const filas = await consultar(
    `SELECT id_bloque, TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio,
            TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin, cupo_maximo
     FROM bloque_horario WHERE activo = TRUE ORDER BY hora_inicio`
  );
  return filas.map((f) => ({
    idBloque: f.id_bloque,
    horaInicio: f.hora_inicio,
    horaFin: f.hora_fin,
    cupoMaximo: f.cupo_maximo
  }));
};

/** Devuelve los parámetros como objeto: { peso_maximo_pasajero: 110, ... } */
export const obtenerParametros = async (conexion) => {
  const filas = await consultar('SELECT clave, valor FROM parametro_operacion', [], conexion);
  return Object.fromEntries(filas.map((f) => [f.clave, Number.isNaN(Number(f.valor)) ? f.valor : Number(f.valor)]));
};
