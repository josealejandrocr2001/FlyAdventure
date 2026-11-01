import { Router } from 'express';
import { ROLES, autenticar, autorizar } from '../middlewares/auth.js';
import { asignar, recomendar } from '../services/asignaciones.service.js';

const router = Router();

// Todo el módulo es solo para administradores
router.use(autenticar, autorizar(ROLES.ADMINISTRADOR));

// GET /api/asignaciones/recomendacion/:idReserva  → top 3 piloto + equipo con puntaje y explicación
router.get('/recomendacion/:idReserva', async (req, res) => {
  res.json(await recomendar(Number(req.params.idReserva)));
});

// POST /api/asignaciones  { idReserva, idPiloto, idEquipo, justificacion }
router.post('/', async (req, res) => {
  res.status(201).json(await asignar(req.body, req.usuario.idUsuario));
});

export default router;
