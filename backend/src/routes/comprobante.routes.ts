import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import {
  obtenerComprobantePorNumero,
  descargarComprobantePdf,
  descargarComprobanteTicketPdf,
} from '../controllers/comprobante.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/:numero', requireRoles('ADMINISTRADOR', 'BOLETERIA', 'CLIENTE'), obtenerComprobantePorNumero);
router.get('/:numero/pdf', requireRoles('ADMINISTRADOR', 'BOLETERIA', 'CLIENTE'), descargarComprobantePdf);
router.get('/:numero/ticket', requireRoles('ADMINISTRADOR', 'BOLETERIA', 'CLIENTE'), descargarComprobanteTicketPdf);

export default router;
