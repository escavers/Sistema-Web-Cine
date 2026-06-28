import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function run() {
  const sqlPath = path.join(__dirname, '../cine_db.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('Conectando a MySQL (puerto 3306)...');
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'root'
  });

  console.log('Conexión establecida. Iniciando importación...');

  const lines = sqlContent.split(/\r?\n/);
  let currentStatement = '';
  let delimiter = ';';

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--')) {
      continue;
    }

    if (trimmed.toUpperCase().startsWith('DELIMITER')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length > 1) {
        delimiter = parts[1];
      }
      continue;
    }

    currentStatement += line + '\n';

    if (trimmed.endsWith(delimiter)) {
      let executeSql = currentStatement.trim();
      if (executeSql.endsWith(delimiter)) {
        executeSql = executeSql.substring(0, executeSql.length - delimiter.length);
      }
      
      if (executeSql) {
        try {
          await connection.query(executeSql);
        } catch (err: any) {
          console.error(`Error al ejecutar:\n${executeSql}\n`);
          console.error('Detalle del error:', err.message);
          process.exit(1);
        }
      }
      currentStatement = '';
    }
  }

  console.log('Base de datos cine_db importada exitosamente.');
  await connection.end();
}

run().catch(console.error);
