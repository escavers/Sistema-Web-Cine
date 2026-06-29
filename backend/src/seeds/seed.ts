import { pool } from '../config/db';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Iniciando seed de datos...');

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ── 1. ROLES ──
    console.log('Insertando roles...');
    const roles = [
      { id: 'ADMINISTRADOR', nombre: 'Administrador', desc: 'Control total del sistema' },
      { id: 'BOLETERIA', nombre: 'Encargado de Boletería', desc: 'Gestión de ventas presenciales y registro de clientes' },
      { id: 'CLIENTE', nombre: 'Cliente', desc: 'Cliente del cine con acceso al portal web' },
      { id: 'ACCESO', nombre: 'Encargado de Acceso', desc: 'Control de acceso a salas mediante validación de boletos QR' },
    ];

    for (const rol of roles) {
      await connection.query(
        `INSERT INTO Rol (idRol, nombre, descripcion, estadoA, fechaA, usuarioA)
         VALUES (?, ?, ?, 1, CURDATE(), NULL)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion)`,
        [rol.id, rol.nombre, rol.desc]
      );
    }

    // ── 2. USUARIOS ──
    console.log('Insertando usuarios...');
    const hash = await bcrypt.hash('admin123', 10);
    const hashBol = await bcrypt.hash('boleteria123', 10);
    const hashCli = await bcrypt.hash('cliente123', 10);
    const hashAcc = await bcrypt.hash('acceso123', 10);

    // Admin
    await connection.query(
      `INSERT INTO Usuario (nombre1, nombre2, apellidoP, apellidoM, ci, correo, telefono, fechaNacimiento, contrasena, nit, razonSocial, estado, estadoA, fechaA)
       VALUES ('Admin', NULL, 'General', NULL, '1234567', 'admin@cinelapaz.com', '76543210', '1985-03-15', ?, NULL, NULL, 1, 1, CURDATE())
       ON DUPLICATE KEY UPDATE contrasena = VALUES(contrasena)`,
      [hash]
    );
    const [adminRow] = await connection.query<any[]>('SELECT idUsuario FROM Usuario WHERE correo = ? LIMIT 1', ['admin@cinelapaz.com']);
    const adminId = adminRow[0]?.idUsuario;
    if (adminId) {
      await connection.query('INSERT IGNORE INTO Usuario_Rol (idUsuario, idRol) VALUES (?, ?)', [adminId, 'ADMINISTRADOR']);
    }

    // Boletería
    await connection.query(
      `INSERT INTO Usuario (nombre1, nombre2, apellidoP, apellidoM, ci, correo, telefono, fechaNacimiento, contrasena, nit, razonSocial, estado, estadoA, fechaA)
       VALUES ('María', 'Elena', 'Gonzales', 'Mamani', '7890123', 'boleteria@cinelapaz.com', '76543211', '1990-07-22', ?, NULL, NULL, 1, 1, CURDATE())
       ON DUPLICATE KEY UPDATE contrasena = VALUES(contrasena)`,
      [hashBol]
    );
    const [bolRow] = await connection.query<any[]>('SELECT idUsuario FROM Usuario WHERE correo = ? LIMIT 1', ['boleteria@cinelapaz.com']);
    const bolId = bolRow[0]?.idUsuario;
    if (bolId) {
      await connection.query('INSERT IGNORE INTO Usuario_Rol (idUsuario, idRol) VALUES (?, ?)', [bolId, 'BOLETERIA']);
    }

    // Encargado de Acceso
    await connection.query(
      `INSERT INTO Usuario (nombre1, nombre2, apellidoP, apellidoM, ci, correo, telefono, fechaNacimiento, contrasena, nit, razonSocial, estado, estadoA, fechaA)
       VALUES ('Jorge', NULL, 'Mendoza', 'Perez', '9012345', 'acceso@cinelapaz.com', '76543212', '1992-05-14', ?, NULL, NULL, 1, 1, CURDATE())
       ON DUPLICATE KEY UPDATE contrasena = VALUES(contrasena)`,
      [hashAcc]
    );
    const [accRow] = await connection.query<any[]>('SELECT idUsuario FROM Usuario WHERE correo = ? LIMIT 1', ['acceso@cinelapaz.com']);
    const accId = accRow[0]?.idUsuario;
    if (accId) {
      await connection.query('INSERT IGNORE INTO Usuario_Rol (idUsuario, idRol) VALUES (?, ?)', [accId, 'ACCESO']);
    }

    // Clientes demo
    const clientes = [
      { n1: 'Carlos', n2: null, aP: 'Mamani', aM: 'Condori', ci: '4567890', cor: 'cliente@cinelapaz.com', tel: '71234567', fn: '1995-01-10', nit: '4567890', razon: 'Carlos Mamani Condori' },
      { n1: 'Ana', n2: 'Lucía', aP: 'Flores', aM: 'Ríos', ci: '5678901', cor: 'ana.flores@email.com', tel: '72345678', fn: '1998-06-15', nit: '5678901', razon: 'Ana Lucía Flores Ríos' },
      { n1: 'Luis', n2: null, aP: 'Quispe', aM: 'Torres', ci: '6789012', cor: 'luis.quispe@email.com', tel: '73456789', fn: '1992-11-20', nit: '6789012', razon: 'Luis Quispe Torres' },
      { n1: 'María', n2: 'Fernanda', aP: 'Vargas', aM: 'López', ci: '7890124', cor: 'maria.vargas@email.com', tel: '74567890', fn: '2000-03-08', nit: '7890124', razon: 'María Fernanda Vargas López' },
      { n1: 'Pedro', n2: null, aP: 'Huanca', aM: 'Ramos', ci: '8901234', cor: 'pedro.huanca@email.com', tel: '75678901', fn: '1988-09-25', nit: '8901234', razon: 'Pedro Huanca Ramos' },
    ];

    for (const c of clientes) {
      await connection.query(
        `INSERT INTO Usuario (nombre1, nombre2, apellidoP, apellidoM, ci, correo, telefono, fechaNacimiento, contrasena, nit, razonSocial, estado, estadoA, fechaA)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURDATE())
         ON DUPLICATE KEY UPDATE contrasena = VALUES(contrasena)`,
        [c.n1, c.n2, c.aP, c.aM, c.ci, c.cor, c.tel, c.fn, hashCli, c.nit, c.razon]
      );
      const [cliRow] = await connection.query<any[]>('SELECT idUsuario FROM Usuario WHERE correo = ? LIMIT 1', [c.cor]);
      if (cliRow[0]) {
        await connection.query(
          'INSERT IGNORE INTO Usuario_Rol (idUsuario, idRol) VALUES (?, ?)',
          [cliRow[0].idUsuario, 'CLIENTE']
        );
      }
    }

    // ── 3. SALAS ──
    console.log('Insertando salas...');
    const salas = [
      { id: 'SALA-1', tipo: 'Estándar', cap: 80, fil: 8, col: 10 },
      { id: 'SALA-2', tipo: '3D', cap: 96, fil: 8, col: 12 },
      { id: 'SALA-3', tipo: 'VIP', cap: 48, fil: 6, col: 8 },
      { id: 'SALA-4', tipo: 'Estándar', cap: 120, fil: 10, col: 12 },
    ];

    for (const s of salas) {
      await connection.query(
        `INSERT INTO Sala (idSala, tipo, capacidadTotal, filas, columnas, estadoA, fechaA)
         VALUES (?, ?, ?, ?, ?, 1, CURDATE())
         ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), capacidadTotal = VALUES(capacidadTotal), filas = VALUES(filas), columnas = VALUES(columnas)`,
        [s.id, s.tipo, s.cap, s.fil, s.col]
      );
    }

    // ── 4. ASIENTOS ──
    console.log('Insertando asientos...');
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (const s of salas) {
      const [existing] = await connection.query<any[]>(
        'SELECT COUNT(*) as total FROM Asiento WHERE idSala = ?',
        [s.id]
      );

      if (existing[0].total === 0) {
        const values: any[][] = [];
        for (let f = 0; f < s.fil; f++) {
          for (let c = 1; c <= s.col; c++) {
            const idAsiento = `${s.id}-${letras[f]}${c}`;
            values.push([idAsiento, s.id, letras[f], c, 1, 1, null, null]);
          }
        }

        for (let i = 0; i < values.length; i += 100) {
          const lote = values.slice(i, i + 100);
          const placeholders = lote.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
          const flat = lote.flat();
          await connection.query(
            `INSERT INTO Asiento (idAsiento, idSala, fila, columna, estado, estadoA, fechaA, usuarioA)
             VALUES ${placeholders}`,
            flat
          );
        }
      }
    }

    // ── 5. PELÍCULAS ──
    console.log('Insertando películas...');
    const peliculas = [
      { tit: 'Inside Out 2', dir: 'Kelsey Mann', sin: 'Riley entra en la adolescencia y nuevas emociones llegan a la cabeza: Ansiedad, Vergüenza, Aburrimiento y Envidia.', dur: 100, clasi: 'TP', estreno: '2024-06-14', poster: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg' },
      { tit: 'Deadpool & Wolverine', dir: 'Shawn Levy', sin: 'Wade Wilson se ve forzado a unirse a Wolverine en una misión para salvar su tiempo-lineal.', dur: 128, clasi: '16', estreno: '2024-07-26', poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg' },
      { tit: 'Gladiator II', dir: 'Ridley Scott', sin: 'Lucio, hijo de Máximo, se ve obligado a luchar en el Coliseo mientras busca venganza.', dur: 148, clasi: '16', estreno: '2024-11-22', poster: 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg' },
      { tit: 'Moana 2', dir: 'David Derrick Jr.', sin: 'Moana viaja a mares lejanos después de recibir una llamada inesperada de sus ancestros.', dur: 100, clasi: 'TP', estreno: '2024-11-27', poster: 'https://image.tmdb.org/t/p/w500/aLVkiINlIeCkcZIzb7XHzPYvO7u.jpg' },
      { tit: 'Wicked', dir: 'Jon M. Chu', sin: 'La historia de las brujas de Oz antes de que Dorothy llegara, centrándose en Elphaba y Glinda.', dur: 160, clasi: 'TP', estreno: '2024-11-22', poster: 'https://image.tmdb.org/t/p/w500/xDGbZ0JJREmLdE3Mhe9aX7YQ0iD.jpg' },
      { tit: 'The Brutalist', dir: 'Brady Corbet', sin: 'Un arquitecto húngaro sobreviviente del Holocausto emigra a Estados Unidos.', dur: 215, clasi: '16', estreno: '2024-12-20', poster: 'https://image.tmdb.org/t/p/w500/d9JW3rYflRbIVqJTL5sEaOIR0s.jpg' },
      { tit: 'Nosferatu', dir: 'Robert Eggers', sin: 'Una obsesión gótica entre una joven y el antiguo vampiro Orlok.', dur: 132, clasi: '18', estreno: '2024-12-25', poster: 'https://image.tmdb.org/t/p/w500/5qGIxdEO841C0tPreYfUGK0SfgW.jpg' },
      { tit: 'El Señor de los Anillos: La Guerra de los Rohirrim', dir: 'Kenji Kamiyama', sin: 'La historia de Helm Martillo y la guerra de los Rohirrim contra los Dunlendinos.', dur: 134, clasi: '13', estreno: '2024-12-13', poster: 'https://image.tmdb.org/t/p/w500/cTf9sHcRCB9g0Ml7SfW1z0hRy5n.jpg' },
      { tit: 'Mufasa: El Rey León', dir: 'Barry Jenkins', sin: 'La historia de cómo Mufasa se convirtió en rey, narrada por Rafiki.', dur: 118, clasi: 'TP', estreno: '2024-12-20', poster: 'https://image.tmdb.org/t/p/w500/lurEK87kukWNaHd0zYnsi3yzJrs.jpg' },
      { tit: 'A Complete Unknown', dir: 'James Mangold', sin: 'La historia de Bob Dylan y su impacto en la música de los años 60.', dur: 141, clasi: '13', estreno: '2024-12-25', poster: 'https://image.tmdb.org/t/p/w500/ao1E7SxR1iHbc14CynRzI1zRc4o.jpg' },
      { tit: 'Sonic 3: La Película', dir: 'Jeff Fowler', sin: 'Sonic y sus amigos se enfrentan a un nuevo y poderoso rival: Shadow.', dur: 110, clasi: 'TP', estreno: '2024-12-20', poster: 'https://image.tmdb.org/t/p/w500/d8Ryb8AunYAuycVKDp5HpdWPKgC.jpg' },
      { tit: 'Captain America: Brave New World', dir: 'Julius Onah', sin: 'Sam Wilson, el nuevo Capitán América, se enfrenta a una amenaza global.', dur: 130, clasi: '13', estreno: '2025-02-14', poster: 'https://image.tmdb.org/t/p/w500/pzItpT4fZpAGqzIVCe2SrJQA4Tt.jpg' },
    ];

    for (const p of peliculas) {
      await connection.query(
        `INSERT INTO Pelicula (titulo, director, sinopsis, posterUrl, duracionMinutos, clasificacionEdad, fechaEstreno, estadoA, fechaA)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURDATE())`,
        [p.tit, p.dir, p.sin, p.poster, p.dur, p.clasi, p.estreno]
      );
    }

    // ── 6. FUNCIONES ──
    console.log('Insertando funciones...');

    const [peliculasRows] = await connection.query<any[]>('SELECT idPelicula FROM Pelicula WHERE estadoA = 1');
    const [salasRows] = await connection.query<any[]>('SELECT idSala, tipo, capacidadTotal FROM Sala WHERE estadoA = 1');

    const precios: Record<string, number> = { 'Estándar': 20, '3D': 30, 'VIP': 40 };

    const hoy = new Date();
    const horas = ['14:00:00', '16:30:00', '19:00:00', '21:30:00'];

    let funcionCount = 0;
    for (let dia = 0; dia < 7; dia++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + dia);
      const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

      for (const sala of salasRows) {
        const precio = precios[sala.tipo] || 20;

        const horasDisponibles = [...horas];
        const funcsPorSala = dia === 0 ? 2 : Math.floor(Math.random() * 2) + 2;

        for (let f = 0; f < funcsPorSala && horasDisponibles.length > 0; f++) {
          const horaIdx = Math.floor(Math.random() * horasDisponibles.length);
          const horaInicio = horasDisponibles.splice(horaIdx, 1)[0];

          const [h, m] = horaInicio.split(':').map(Number);
          const finMin = h * 60 + m + 120;
          const hFin = Math.floor(finMin / 60) % 24;
          const mFin = finMin % 60;
          const horaFin = `${String(hFin).padStart(2, '0')}:${String(mFin).padStart(2, '0')}:00`;

          const pelIdx = (funcionCount + dia) % peliculasRows.length;
          const idPelicula = peliculasRows[pelIdx].idPelicula;

          await connection.query(
            `INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase, promocionActiva, estadoA, fechaA)
             VALUES (?, ?, ?, ?, ?, ?, 0, 1, CURDATE())`,
            [sala.idSala, idPelicula, fechaStr, horaInicio, horaFin, precio]
          );

          funcionCount++;
        }
      }
    }

    // --- BOLETOS DE PRUEBA PARA SIMULACIÓN DE ACCESOS (HU-16) ---
    const [funcionesRow] = await connection.query<any[]>('SELECT idFuncion FROM Funcion LIMIT 1');
    const [clientesRow] = await connection.query<any[]>('SELECT idUsuario FROM Usuario WHERE idUsuario IN (SELECT idUsuario FROM Usuario_Rol WHERE idRol = ?) LIMIT 1', ['CLIENTE']);
    if (funcionesRow.length > 0 && clientesRow.length > 0) {
      const funcId = funcionesRow[0].idFuncion;
      const clienteId = clientesRow[0].idUsuario;

      // Crear Venta Dummy (ahora con idFuncion y campos de pago integrados)
      const [ventaRes] = await connection.query<any>(
        `INSERT INTO Venta (idCliente, idEncargado, idFuncion, fechaCompra, tipo, montoTotal, estadoVenta, metodoPago, estadoPago, codigoTransaccion, fechaPago, estadoA, fechaA, usuarioA)
         VALUES (?, NULL, ?, CURDATE(), 'WEB', 100.00, 'COMPLETADA', 'QR', 'APROBADO', 'TX-TEST-001', CURDATE(), 1, CURDATE(), 1)`, [clienteId, funcId]
      );
      const idVentaTest = ventaRes.insertId;

      // Boletos de prueba (sin idFuncion, via Venta)
      await connection.query(
        `INSERT INTO Boleto (idBoleto, idVenta, idAsiento, precioPagado, estadoA, fechaA, usuarioA)
         VALUES
         (1, ?, 'SALA-1-A1', 50.00, 1, CURDATE(), 1),
         (2, ?, 'SALA-1-A2', 50.00, 0, CURDATE(), 1)`
         , [idVentaTest, idVentaTest]
      );
      console.log(`  - Boletos de simulación insertados (idBoleto=1, idAsiento=SALA-1-A1, idAsiento=SALA-1-A2)`);
    }

    await connection.commit();
    console.log(`\nSeed completado exitosamente!`);
    console.log(`  - ${roles.length} roles`);
    console.log(`  - ${2 + clientes.length} usuarios (1 admin, 1 boletería, 1 acceso, ${clientes.length} clientes)`);
    console.log(`  - ${salas.length} salas`);
    console.log(`  - ${salas.reduce((t, s) => t + s.fil * s.col, 0)} asientos`);
    console.log(`  - ${peliculas.length} películas`);
    console.log(`  - ${funcionCount} funciones (7 días)`);
    console.log(`\nCredenciales:`);
    console.log(`  Admin:     admin@cinelapaz.com / admin123`);
    console.log(`  Boletería: boleteria@cinelapaz.com / boleteria123`);
    console.log(`  Acceso:    acceso@cinelapaz.com / acceso123`);
    console.log(`  Cliente:   cliente@cinelapaz.com / cliente123`);

  } catch (error) {
    await connection.rollback();
    console.error('Error en seed:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed();
