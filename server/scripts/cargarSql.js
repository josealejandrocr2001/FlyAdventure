// Ejecuta un archivo .sql completo contra el MySQL indicado por las variables de entorno.
// Sirve para crear la base en Aiven (o en cualquier MySQL) sin depender de Workbench.
//
// Uso (Git Bash, dentro de server/):
//   read -s -p "Contraseña de la base: " DB_PASSWORD && export DB_PASSWORD && echo
//   DB_HOST=... DB_PORT=... DB_USER=... DB_SSL_CA_FILE="ruta/al/ca.pem" \
//     node scripts/cargarSql.js ../database/FlyAdventure_MySQL_v2.sql
import fs from 'node:fs';
import mysql from 'mysql2/promise';

const archivo = process.argv[2];
const { DB_HOST, DB_PORT = '3306', DB_USER, DB_PASSWORD, DB_SSL_CA_FILE } = process.env;

if (!archivo || !DB_HOST || !DB_USER || !DB_PASSWORD) {
  console.error('Faltan datos. Revise el archivo .sql y las variables DB_HOST, DB_USER y DB_PASSWORD.');
  process.exit(1);
}

const sql = fs.readFileSync(archivo, 'utf8');

const conexion = await mysql.createConnection({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  multipleStatements: true,
  charset: 'utf8mb4',
  connectTimeout: 20000,
  ssl: DB_SSL_CA_FILE ? { ca: fs.readFileSync(DB_SSL_CA_FILE, 'utf8'), rejectUnauthorized: true } : undefined,
});

try {
  console.log(`Conectado a ${DB_HOST}:${DB_PORT}. Ejecutando ${archivo}...`);
  await conexion.query(sql);
  const [tablas] = await conexion.query(
    "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = 'flyadventure'",
  );
  console.log(`✔ Script ejecutado. Tablas en la base flyadventure: ${tablas[0].total}`);
} catch (error) {
  console.error(`✘ Error de MySQL: ${error.message}`);
  process.exitCode = 1;
} finally {
  await conexion.end();
}
