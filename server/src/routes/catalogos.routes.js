import { Router } from 'express';
import { listarBloques, obtenerParametros } from '../services/catalogos.service.js';

const router = Router();

// GET /api/catalogos/bloques
router.get('/bloques', async (_req, res) => {
  res.json(await listarBloques());
});

// GET /api/catalogos/parametros  → reglas públicas (peso máximo, edad mínima...)
router.get('/parametros', async (_req, res) => {
  res.json(await obtenerParametros());
});

export default router;
