// Genera el hash BCrypt de una contraseña para insertarlo a mano en MySQL.
// Uso: npm run hash -- "MiContrasena123"
import bcrypt from 'bcryptjs';

const contrasena = process.argv[2];
if (!contrasena) {
  console.error('Uso: npm run hash -- "MiContrasena123"');
  process.exit(1);
}
console.log(await bcrypt.hash(contrasena, 10));
