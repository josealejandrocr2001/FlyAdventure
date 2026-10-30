import { Router } from 'express';
import { ROLES, autenticar, autorizar } from '../middlewares/auth.js';
import {
  actualizarServicio, cambiarActivoServicio, crearServicio, eliminarServicio, listarServicios
} from '../services/servicios.service.js';

const router = Router();
const soloAdmin = [autenticar, autorizar(ROLES.ADMINISTRADOR)];

// GET /api/servicios  → catálogo público (solo activos)
router.get('/', async (_req, res) => {
  res.json(await listarServicios());
});

// GET /api/servicios/todos  → incluye ocultos (panel)
router.get('/todos', soloAdmin, async (_req, res) => {
  res.json(await listarServicios({ incluirInactivos: true }));
});

router.post('/', soloAdmin, async (req, res) => {
  res.status(201).json(await crearServicio(req.body));
});

router.put('/:id', soloAdmin, async (req, res) => {
  res.json(await actualizarServicio(Number(req.params.id), req.body));
});

// PATCH /api/servicios/:id/activo  { "activo": false }
router.patch('/:id/activo', soloAdmin, async (req, res) => {
  res.json(await cambiarActivoServicio(Number(req.params.id), req.body.activo));
});

router.delete('/:id', soloAdmin, async (req, res) => {
  await eliminarServicio(Number(req.params.id));
  res.status(204).end();
});

export default router;
