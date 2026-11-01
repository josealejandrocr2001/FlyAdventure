import { Router } from 'express';
import { ROLES, autenticar, autorizar } from '../middlewares/auth.js';
import {
  actualizarPiloto, agregarDisponibilidad, eliminarDisponibilidad, listarDisponibilidad,
  listarPilotos, obtenerAgenda, obtenerPiloto, registrarResultado
} from '../services/pilotos.service.js';

const router = Router();
const soloAdmin = [autenticar, autorizar(ROLES.ADMINISTRADOR)];
const soloPiloto = [autenticar, autorizar(ROLES.PILOTO)];

// ---- Rol Piloto (van antes de /:id para que "agenda" no se lea como un id) ----

// GET /api/pilotos/agenda  → vuelos asignados al piloto con sesión
router.get('/agenda', soloPiloto, async (req, res) => {
  res.json(await obtenerAgenda(req.usuario.idUsuario));
});

// POST /api/pilotos/agenda/:idReserva/resultado
// { ejecutado, duracionRealMin, vientoDespegueKmh, motivoNoRealizado, observaciones }
router.post('/agenda/:idReserva/resultado', soloPiloto, async (req, res) => {
  res.status(201).json(await registrarResultado(req.usuario.idUsuario, Number(req.params.idReserva), req.body));
});

// ---- Administrador ----

router.get('/', soloAdmin, async (_req, res) => {
  res.json(await listarPilotos());
});

router.get('/:id', soloAdmin, async (req, res) => {
  res.json(await obtenerPiloto(Number(req.params.id)));
});

// PUT /api/pilotos/:id  { numeroLicencia, nivelCertificacion, fechaVencCertificacion, horasVuelo, pesoKg, disponible }
router.put('/:id', soloAdmin, async (req, res) => {
  res.json(await actualizarPiloto(Number(req.params.id), req.body));
});

// GET /api/pilotos/:id/disponibilidad?desde=AAAA-MM-DD
router.get('/:id/disponibilidad', soloAdmin, async (req, res) => {
  res.json(await listarDisponibilidad(Number(req.params.id), { desde: req.query.desde }));
});

// POST /api/pilotos/:id/disponibilidad  { fecha, idBloques: [1, 2] }
router.post('/:id/disponibilidad', soloAdmin, async (req, res) => {
  res.status(201).json(await agregarDisponibilidad(Number(req.params.id), req.body));
});

// DELETE /api/pilotos/:id/disponibilidad/:idDisponibilidad
router.delete('/:id/disponibilidad/:idDisponibilidad', soloAdmin, async (req, res) => {
  await eliminarDisponibilidad(Number(req.params.id), Number(req.params.idDisponibilidad));
  res.status(204).end();
});

export default router;
