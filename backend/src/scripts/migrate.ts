/**
 * Ejecuta las migraciones SQL del proyecto sobre MariaDB/MySQL.
  *
 * Lee los archivos `backend/migrations/*.sql` en orden alfabético, crea la base
 * de datos si no existe y ejecuta cada archivo en una conexión con
 * `multipleStatements`.
 */

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import config from '../config';

async function run(): Promise<void> {
  if (!config.DATABASE.ENABLED) {
    throw new Error('Las migraciones requieren DATABASE_ENABLED=true.');
  }

  const migrationsDir = path.resolve(__dirname, '../../backend/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (!files.length) {
    throw new Error(`No se encontraron migraciones en ${migrationsDir}.`);
  }

  const connection = await mysql.createConnection({
    host: config.DATABASE.HOST,
    port: config.DATABASE.PORT,
    user: config.DATABASE.USERNAME,
    password: config.DATABASE.PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.DATABASE.NAME}\``);
    await connection.query(`USE \`${config.DATABASE.NAME}\``);

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8').trim();
      if (!sql) {
        continue;
      }
      process.stdout.write(`Aplicando ${file}...\n`);
      await connection.query(sql);
    }

    process.stdout.write(`Migraciones completadas sobre ${config.DATABASE.NAME}.\n`);
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  process.stderr.write(`Fallo al ejecutar migraciones: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
