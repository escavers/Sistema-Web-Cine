const FuncionService = require('../services/funcion.service');

const listarFunciones = async (req, res, next) => {
  try {
    const funciones = await FuncionService.obtenerFuncionesActivas();
    res.status(200).json(funciones);
  } catch (error) {
    next(error);
  }
};

const obtenerAsientosPorFuncion = async (req, res, next) => {
  try {
    const idFuncion = parseInt(req.params.id, 10);
    const asientos = await FuncionService.obtenerAsientosPorFuncion(idFuncion);
    res.status(200).json(asientos);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listarFunciones,
  obtenerAsientosPorFuncion,
};
