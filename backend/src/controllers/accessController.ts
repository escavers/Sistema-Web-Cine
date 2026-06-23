import { pool } from '../config/db.js';

/**
 * @description Controlador encargado de la validación de pases y acceso (HU-16).
 */

/**
 * Valida si un identificador de pase QR corresponde a una entrada válida para la función en tiempo real.
 * @param {string} qrCode - El código escaneado del pase (puede coincidir con idBoleto o idAsiento).
 * @returns {Promise<object>} Objeto con el estado de la validez y detalles del acceso.
 */
export async function validateQrPass(qrCode: string): Promise<any> {
  // Determinar si el qrCode es numérico (idBoleto) o texto (idAsiento)
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

  // 1. Obtener la información del boleto
  const [boletos] = await pool.query<any[]>(query, params);

  if (boletos.length === 0) {
    return { 
      valido: false, 
      motivo: 'BOLETO_NO_ENCONTRADO', 
      mensaje: 'Boleto inválido o no registrado en el sistema.' 
    };
  }

  const boleto = boletos[0];

  // 2. Verificar estado del boleto (¿Ya fue utilizado o está cancelado?)
  if (boleto.estadoA === 0 || boleto.estadoA === false) {
    return { 
      valido: false, 
      motivo: 'BOLETO_INVALIDADO', 
      mensaje: 'Esta entrada ya ha sido utilizada, invalidada o cancelada.' 
    };
  }

  // 3. Verificar validez de la función
  const [funciones] = await pool.query<any[]>(
    'SELECT f.*, p.titulo FROM Funcion f JOIN Pelicula p ON f.idPelicula = p.idPelicula WHERE f.idFuncion = ? AND f.estadoA = 1',
    [boleto.idFuncion]
  );

  if (funciones.length === 0) {
    return { 
      valido: false, 
      motivo: 'FUNCION_INEXISTENTE', 
      mensaje: 'La función asociada a esta entrada no está activa o fue cancelada.' 
    };
  }

  const funcion = funciones[0];

  // 4. Verificar validez de fecha
  // Obtener fecha actual en formato local de Bolivia (YYYY-MM-DD)
  // Nota: Dado que el servidor corre en hora del sistema local, usamos la fecha local.
  const today = new Date().toLocaleDateString('sv-SE'); // sv-SE da formato YYYY-MM-DD
  if (funcion.fecha !== today) {
    return { 
      valido: false, 
      motivo: 'FECHA_INCORRECTA', 
      mensaje: `Esta entrada es para la fecha ${funcion.fecha}. Fecha actual del sistema: ${today}.` 
    };
  }

  // 5. Verificar validez de la hora: la función no debe haber finalizado.
  const currentTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
  if (funcion.horaFin < currentTime) {
    return { 
      valido: false, 
      motivo: 'FUNCION_EXPIRADA', 
      mensaje: `La función asociada a esta entrada ya finalizó a las ${funcion.horaFin}.` 
    };
  }

  // *** LÓGICA DE REGISTRO DE ACCESO EXITOSO ***
  // Si todo es correcto, marcar como usado (estadoA = 0) para evitar doble lectura.
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
        idFuncion: boleto.idFuncion,
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
