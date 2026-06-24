import mysql from 'mysql2/promise';

async function testPort(port) {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: port,
      user: 'root',
      password: 'root',
    });
    console.log(`Port ${port} connected successfully!`);
    await conn.end();
    return true;
  } catch (err) {
    console.log(`Port ${port} failed: ${err.message}`);
    return false;
  }
}

async function main() {
  await testPort(3306);
  await testPort(3307);
}

main();
