import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import {
  obtenerComprobantePorNumero,
  descargarComprobantePdf,
  descargarComprobanteTicketPdf,
} from '../controllers/comprobante.controller.js';

const router = Router();

router.get('/:numero', authMiddleware, requireRoles('ADMINISTRADOR', 'BOLETERIA', 'CLIENTE'), obtenerComprobantePorNumero);
router.get('/:numero/pdf', descargarComprobantePdf);
router.get('/:numero/ticket', authMiddleware, requireRoles('ADMINISTRADOR', 'BOLETERIA'), descargarComprobanteTicketPdf);

export default router;
