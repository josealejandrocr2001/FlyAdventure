import { Router } from 'express';
import { obtenerEncuesta, responderEncuesta } from '../services/encuestas.service.js';

const router = Router();

// GET /api/encuestas/:token
router.get('/:token', async (req, res) => {
  res.json(await obtenerEncuesta(req.params.token));
});

// POST /api/encuestas/:token  { satisfaccion: 1..5, comentario }
router.post('/:token', async (req, res) => {
  res.json(await responderEncuesta(req.params.token, req.body));
});

export default router;
