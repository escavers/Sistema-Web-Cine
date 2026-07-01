import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import {
  obtenerComprobantePorNumero,
  descargarComprobantePdf,
  descargarComprobanteTicketPdf,
} from '../controllers/comprobante.controller.js';

const router = Router();

router.get('/:numero', obtenerComprobantePorNumero);
router.get('/:numero/pdf', descargarComprobantePdf);
router.get('/:numero/ticket', authMiddleware, requireRoles('ADMINISTRADOR', 'BOLETERIA', 'CLIENTE'), descargarComprobanteTicketPdf);

export default router;
