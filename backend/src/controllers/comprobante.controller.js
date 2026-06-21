const ComprobanteService = require('../services/comprobante.service');

const obtenerComprobantePorNumero = async (req, res, next) => {
  try {
    const numero = req.params.numero;
    const comprobante = await ComprobanteService.obtenerComprobantePorNumero(numero);
    res.status(200).json(comprobante);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerComprobantePorNumero,
};
