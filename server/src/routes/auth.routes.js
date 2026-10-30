import { Router } from 'express';
import { autenticar } from '../middlewares/auth.js';
import { iniciarSesion, obtenerPerfil, registrarCliente } from '../services/auth.service.js';

const router = Router();

// POST /api/auth/registro  → cuenta de Cliente (pública)
router.post('/registro', async (req, res) => {
  res.status(201).json(await registrarCliente(req.body));
});

// POST /api/auth/login  → { token, usuario }
router.post('/login', async (req, res) => {
  res.json(await iniciarSesion(req.body));
});

// GET /api/auth/perfil  → datos del usuario con sesión
router.get('/perfil', autenticar, async (req, res) => {
  res.json(await obtenerPerfil(req.usuario.idUsuario));
});

export default router;
