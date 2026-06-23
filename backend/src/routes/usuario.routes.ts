import { Router } from 'express';
import {
  actualizarUsuario,
  crearUsuario,
  darBajaUsuario,
  listarUsuarios
} from '../controllers/usuario.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRoles('ADMINISTRADOR'));

router.get('/', listarUsuarios);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', darBajaUsuario);

export default router;
