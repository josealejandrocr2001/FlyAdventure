// Conexión a MySQL mediante un pool (varias conexiones reutilizables).
import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // DATE y DATETIME llegan como texto ('2026-10-24'), sin desfases de zona horaria
  timezone: '-05:00' // America/Bogota
});

// NOW() y CURRENT_TIMESTAMP en hora de Colombia, sin importar la zona del equipo
pool.on('connection', (conexion) => {
  conexion.query("SET time_zone = '-05:00'");
});

/**
 * Ejecuta una consulta parametrizada y devuelve las filas.
 * Use SIEMPRE "?" para los valores: así se evita la inyección SQL.
 *   const filas = await consultar('SELECT * FROM rol WHERE id_rol = ?', [1]);
 */
export const consultar = async (sql, parametros = [], conexion = pool) => {
  const [filas] = await conexion.execute(sql, parametros);
  return filas;
};

/**
 * Ejecuta varias operaciones como una sola transacción: o se guardan todas o ninguna.
 *   await conTransaccion(async (cx) => { await consultar('INSERT ...', [...], cx); ... });
 */
export const conTransaccion = async (trabajo) => {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await trabajo(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
};

export const verificarConexion = async () => {
  await consultar('SELECT 1');
};
