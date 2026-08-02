/**
 * Capa de conexión a la base de datos MySQL/MariaDB mediante `mysql2/promise`.
 *
 * Expone un pool de conexiones y un helper `query` tipado para ejecutar
 * sentencias parametrizadas de forma segura (previene inyección SQL).
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import config from './config';
import logger from './logger';

class Database {
  private pool: Pool | null = null;

  /** Inicializa el pool de conexiones si la base de datos está habilitada. */
  public async connect(): Promise<void> {
    if (!config.DATABASE.ENABLED) {
      logger.notice('Base de datos deshabilitada por configuración.');
      return;
    }
    this.pool = mysql.createPool({
      host: config.DATABASE.HOST,
      port: config.DATABASE.PORT,
      user: config.DATABASE.USERNAME,
      password: config.DATABASE.PASSWORD,
      database: config.DATABASE.NAME,
      connectionLimit: config.DATABASE.POOL_SIZE,
      waitForConnections: true,
      charset: 'utf8mb4',
      timezone: 'Z',
    });

    // Verifica la conexión de forma temprana para fallar rápido.
    const conn = await this.pool.getConnection();
    try {
      await conn.ping();
      logger.notice(`Conexión a MariaDB establecida (${config.DATABASE.HOST}:${config.DATABASE.PORT}/${config.DATABASE.NAME}).`);
    } finally {
      conn.release();
    }
  }

  /**
   * Ejecuta una consulta parametrizada y devuelve las filas resultantes.
   * @param sql Sentencia SQL con marcadores `?`.
   * @param params Valores a interpolar de forma segura.
   * @returns Filas resultantes tipadas como `T`.
   */
  public async query<T extends RowDataPacket[] | ResultSetHeader>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('El pool de la base de datos no está inicializado. Llame a connect() primero.');
    }
    const [rows] = await this.pool.execute<T>(sql, params as (string | number | boolean | null | Buffer)[]);
    return rows;
  }

  /**
   * Obtiene una conexión dedicada del pool (para transacciones).
   * El llamador es responsable de liberar la conexión con `release()`.
   */
  public async getConnection(): Promise<PoolConnection> {
    if (!this.pool) {
      throw new Error('El pool de la base de datos no está inicializado.');
    }
    return this.pool.getConnection();
  }

  /** Cierra el pool de conexiones de forma ordenada. */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.notice('Pool de la base de datos cerrado.');
    }
  }
}

export default new Database();
