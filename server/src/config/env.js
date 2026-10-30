// Lee la configuración desde las variables de entorno (archivo .env).
// Las credenciales nunca se escriben en el código (RNF001).

const requerida = (nombre) => {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revise server/.env (copie .env.example).`);
  }
  return valor;
};

export const env = {
  puerto: Number(process.env.PORT) || 4000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'flyadventure'
  },
  jwt: {
    secreto: requerida('JWT_SECRET'),
    expiraEn: process.env.JWT_EXPIRES_IN || '8h'
  },
  corsOrigen: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim())
};
