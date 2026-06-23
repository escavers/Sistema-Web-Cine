/**
 * @fileoverview Runner manual para pruebas unitarias e integración del desarrollador 4.
 * Este script se conecta a la base de datos real, inserta datos temporales para
 * realizar las pruebas del scheduler (HU-11) y validación de QR (HU-16),
 * ejecuta los tests y luego limpia los datos de prueba.
 */

import { pool } from './src/config/db.js';
import { runPromoSchedulerJob } from './src/services/promotionSchedulerService.js';
import { validateQrPass } from './src/controllers/accessController.js';

async function runAllD4Tests() {
  console.log("====================================================");
  console.log("=== INICIANDO PRUEBAS UNITARIAS DEL DESARROLLADOR 4 ===");
  console.log("====================================================\n");

  let testPeliculaId = 1;
  let testFuncionId: number | null = null;
  let testVentaId: number | null = null;
  let testBoletoIdSuccess: number | null = null;
  let testBoletoIdFailed: number | null = null;

  try {
    // --- 0. PREPARACIÓN DE DATOS DE PRUEBA ---
    console.log("--- [PRE-TEST] Insertando datos temporales de prueba en la BD ---");

    // Obtener una película de la base de datos o insertar una temporal
    const [peliculas] = await pool.query<any[]>('SELECT idPelicula FROM Pelicula LIMIT 1');
    if (peliculas.length > 0) {
      testPeliculaId = peliculas[0].idPelicula;
      // Asegurarse de que la fecha de estreno sea de hace más de 30 días para pasar la regla de negocio
      await pool.query(
        'UPDATE Pelicula SET fechaEstreno = DATE_SUB(CURDATE(), INTERVAL 45 DAY) WHERE idPelicula = ?',
        [testPeliculaId]
      );
    } else {
      const [insertPel] = await pool.query<any>(
        "INSERT INTO Pelicula (titulo, director, sinopsis, duracionMinutos, clasificacionEdad, fechaEstreno) VALUES (?, ?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL 45 DAY))",
        ["Pelicula Test Desarrollador 4", "Director Test", "Sinopsis de prueba", 120, "13"]
      );
      testPeliculaId = insertPel.insertId;
    }

    // Insertar una función de prueba para la sala 'SALA-1'
    const [insertFunc] = await pool.query<any>(
      `INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase, promocionActiva, estadoA) 
       VALUES (?, ?, CURDATE(), '14:00:00', '16:00:00', 20.00, 0, 1)`,
      ['SALA-1', testPeliculaId]
    );
    testFuncionId = insertFunc.insertId;
    console.log(`  -> Función temporal creada con ID: ${testFuncionId}`);

    // Insertar una venta temporal
    const [insertVenta] = await pool.query<any>(
      `INSERT INTO Venta (idCliente, fechaCompra, tipo, montoTotal, estado, estadoA) 
       VALUES (3, NOW(), 'ONLINE', 40.00, 'COMPRADO', 1)`
    );
    testVentaId = insertVenta.insertId;

    // Insertar boleto exitoso (estadoA = 1, asiento SALA-1-A1)
    const [insertBoletoSuccess] = await pool.query<any>(
      `INSERT INTO Boleto (idFuncion, idAsiento, idVenta, precioPagado, estadoA) 
       VALUES (?, 'SALA-1-A1', ?, 20.00, 1)`,
      [testFuncionId, testVentaId]
    );
    testBoletoIdSuccess = insertBoletoSuccess.insertId;

    // Insertar boleto fallido (ya usado/invalido, estadoA = 0, asiento SALA-1-A2)
    const [insertBoletoFailed] = await pool.query<any>(
      `INSERT INTO Boleto (idFuncion, idAsiento, idVenta, precioPagado, estadoA) 
       VALUES (?, 'SALA-1-A2', ?, 20.00, 0)`,
      [testFuncionId, testVentaId]
    );
    testBoletoIdFailed = insertBoletoFailed.insertId;

    console.log(`  -> Boletos temporales creados. Éxito ID: ${testBoletoIdSuccess}, Fallará ID: ${testBoletoIdFailed}\n`);


    // --- TEST CASE 1: PROCESO AUTOMÁTICO PROMOCIÓN 2x1 (HU-11) ---
    console.log("--- [TEST 1/2] EJECUTANDO SCHEDULER DE PROMOCIONES 2x1 ---");
    await runPromoSchedulerJob();

    // Verificar si la promoción se activó
    const [funcionVerificar] = await pool.query<any[]>(
      'SELECT promocionActiva FROM Funcion WHERE idFuncion = ?',
      [testFuncionId]
    );

    if (funcionVerificar[0]?.promocionActiva === 1) {
      console.log("\n[SUCCESS - HU-11] Prueba de Scheduler 2x1 finalizada exitosamente.");
      console.log("  -> La promoción 2x1 fue activada correctamente para la función de prueba.");
    } else {
      console.error("\n[FAILURE - HU-11] El scheduler corrió pero no activó la promoción.");
    }

    console.log("\n=========================================\n");


    // --- TEST CASE 2: VALIDACIÓN DE ACCESO POR QR (HU-16) ---
    console.log("--- [TEST 2/2] EJECUTANDO LLAMADA DE VALIDACIÓN DE QR ---");

    if (testBoletoIdSuccess && testBoletoIdFailed) {
      // Simular lectura de boleto válido
      console.log(`Simulando lectura de boleto válido con ID: ${testBoletoIdSuccess}...`);
      const resultadoSuccess = await validateQrPass(String(testBoletoIdSuccess));

      if (resultadoSuccess && resultadoSuccess.valido) {
        console.log("\n[SUCCESS - HU-16] Validación Exitosa:");
        console.log(`  -> Mensaje: ${resultadoSuccess.mensaje}`);
        console.log(`  -> Detalle: Asiento ${resultadoSuccess.detalle.asientoId}`);
        
        // Verificar si el estado del boleto cambió a 0 en la BD
        const [boletoVerificar] = await pool.query<any[]>(
          'SELECT estadoA FROM Boleto WHERE idBoleto = ?',
          [testBoletoIdSuccess]
        );
        if (boletoVerificar[0]?.estadoA === 0) {
          console.log(`  -> BD: El boleto fue marcado como usado (estadoA = 0) correctamente.`);
        } else {
          console.error(`  -> [ERROR]: El boleto no fue marcado como usado en la base de datos.`);
        }
      } else {
        console.error("\n[FAILURE - HU-16] La validación de QR para boleto válido falló:", resultadoSuccess);
      }

      // Simular lectura de boleto inválido (ya usado/inactivo)
      console.log(`\nSimulando lectura de boleto ya usado con ID: ${testBoletoIdFailed}...`);
      const resultadoFailure = await validateQrPass(String(testBoletoIdFailed));

      if (resultadoFailure && !resultadoFailure.valido) {
        console.log("\n[SUCCESS - HU-16] Validación Fallida Correctamente:");
        console.log(`  -> Motivo esperado: ${resultadoFailure.motivo}`);
        console.log(`  -> Mensaje: ${resultadoFailure.mensaje}`);
      } else {
        console.error("\n[FAILURE - HU-16] El boleto usado fue validado erróneamente como correcto.");
      }
    }

  } catch (error) {
    console.error("\n[ERROR FATAL DEL TEST RUNNER] Un error inesperado detuvo la ejecución de las pruebas.");
    console.error(error);
  } finally {
    // --- 9. LIMPIEZA DE DATOS ---
    console.log("\n--- [POST-TEST] Limpiando datos temporales de prueba en la BD ---");
    try {
      if (testBoletoIdSuccess) {
        await pool.query('DELETE FROM Boleto WHERE idBoleto = ?', [testBoletoIdSuccess]);
      }
      if (testBoletoIdFailed) {
        await pool.query('DELETE FROM Boleto WHERE idBoleto = ?', [testBoletoIdFailed]);
      }
      if (testVentaId) {
        await pool.query('DELETE FROM Venta WHERE idVenta = ?', [testVentaId]);
      }
      if (testFuncionId) {
        await pool.query('DELETE FROM Funcion WHERE idFuncion = ?', [testFuncionId]);
      }
      console.log("  -> Limpieza finalizada correctamente.");
    } catch (cleanError) {
      console.error("  -> Error durante la limpieza de la base de datos:", cleanError);
    }

    await pool.end();
    console.log("\n====================================================");
    console.log("=== FIN DE PRUEBAS SIMULADAS D4 ===");
    console.log("====================================================");
  }
}

runAllD4Tests();
