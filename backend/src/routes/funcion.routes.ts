import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { crearFuncion, eliminarFuncion } from '../controllers/funcionCrud.controller.js';
import { listarFunciones, obtenerAsientosPorFuncion } from '../controllers/funcion.controller.js';

const router = Router();

router.get('/', listarFunciones);
router.get('/:id/asientos', obtenerAsientosPorFuncion);
router.post('/', authMiddleware, requireRoles('ADMINISTRADOR'), crearFuncion);
router.delete('/:id', authMiddleware, requireRoles('ADMINISTRADOR'), eliminarFuncion);

export default router;
