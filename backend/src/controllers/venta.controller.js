const VentaService = require('../services/venta.service');

const crearVenta = async (req, res, next) => {
  try {
    const data = req.body;
    const venta = await VentaService.procesarVenta(data);
    res.status(201).json({ message: 'Venta procesada correctamente', venta });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearVenta,
};
