import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { listarPeliculas, crearPelicula, actualizarPelicula, eliminarPelicula } from '../controllers/pelicula.controller.js';

const router = Router();

router.get('/', listarPeliculas);
router.post('/', authMiddleware, requireRoles('ADMINISTRADOR'), crearPelicula);
router.put('/:id', authMiddleware, requireRoles('ADMINISTRADOR'), actualizarPelicula);
router.delete('/:id', authMiddleware, requireRoles('ADMINISTRADOR'), eliminarPelicula);

export default router;
