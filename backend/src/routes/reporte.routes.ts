import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { reporteOcupacion, reporteMasVistas, reporteVentas, historialCliente } from '../controllers/reporte.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRoles('ADMINISTRADOR'));

router.get('/ocupacion', reporteOcupacion);
router.get('/mas-vistas', reporteMasVistas);
router.get('/ventas', reporteVentas);
router.get('/historial/:idCliente', historialCliente);

export default router;
