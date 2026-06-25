import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { listarSalas, listarAsientosSala, crearSala, actualizarSala, eliminarSala } from '../controllers/sala.controller.js';

const router = Router();

router.get('/', listarSalas);
router.get('/:id/asientos', authMiddleware, requireRoles('ADMINISTRADOR'), listarAsientosSala);
router.post('/', authMiddleware, requireRoles('ADMINISTRADOR'), crearSala);
router.put('/:id', authMiddleware, requireRoles('ADMINISTRADOR'), actualizarSala);
router.delete('/:id', authMiddleware, requireRoles('ADMINISTRADOR'), eliminarSala);

export default router;
