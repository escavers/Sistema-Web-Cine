const CancelacionService = require('../services/cancelacion.service');

const cancelarVenta = async (req, res, next) => {
  try {
    const { idVenta, usuarioA } = req.body;
    const resultado = await CancelacionService.procesarCancelacion({ idVenta, usuarioA });
    res.status(200).json({ message: 'Cancelación registrada con éxito', resultado });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  cancelarVenta,
};
