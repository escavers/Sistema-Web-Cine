import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { reporteOcupacion, reporteMasVistas, reporteVentas, historialCliente } from '../controllers/reporte.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/ocupacion', requireRoles('ADMINISTRADOR'), reporteOcupacion);
router.get('/mas-vistas', requireRoles('ADMINISTRADOR'), reporteMasVistas);
router.get('/ventas', requireRoles('ADMINISTRADOR'), reporteVentas);
router.get('/historial/:idCliente', requireRoles('CLIENTE', 'BOLETERIA', 'ADMINISTRADOR'), historialCliente);

export default router;
