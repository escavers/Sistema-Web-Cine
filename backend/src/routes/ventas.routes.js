const express = require('express');
const VentaController = require('../controllers/venta.controller');
const CancelacionController = require('../controllers/cancelacion.controller');
const FuncionController = require('../controllers/funcion.controller');
const ComprobanteController = require('../controllers/comprobante.controller');
const EmailController = require('../controllers/email.controller');
const UsuarioController = require('../controllers/usuario.controller');

const router = express.Router();

router.post('/ventas', VentaController.crearVenta);
router.post('/cancelaciones', CancelacionController.cancelarVenta);
router.get('/funciones', FuncionController.listarFunciones);
router.get('/funciones/:id/asientos', FuncionController.obtenerAsientosPorFuncion);
router.get('/comprobantes/:numero', ComprobanteController.obtenerComprobantePorNumero);
router.post('/enviar-comprobante-email', EmailController.enviarComprobanteEmail);
router.get('/usuarios/:id/email', UsuarioController.obtenerEmail);

module.exports = router;
