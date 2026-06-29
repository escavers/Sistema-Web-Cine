import { Router } from 'express';
import {
  login,
  me,
  registroClientePresencial,
  registroClienteWeb,
  actualizarPerfilPropio
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/registro-cliente', registroClienteWeb);
router.get('/me', authMiddleware, me);
router.put('/perfil', authMiddleware, actualizarPerfilPropio);

router.post(
  '/registro-presencial',
  authMiddleware,
  requireRoles('BOLETERIA', 'ADMINISTRADOR'),
  registroClientePresencial
);

export default router;
