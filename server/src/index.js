// Punto de entrada del servidor.
import { app } from './app.js';
import { verificarConexion } from './config/db.js';
import { env } from './config/env.js';

try {
  await verificarConexion();
  console.log(`✔ Conectado a MySQL (${env.db.user}@${env.db.host}:${env.db.port}/${env.db.database})`);
} catch (error) {
  console.error('✘ No fue posible conectarse a MySQL:', error.message);
  console.error('  Revise que MySQL esté encendido y los datos de server/.env.');
  process.exit(1);
}

app.listen(env.puerto, () => {
  console.log(`✔ API de FlyAdventure en http://localhost:${env.puerto}/api`);
});
