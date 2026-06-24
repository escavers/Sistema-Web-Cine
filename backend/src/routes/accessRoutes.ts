import express from 'express';
import { validateQrPass } from '../controllers/accessController.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router = express.Router();

// Endpoint para validar pase QR escaneado (HU-16)
router.post('/validate', authMiddleware, requireRoles('ADMINISTRADOR', 'ACCESO'), async (req: express.Request, res: express.Response): Promise<any> => {
  const { qrCode } = req.body;

  if (!qrCode) {
    return res.status(400).json({ ok: false, mensaje: 'Se requiere el código QR.' });
  }

  try {
    const idEncargado = req.user?.idUsuario;
    const resultado = await validateQrPass(String(qrCode), idEncargado);

    if (resultado.valido) {
      return res.status(200).json({ 
        ok: true, 
        mensaje: resultado.mensaje, 
        detalle: resultado.detalle 
      });
    } else {
      // Devolver código de estado HTTP adecuado según la regla de negocio
      let statusCode = 403; 
      if (resultado.motivo === 'BOLETO_NO_ENCONTRADO' || resultado.motivo === 'FUNCION_INEXISTENTE') {
        statusCode = 404;
      } else if (resultado.motivo === 'FUNCION_EXPIRADA') {
        statusCode = 410; // Gone (expirado)
      }
      return res.status(statusCode).json({ 
        ok: false, 
        motivo: resultado.motivo, 
        mensaje: resultado.mensaje 
      });
    }
  } catch (error) {
    console.error('Error al procesar validación QR:', error);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del sistema de acceso.' });
  }
});

export default router;
