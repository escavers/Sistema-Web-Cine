import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { crearVenta } from '../controllers/venta.controller.js';
import { cancelarVenta } from '../controllers/cancelacion.controller.js';
import { listarFunciones, obtenerAsientosPorFuncion } from '../controllers/funcion.controller.js';
import { obtenerComprobantePorNumero } from '../controllers/comprobante.controller.js';
import { enviarComprobanteEmail } from '../controllers/email.controller.js';
import { obtenerEmail } from '../controllers/usuarioExtra.controller.js';

const router = Router();

router.get('/funciones', listarFunciones);
router.get('/funciones/:id/asientos', obtenerAsientosPorFuncion);
router.get('/comprobantes/:numero', obtenerComprobantePorNumero);

router.post('/ventas', authMiddleware, requireRoles('BOLETERIA', 'ADMINISTRADOR'), crearVenta);
router.post('/cancelaciones', authMiddleware, requireRoles('BOLETERIA', 'ADMINISTRADOR'), cancelarVenta);
router.post('/enviar-comprobante-email', authMiddleware, enviarComprobanteEmail);
router.get('/usuarios/:id/email', authMiddleware, requireRoles('BOLETERIA', 'ADMINISTRADOR'), obtenerEmail);

export default router;
