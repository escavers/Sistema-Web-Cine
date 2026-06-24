import { pool } from '../config/db.js';

/**
 * @description Controlador encargado de la validación de pases y acceso (HU-16).
 */

/**
 * Valida si un identificador de pase QR corresponde a una entrada válida para la función en tiempo real.
 */
export async function validateQrPass(qrCode: string, idEncargado?: number): Promise<any> {
  const result = await _validateQrPassInternal(qrCode);

  if (idEncargado) {
    try {
      let idBoleto = null;
      if (result.detalle?.idBoleto) {
        idBoleto = result.detalle.idBoleto;
      } else {
        const isNumeric = /^\d+$/.test(qrCode);
        const [boletos] = await pool.query<any[]>(
          isNumeric
            ? 'SELECT idBoleto FROM Boleto WHERE idBoleto = ? LIMIT 1'
            : 'SELECT idBoleto FROM Boleto WHERE idAsiento = ? LIMIT 1',
          [isNumeric ? Number(qrCode) : qrCode]
        );
        if (boletos.length > 0) idBoleto = boletos[0].idBoleto;
      }

      await pool.query(
        'INSERT INTO EscanearBoleto (fechaHora, resultado, idBoleto, idEncargado, estadoA, fechaA, usuarioA) VALUES (NOW(), ?, ?, ?, 1, CURDATE(), ?)',
        [result.motivo, idBoleto, idEncargado, idEncargado]
      );
    } catch (e) {
      console.error("Error al registrar en EscanearBoleto:", e);
    }
  }

  return result;
}

async function _validateQrPassInternal(qrCode: string): Promise<any> {
  const isNumeric = /^\d+$/.test(qrCode);

  let query = '';
  let params: any[] = [];

  if (isNumeric) {
    query = 'SELECT * FROM Boleto WHERE idBoleto = ? LIMIT 1';
    params = [Number(qrCode)];
  } else {
    query = 'SELECT * FROM Boleto WHERE idAsiento = ? LIMIT 1';
    params = [qrCode];
  }

  const [boletos] = await pool.query<any[]>(query, params);

  if (boletos.length === 0) {
    return {
      valido: false,
      motivo: 'BOLETO_NO_ENCONTRADO',
      mensaje: 'Boleto inválido o no registrado en el sistema.'
    };
  }

  const boleto = boletos[0];

  if (boleto.estadoA === 0 || boleto.estadoA === false) {
    return {
      valido: false,
      motivo: 'BOLETO_INVALIDADO',
      mensaje: 'Esta entrada ya ha sido utilizada, invalidada o cancelada.'
    };
  }

  const [ventaRows] = await pool.query<any[]>(
    'SELECT v.idFuncion FROM Venta v WHERE v.idVenta = ?',
    [boleto.idVenta]
  );

  if (!ventaRows.length) {
    return {
      valido: false,
      motivo: 'VENTA_NO_ENCONTRADA',
      mensaje: 'No se encontró la venta asociada a este boleto.'
    };
  }

  const idFuncion = ventaRows[0].idFuncion;

  const [funciones] = await pool.query<any[]>(
    'SELECT f.*, p.titulo FROM Funcion f JOIN Pelicula p ON f.idPelicula = p.idPelicula WHERE f.idFuncion = ? AND f.estadoA = 1',
    [idFuncion]
  );

  if (funciones.length === 0) {
    return {
      valido: false,
      motivo: 'FUNCION_INEXISTENTE',
      mensaje: 'La función asociada a esta entrada no está activa o fue cancelada.'
    };
  }

  const funcion = funciones[0];

  const today = new Date().toLocaleDateString('sv-SE');
  if (funcion.fecha !== today) {
    return {
      valido: false,
      motivo: 'FECHA_INCORRECTA',
      mensaje: `Esta entrada es para la fecha ${funcion.fecha}. Fecha actual del sistema: ${today}.`
    };
  }

  const currentTime = new Date().toTimeString().split(' ')[0];
  if (funcion.horaFin < currentTime) {
    return {
      valido: false,
      motivo: 'FUNCION_EXPIRADA',
      mensaje: `La función asociada a esta entrada ya finalizó a las ${funcion.horaFin}.`
    };
  }

  try {
    await pool.query(
      'UPDATE Boleto SET estadoA = 0 WHERE idBoleto = ?',
      [boleto.idBoleto]
    );

    return {
      valido: true,
      motivo: 'ACCESO_EXITOSO',
      mensaje: `Acceso concedido para la película "${funcion.titulo}". Entrada válida.`,
      detalle: {
        idBoleto: boleto.idBoleto,
        asientoId: boleto.idAsiento,
        idFuncion: idFuncion,
        pelicula: funcion.titulo,
        horaInicio: funcion.horaInicio,
        horaFin: funcion.horaFin
      }
    };

  } catch (e) {
    console.error("Error al registrar uso de boleto:", e);
    return {
      valido: false,
      motivo: 'ERROR_BD',
      mensaje: 'Error de base de datos al registrar el acceso.'
    };
  }
}
