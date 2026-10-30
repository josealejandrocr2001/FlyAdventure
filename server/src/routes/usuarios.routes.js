import { Router } from 'express';
import { ROLES, autenticar, autorizar } from '../middlewares/auth.js';
import { cambiarEstadoUsuario, crearUsuario, listarUsuarios } from '../services/usuarios.service.js';

// Todas las rutas de este archivo son solo para Administrador
const router = Router();
router.use(autenticar, autorizar(ROLES.ADMINISTRADOR));

// GET /api/usuarios?rol=Piloto
router.get('/', async (req, res) => {
  res.json(await listarUsuarios({ rol: req.query.rol }));
});

// POST /api/usuarios  → crea Administrador o Piloto
router.post('/', async (req, res) => {
  res.status(201).json(await crearUsuario(req.body));
});

// PATCH /api/usuarios/:id/activo  { "activo": false }
router.patch('/:id/activo', async (req, res) => {
  res.json(await cambiarEstadoUsuario(Number(req.params.id), req.body.activo, req.usuario.idUsuario));
});

export default router;
