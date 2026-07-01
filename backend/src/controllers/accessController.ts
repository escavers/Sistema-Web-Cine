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
      await connection.rollback();
      transactionStarted = false;

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
      try { await connection.rollback(); } catch (rollbackErr) { console.error("Error al hacer rollback:", rollbackErr); }
    }
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
    return { valido: false, motivo: 'ERROR_BD', mensaje: 'Error de base de datos al registrar el acceso.' };
  } finally {
    connection.release();
  }

  return result;
}

async function _findBoletoIdIndependent(qrCode: string): Promise<number | null> {
  try {
    const codeStr = qrCode.trim().toUpperCase();
    const normalizedNoHyphen = codeStr.replace(/-/g, '');
    // Intentar por codigoAcceso primero
    if (/^[A-Z2-9]{8}$/.test(normalizedNoHyphen)) {
      const canonical = `${normalizedNoHyphen.slice(0, 4)}-${normalizedNoHyphen.slice(4)}`;
      const [rows] = await pool.query<any[]>('SELECT idBoleto FROM Boleto WHERE codigoAcceso = ? LIMIT 1', [canonical]);
      if ((rows as any[]).length > 0) return (rows as any[])[0].idBoleto;
    }
    // Fallback legacy
    const parts = codeStr.split('-');
    let searchCode = codeStr;
    let foundId = false;
    if (parts.length >= 1) {
      const numFirst = Number(parts[0]);
      if (!isNaN(numFirst) && parts[0] !== '') { searchCode = parts[0]; foundId = true; }
      else if (codeStr.startsWith('T-') && parts.length >= 2) {
        const numSecond = Number(parts[1]);
        if (!isNaN(numSecond)) { searchCode = parts[1]; foundId = true; }
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

  // ══ ESTRATEGIA 1 (NUEVA): codigoAcceso seguro (XXXX-XXXX) ═══════════════
  // El encargado puede escribir con o sin guión. Ambas formas son aceptadas.
  const normalizedNoHyphen = codeStr.replace(/-/g, '');
  const isSecureCode = /^[A-Z2-9]{8}$/.test(normalizedNoHyphen);

  if (isSecureCode) {
    const canonicalCode = `${normalizedNoHyphen.slice(0, 4)}-${normalizedNoHyphen.slice(4)}`;
    const [rows] = await connection.query(
      'SELECT * FROM Boleto WHERE codigoAcceso = ? LIMIT 1 FOR UPDATE',
      [canonicalCode]
    );
    if ((rows as any[]).length > 0) {
      return await _processValidatedBoleto(connection, (rows as any[])[0], idEncargado);
    }
    // Formato nuevo pero no encontrado → código inválido
    return {
      valido: false,
      motivo: 'BOLETO_NO_ENCONTRADO',
      mensaje: 'Código de acceso inválido. No se encontró ninguna entrada con ese código.'
    };
  }

  // ══ ESTRATEGIA 2 (legado): Comprobante (C-XXXXXXXXX-ID) ════════════════
  let comprobanteNumero = '';
  if (codeStr.startsWith('CINE-')) {
    const match = codeStr.match(/C-\d+-\d+/);
    if (match) { comprobanteNumero = match[0]; isComprobante = true; }
  } else if (codeStr.startsWith('C-')) {
    comprobanteNumero = codeStr;
    isComprobante = true;
  }

  if (isComprobante) {
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
    // ══ ESTRATEGIA 3 (legado): [idBoleto]-S[Sala]-[Asiento] ═════════════
    let parsedIdBoleto: number | null = null;
    const parts = codeStr.split('-');

    if (parts.length >= 1) {
      const numFirst = Number(parts[0]);
      if (!isNaN(numFirst) && parts[0] !== '') {
        parsedIdBoleto = numFirst;
      } else if (codeStr.startsWith('T-') && parts.length >= 2) {
        const numSecond = Number(parts[1]);
        if (!isNaN(numSecond)) parsedIdBoleto = numSecond;
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
        let asientoId = codeStr;
        if (codeStr.startsWith('S') && !codeStr.startsWith('SALA-')) {
          const match = codeStr.match(/^S(\d+)-([A-Z]\d+)$/);
          if (match) asientoId = `SALA-${match[1]}-${match[2]}`;
        }
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

  return await _processValidatedBoleto(connection, boletos[0], idEncargado);
}

/**
 * Valida las reglas de negocio (fecha, estado, función) de un boleto encontrado en BD
 * y lo marca como usado si todo es correcto.
 */
async function _processValidatedBoleto(connection: any, boleto: any, idEncargado?: number): Promise<any> {
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
    return { valido: false, motivo: 'VENTA_NO_ENCONTRADA', mensaje: 'No se encontró la venta asociada a este boleto.' };
  }

  const idFuncion = ventaRows[0].idFuncion;

  const [funciones] = await connection.query(
    'SELECT f.*, p.titulo FROM Funcion f JOIN Pelicula p ON f.idPelicula = p.idPelicula WHERE f.idFuncion = ? AND f.estadoA = 1',
    [idFuncion]
  );

  if (funciones.length === 0) {
    return { valido: false, motivo: 'FUNCION_INEXISTENTE', mensaje: 'La función asociada a esta entrada no está activa o fue cancelada.' };
  }

  const funcion = funciones[0];

  // --- Validacion unificada de fecha + hora con objetos Date ---
  // Construye los momentos de inicio y fin de la funcion en hora local
  const [dateRows] = await connection.query('SELECT CURDATE() as today, NOW() as nowDT');
  const today = dateRows[0]?.today;   // YYYY-MM-DD (local de MySQL)
  const ahora = new Date();           // hora local del servidor Node

  // Extraer la fecha de la funcion como YYYY-MM-DD
  let fechaFunStr: string;
  if (funcion.fecha instanceof Date) {
    // MySQL puede devolver un objeto Date
    const fd = funcion.fecha as Date;
    fechaFunStr = `${fd.getFullYear()}-${String(fd.getMonth() + 1).padStart(2, '0')}-${String(fd.getDate()).padStart(2, '0')}`;
  } else {
    const s = String(funcion.fecha);
    const match = s.match(/\d{4}-\d{2}-\d{2}/);
    fechaFunStr = match ? match[0] : s;
  }

  // Obtener la fecha actual del sistema (local) en YYYY-MM-DD
  const todayStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

  if (fechaFunStr !== todayStr) {
    return { valido: false, motivo: 'FECHA_INCORRECTA', mensaje: `Esta entrada es para la fecha ${fechaFunStr}. Hoy es ${todayStr}.` };
  }

  // Construir DateTime de inicio y fin de la funcion usando la fecha de hoy
  function buildFuncionDateTime(fechaStr: string, horaStr: string): Date {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const [hh, mm, ss] = (horaStr || '00:00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, ss || 0);
  }

  const horaInicioStr = typeof funcion.horaInicio === 'string' ? funcion.horaInicio : String(funcion.horaInicio || '00:00:00');
  const horaFinStr    = typeof funcion.horaFin    === 'string' ? funcion.horaFin    : String(funcion.horaFin    || '23:59:59');

  let dtInicio = buildFuncionDateTime(fechaFunStr, horaInicioStr);
  let dtFin    = buildFuncionDateTime(fechaFunStr, horaFinStr);

  // Si la funcion termina antes de que empiece (cruce de medianoche), avanzar dtFin al dia siguiente
  if (dtFin <= dtInicio) {
    dtFin.setDate(dtFin.getDate() + 1);
  }

  // Permitir ingreso 30 minutos antes del inicio hasta el fin de la funcion
  const dtAcceso = new Date(dtInicio.getTime() - 30 * 60 * 1000);

  if (ahora < dtAcceso) {
    const diffMin = Math.ceil((dtAcceso.getTime() - ahora.getTime()) / 60000);
    return { valido: false, motivo: 'FUNCION_NO_INICIADA', mensaje: `La función inicia a las ${horaInicioStr.substring(0, 5)}. El acceso abre en ${diffMin} minuto(s).` };
  }

  if (ahora > dtFin) {
    return { valido: false, motivo: 'FUNCION_EXPIRADA', mensaje: `La función asociada a esta entrada ya finalizó a las ${horaFinStr.substring(0, 5)}.` };
  }

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
      codigoAcceso: boleto.codigoAcceso || null,
      idFuncion: idFuncion,
      pelicula: funcion.titulo,
      horaInicio: funcion.horaInicio,
      horaFin: funcion.horaFin
    }
  };
}
