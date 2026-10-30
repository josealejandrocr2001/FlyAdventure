import { Router } from 'express';
import { ROLES, autenticar, autenticarOpcional, autorizar } from '../middlewares/auth.js';
import {
  actualizarReserva, cambiarEstadoReserva, consultarDisponibilidad, consultarPorCodigo,
  crearReserva, listarMisReservas, listarReservas, obtenerHistorialEstados, obtenerReservaAdmin
} from '../services/reservas.service.js';

const router = Router();
const soloAdmin = [autenticar, autorizar(ROLES.ADMINISTRADOR)];

// ---- Públicas ----

// GET /api/reservas/disponibilidad?fecha=2026-11-05
router.get('/disponibilidad', async (req, res) => {
  res.json(await consultarDisponibilidad(req.query.fecha));
});

// GET /api/reservas/consulta?codigo=FA-XXXX&documento=123
router.get('/consulta', async (req, res) => {
  res.json(await consultarPorCodigo(req.query));
});

// POST /api/reservas  → invitado o cliente con sesión (el token es opcional)
router.post('/', autenticarOpcional, async (req, res) => {
  res.status(201).json(await crearReserva(req.body, req.usuario));
});

// ---- Cliente con cuenta ----

// GET /api/reservas/mias  → historial de vuelos
router.get('/mias', autenticar, autorizar(ROLES.CLIENTE), async (req, res) => {
  res.json(await listarMisReservas(req.usuario.idUsuario));
});

// ---- Administrador ----

// GET /api/reservas?fecha=&estado=&idServicio=&busqueda=
router.get('/', soloAdmin, async (req, res) => {
  res.json(await listarReservas(req.query));
});

router.get('/:id', soloAdmin, async (req, res) => {
  res.json(await obtenerReservaAdmin(Number(req.params.id)));
});

router.get('/:id/historial', soloAdmin, async (req, res) => {
  res.json(await obtenerHistorialEstados(Number(req.params.id)));
});

// PUT /api/reservas/:id  { idServicio, fecha, idBloque }
router.put('/:id', soloAdmin, async (req, res) => {
  res.json(await actualizarReserva(Number(req.params.id), req.body, req.usuario.idUsuario));
});

// PATCH /api/reservas/:id/estado  { estado: 'Confirmada', medioPago: 'Nequi' }
router.patch('/:id/estado', soloAdmin, async (req, res) => {
  res.json(await cambiarEstadoReserva(Number(req.params.id), req.body, req.usuario.idUsuario));
});

export default router;
