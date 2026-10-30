// Configuración de Express: middlewares globales y registro de rutas.
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { manejadorErrores, rutaNoEncontrada } from './middlewares/errores.js';
import authRoutes from './routes/auth.routes.js';
import catalogosRoutes from './routes/catalogos.routes.js';
import encuestasRoutes from './routes/encuestas.routes.js';
import reservasRoutes from './routes/reservas.routes.js';
import serviciosRoutes from './routes/servicios.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: env.corsOrigen }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/salud', (_req, res) => res.json({ estado: 'ok', servicio: 'FlyAdventure API' }));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/encuestas', encuestasRoutes);

// ⬇ Joselin y Linay: registren aquí sus módulos, uno por línea, en orden alfabético.
//   Ejemplo: app.use('/api/pilotos', pilotosRoutes);

app.use(rutaNoEncontrada);
app.use(manejadorErrores);
