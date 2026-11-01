import { Router } from 'express';
import { ROLES, autenticar, autorizar } from '../middlewares/auth.js';
import {
  actualizarEquipo, cambiarEstadoEquipo, crearEquipo, listarEquipos, obtenerEquipo
} from '../services/equipos.service.js';

const router = Router();

// Todo el módulo es solo para administradores
router.use(autenticar, autorizar(ROLES.ADMINISTRADOR));

// GET /api/equipos?estado=Disponible
router.get('/', async (req, res) => {
  res.json(await listarEquipos({ estado: req.query.estado }));
});

router.get('/:id', async (req, res) => {
  res.json(await obtenerEquipo(Number(req.params.id)));
});

router.post('/', async (req, res) => {
  res.status(201).json(await crearEquipo(req.body));
});

router.put('/:id', async (req, res) => {
  res.json(await actualizarEquipo(Number(req.params.id), req.body));
});

// PATCH /api/equipos/:id/estado  { "estado": "En mantenimiento" }
router.patch('/:id/estado', async (req, res) => {
  res.json(await cambiarEstadoEquipo(Number(req.params.id), req.body.estado));
});

export default router;
