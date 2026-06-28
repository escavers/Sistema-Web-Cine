import { pool } from '../config/db.js';

/**
 * @description Controlador encargado de la validación de pases y acceso (HU-16).
 */

/**
 * Valida si un identificador de pase QR corresponde a una entrada válida para la función en tiempo real.
 */
export async function validateQrPass(qrCode: string, idEncargado?: number): Promise<any> {
  const connection = await pool.getConnection();
  let result: any;
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    result = await _validateQrPassInternal(connection, qrCode, idEncargado);

    if (result.valido) {
      // Si es válido, registramos en EscanearBoleto dentro de la misma transacción para consistencia atómica
      if (idEncargado) {
        const idBoleto = result.detalle?.idBoleto || null;
        await connection.query(
          'INSERT INTO EscanearBoleto (fechaHora, resultado, idBoleto, idEncargado, estadoA, fechaA, usuarioA) VALUES (NOW(), ?, ?, ?, 1, CURDATE(), ?)',
          [result.motivo, idBoleto, idEncargado, idEncargado]
        );
      }
      await connection.commit();
      transactionStarted = false;
    } else {
      // Si no es válido, revertimos bloqueos
      await connection.rollback();
      transactionStarted = false;

      // Registrar fallo en EscanearBoleto de forma independiente
      if (idEncargado) {
        const idBoleto = result.detalle?.idBoleto || await _findBoletoIdIndependent(qrCode);
        await pool.query(
          'INSERT INTO EscanearBoleto (fechaHora, resultado, idBoleto, idEncargado, estadoA, fechaA, usuarioA) VALUES (NOW(), ?, ?, ?, 1, CURDATE(), ?)',
          [result.motivo, idBoleto, idEncargado, idEncargado]
        );
      }
    }
  } catch (err) {
    console.error("Error en validateQrPass:", err);
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Error al hacer rollback:", rollbackErr);
      }
    }
    // Registrar error en EscanearBoleto
    if (idEncargado) {
      try {
        const idBoleto = await _findBoletoIdIndependent(qrCode).catch(() => null);
        await pool.query(
          'INSERT INTO EscanearBoleto (fechaHora, resultado, idBoleto, idEncargado, estadoA, fechaA, usuarioA) VALUES (NOW(), ?, ?, ?, 1, CURDATE(), ?)',
          ['ERROR_BD', idBoleto, idEncargado, idEncargado]
        );
      } catch (logErr) {
        console.error("Error al registrar fallo de BD en EscanearBoleto:", logErr);
      }
    }
    return {
      valido: false,
      motivo: 'ERROR_BD',
      mensaje: 'Error de base de datos al registrar el acceso.'
    };
  } finally {
    connection.release();
  }

  return result;
}

async function _findBoletoIdIndependent(qrCode: string): Promise<number | null> {
  try {
    let searchCode = qrCode.trim().toUpperCase();
    const parts = searchCode.split('-');
    let foundId = false;
    if (parts.length >= 1) {
      const numFirst = Number(parts[0]);
      if (!isNaN(numFirst) && parts[0] !== '') {
        searchCode = parts[0];
        foundId = true;
      } else if (searchCode.startsWith('T-') && parts.length >= 2) {
        const numSecond = Number(parts[1]);
        if (!isNaN(numSecond)) {
          searchCode = parts[1];
          foundId = true;
        }
      }
    }
    const isNumeric = foundId || /^\d+$/.test(searchCode);
    const [boletos] = await pool.query<any[]>(
      isNumeric
        ? 'SELECT idBoleto FROM Boleto WHERE idBoleto = ? LIMIT 1'
        : 'SELECT idBoleto FROM Boleto WHERE idAsiento = ? LIMIT 1',
      [isNumeric ? Number(searchCode) : searchCode]
    );
    if (boletos.length > 0) return boletos[0].idBoleto;
  } catch (e) {
    console.error("Error en _findBoletoIdIndependent:", e);
  }
  return null;
}

async function _validateQrPassInternal(connection: any, qrCode: string, idEncargado?: number): Promise<any> {
  let query = '';
  let params: any[] = [];
  let isComprobante = false;

  // Normalizar entrada
  const codeStr = qrCode.trim().toUpperCase();

  // 1. Verificar si es un formato de comprobante (ej: CINE-C-1782366890414-2-CLIENTE-1719289291 o C-1782366890414-2)
  let comprobanteNumero = '';
  if (codeStr.startsWith('CINE-')) {
    const match = codeStr.match(/C-\d+-\d+/);
    if (match) {
      comprobanteNumero = match[0];
      isComprobante = true;
    }
  } else if (codeStr.startsWith('C-')) {
    comprobanteNumero = codeStr;
    isComprobante = true;
  }

  if (isComprobante) {
    // Si es un comprobante, buscamos el primer boleto activo (estadoA = 1) para esta venta
    query = `
      SELECT b.* FROM Boleto b
      JOIN Venta v ON b.idVenta = v.idVenta
      JOIN Comprobante c ON v.idVenta = c.idVenta
      WHERE c.numero = ? AND b.estadoA = 1
      LIMIT 1
      FOR UPDATE
    `;
    params = [comprobanteNumero];
  } else {
    // 2. Verificar si es formato estructurado [idBoleto]-S[idSala]-[Asiento] o T-[idBoleto]-S[idSala]-[Asiento]
    let parsedIdBoleto: number | null = null;
    const parts = codeStr.split('-');
    
    if (parts.length >= 1) {
      const numFirst = Number(parts[0]);
      if (!isNaN(numFirst) && parts[0] !== '') {
        parsedIdBoleto = numFirst;
      } else if (codeStr.startsWith('T-') && parts.length >= 2) {
        const numSecond = Number(parts[1]);
        if (!isNaN(numSecond)) {
          parsedIdBoleto = numSecond;
        }
      }
    }

    if (parsedIdBoleto !== null) {
      query = 'SELECT * FROM Boleto WHERE idBoleto = ? LIMIT 1 FOR UPDATE';
      params = [parsedIdBoleto];
    } else {
      const isNumeric = /^\d+$/.test(codeStr);
      if (isNumeric) {
        query = 'SELECT * FROM Boleto WHERE idBoleto = ? LIMIT 1 FOR UPDATE';
        params = [Number(codeStr)];
      } else {
        // Formato asiento (ej: SALA-1-A1 o S1-A1)
        let asientoId = codeStr;
        if (codeStr.startsWith('S') && !codeStr.startsWith('SALA-')) {
          // Si ingresan S1-A1, normalizar a SALA-1-A1
          const match = codeStr.match(/^S(\d+)-([A-Z]\d+)$/);
          if (match) {
            asientoId = `SALA-${match[1]}-${match[2]}`;
          }
        }

        // Buscar el boleto activo para hoy en esa sala/asiento para evitar ambigüedad en auditorías
        query = `
          SELECT b.* FROM Boleto b
          JOIN Venta v ON b.idVenta = v.idVenta
          JOIN Funcion f ON v.idFuncion = f.idFuncion
          WHERE b.idAsiento = ? AND f.fecha = CURDATE() AND f.estadoA = 1
          ORDER BY b.estadoA DESC, f.horaInicio ASC
          LIMIT 1
          FOR UPDATE
        `;
        params = [asientoId];
      }
    }
  }

  let [boletos] = await connection.query(query, params);

  // Si buscamos por comprobante y no hay boletos activos (estadoA = 1),
  // pero el comprobante sí existe, significa que todos los boletos asociados ya fueron usados.
  if (isComprobante && boletos.length === 0) {
    const [comprobanteCheck] = await connection.query(
      `SELECT b.* FROM Boleto b
       JOIN Venta v ON b.idVenta = v.idVenta
       JOIN Comprobante c ON v.idVenta = c.idVenta
       WHERE c.numero = ? LIMIT 1`,
      [comprobanteNumero]
    );

    if (comprobanteCheck.length > 0) {
      return {
        valido: false,
        motivo: 'BOLETO_INVALIDADO',
        mensaje: 'Todas las entradas asociadas a este comprobante ya han sido utilizadas.'
      };
    }
  }

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

  const [ventaRows] = await connection.query(
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

  const [funciones] = await connection.query(
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

  // UPDATE Boleto actualizando estadoA y los campos de auditoría (fechaA, usuarioA)
  await connection.query(
    'UPDATE Boleto SET estadoA = 0, fechaA = CURDATE(), usuarioA = ? WHERE idBoleto = ?',
    [idEncargado || null, boleto.idBoleto]
  );

  const cleanSala = funcion.idSala.includes('SALA-')
    ? 'Sala ' + funcion.idSala.split('-').pop()
    : (funcion.idSala.startsWith('S') ? 'Sala ' + funcion.idSala.substring(1) : 'Sala ' + funcion.idSala);
  const asientoCorto = boleto.idAsiento.includes('-')
    ? boleto.idAsiento.split('-').pop()
    : boleto.idAsiento;

  return {
    valido: true,
    motivo: 'ACCESO_EXITOSO',
    mensaje: `Acceso concedido para la película "${funcion.titulo}" en ${cleanSala}, asiento ${asientoCorto}. Entrada válida.`,
    detalle: {
      idBoleto: boleto.idBoleto,
      asientoId: boleto.idAsiento,
      idFuncion: idFuncion,
      pelicula: funcion.titulo,
      horaInicio: funcion.horaInicio,
      horaFin: funcion.horaFin
    }
  };
}
