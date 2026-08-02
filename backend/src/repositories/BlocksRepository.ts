/**
 * Repositorio de persistencia de bloques.
 *
 * Implementa el contrato `IBlocksRepository` requerido por el indexador
 * (`blocks.ts`). Encapsula el acceso a la tabla `blocks` de MariaDB y las
 * tablas auxiliares de resúmenes, precios y CPFP.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import database from '../database';
import logger from '../logger';
import { IBlocksRepository } from '../api/_contracts';
import {
  BlockExtended,
  BlockSummaryTransaction,
  MempoolTransactionExtended,
  PoolTag,
} from '../interfaces/mempool.interfaces';

/** Fila cruda de la tabla `blocks`. */
interface BlockRow extends RowDataPacket {
  hash: string;
  height: number;
  version: number;
  timestamp: number;
  bits: number;
  nonce: number;
  difficulty: number;
  merkle_root: string;
  tx_count: number;
  size: number;
  weight: number;
  previous_block_hash: string;
  median_time: number;
  extras: string;
}

/** Pool desconocida por defecto (cuando no se identifica al minero). */
const UNKNOWN_POOL: PoolTag = {
  uniqueId: 0,
  name: 'Desconocido',
  slug: 'desconocido',
  addresses: [],
  regexes: [],
  minerNames: null,
};

export class BlocksRepository implements IBlocksRepository {
  /** Persiste un bloque extendido (idempotente por altura). */
  public async $saveBlockInDatabase(block: BlockExtended): Promise<void> {
    await database.query<ResultSetHeader>(
      `INSERT INTO blocks
        (hash, height, version, timestamp, bits, nonce, difficulty, merkle_root,
         tx_count, size, weight, previous_block_hash, median_time, extras)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         hash = VALUES(hash),
         extras = VALUES(extras)`,
      [
        block.id,
        block.height,
        block.version,
        block.timestamp,
        block.bits,
        block.nonce,
        block.difficulty,
        block.merkle_root,
        block.tx_count,
        block.size,
        block.weight,
        block.previousblockhash,
        block.mediantime,
        JSON.stringify(block.extras),
      ],
    );
    logger.debug(`Bloque ${block.height} persistido (${block.id}).`, logger.tags.mining);
  }

  /** Obtiene un bloque por altura. */
  public async $getBlockByHeight(height: number): Promise<BlockExtended | null> {
    const rows = await database.query<BlockRow[]>(`SELECT * FROM blocks WHERE height = ? LIMIT 1`, [height]);
    if (!rows.length) {
      return null;
    }
    const row = rows[0];
    return {
      id: row.hash,
      height: row.height,
      version: row.version,
      timestamp: row.timestamp,
      bits: row.bits,
      nonce: row.nonce,
      difficulty: row.difficulty,
      merkle_root: row.merkle_root,
      tx_count: row.tx_count,
      size: row.size,
      weight: row.weight,
      previousblockhash: row.previous_block_hash,
      mediantime: row.median_time,
      extras: JSON.parse(row.extras) as BlockExtended['extras'],
    };
  }

  /** Devuelve los percentiles de comisión de un bloque (por hash). */
  public async $getFeePercentilesByBlockId(id: string): Promise<number[] | null> {
    const rows = await database.query<BlockRow[]>(`SELECT extras FROM blocks WHERE hash = ? LIMIT 1`, [id]);
    if (!rows.length) {
      return null;
    }
    const extras = JSON.parse(rows[0].extras) as BlockExtended['extras'];
    return extras.feePercentiles ?? null;
  }

  /** Cuenta los bloques persistidos en un rango de alturas. */
  public async $blockCountBetweenHeight(from: number, to: number): Promise<number> {
    const rows = await database.query<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) AS total FROM blocks WHERE height >= ? AND height <= ?`,
      [Math.min(from, to), Math.max(from, to)],
    );
    return rows[0]?.total ?? 0;
  }

  /** Devuelve las alturas ausentes en un rango. */
  public async $getMissingBlocksBetweenHeights(from: number, to: number): Promise<number[]> {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const rows = await database.query<(RowDataPacket & { height: number })[]>(
      `SELECT height FROM blocks WHERE height >= ? AND height <= ? ORDER BY height ASC`,
      [lo, hi],
    );
    const present = new Set(rows.map((r) => r.height));
    const missing: number[] = [];
    for (let h = hi; h >= lo; h--) {
      if (!present.has(h)) {
        missing.push(h);
      }
    }
    return missing;
  }

  /** Valida la coherencia de la cadena persistida (enlace de hashes previos). */
  public async $validateChain(): Promise<boolean> {
    const rows = await database.query<BlockRow[]>(
      `SELECT hash, height, previous_block_hash FROM blocks ORDER BY height ASC`,
    );
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].height === rows[i - 1].height + 1 && rows[i].previous_block_hash !== rows[i - 1].hash) {
        logger.warn(`Cadena incoherente en la altura ${rows[i].height}.`, logger.tags.mining);
        return false;
      }
    }
    return true;
  }

  /** Devuelve la pool "desconocida" por defecto. */
  public $getUnknownPool(): PoolTag {
    return UNKNOWN_POOL;
  }

  /**
   * Intenta identificar la pool minera a partir de la firma coinbase o de las
   * direcciones de la coinbase.
   */
  public async $matchBlockMiner(scriptsig: string, addresses: string[]): Promise<PoolTag | null> {
    const rows = await database.query<(RowDataPacket & { unique_id: number; name: string; slug: string; addresses: string; regexes: string })[]>(
      `SELECT unique_id, name, slug, addresses, regexes FROM pools`,
    );
    let ascii = '';
    try {
      ascii = Buffer.from(scriptsig, 'hex').toString('utf8');
    } catch {
      ascii = '';
    }
    for (const row of rows) {
      const poolAddresses = safeParseArray(row.addresses);
      const poolRegexes = safeParseArray(row.regexes);
      if (addresses.some((a) => poolAddresses.includes(a))) {
        return this.rowToPool(row, poolAddresses, poolRegexes);
      }
      if (poolRegexes.some((re) => tryRegex(re, ascii))) {
        return this.rowToPool(row, poolAddresses, poolRegexes);
      }
    }
    return null;
  }

  /** Bloques cuya bandera `coinbaseBip54` aún no ha sido calculada. */
  public async $getBlocksMissingCoinbaseBip54(): Promise<BlockExtended[]> {
    const rows = await database.query<BlockRow[]>(
      `SELECT * FROM blocks WHERE JSON_EXTRACT(extras, '$.coinbaseBip54') IS NULL ORDER BY height ASC LIMIT 1000`,
    );
    return rows.map((row) => ({
      id: row.hash,
      height: row.height,
      version: row.version,
      timestamp: row.timestamp,
      bits: row.bits,
      nonce: row.nonce,
      difficulty: row.difficulty,
      merkle_root: row.merkle_root,
      tx_count: row.tx_count,
      size: row.size,
      weight: row.weight,
      previousblockhash: row.previous_block_hash,
      mediantime: row.median_time,
      extras: JSON.parse(row.extras) as BlockExtended['extras'],
    }));
  }

  /** Actualiza la bandera `coinbaseBip54` de un bloque. */
  public async $updateCoinbaseBip54(value: boolean, height: number): Promise<void> {
    await database.query<ResultSetHeader>(
      `UPDATE blocks SET extras = JSON_SET(extras, '$.coinbaseBip54', ?) WHERE height = ?`,
      [value ? 1 : 0, height],
    );
  }

  /** Resúmenes de bloque por debajo de una versión del algoritmo. */
  public async $getSummariesBelowVersion(version: number): Promise<{ id: string; height: number }[]> {
    const rows = await database.query<(RowDataPacket & { hash: string; height: number })[]>(
      `SELECT hash, height FROM block_summaries WHERE version < ? ORDER BY height DESC`,
      [version],
    );
    return rows.map((r) => ({ id: r.hash, height: r.height }));
  }

  /** Persiste las transacciones clasificadas ("Goggles") de un resumen. */
  public async $saveClassifiedTransactions(
    height: number,
    hash: string,
    txs: BlockSummaryTransaction[],
  ): Promise<void> {
    await database.query<ResultSetHeader>(
      `INSERT INTO block_summaries (hash, height, transactions, version)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE transactions = VALUES(transactions), version = VALUES(version)`,
      [hash, height, JSON.stringify(txs), 1],
    );
  }

  /** Asocia precios de mercado a alturas de bloque. */
  public async $saveBlockPrices(prices: { height: number; priceId: number | null }[]): Promise<void> {
    for (const price of prices) {
      await database.query<ResultSetHeader>(
        `INSERT INTO blocks_prices (height, price_id) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE price_id = VALUES(price_id)`,
        [price.height, price.priceId],
      );
    }
  }

  /** Persiste el resumen CPFP (Child-Pays-For-Parent) de un bloque. */
  public async $saveCpfp(
    hash: string,
    height: number,
    cpfpSummary: { transactions: MempoolTransactionExtended[]; clusters: unknown[] },
  ): Promise<void> {
    await database.query<ResultSetHeader>(
      `INSERT INTO cpfp_clusters (hash, height, clusters)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE clusters = VALUES(clusters)`,
      [hash, height, JSON.stringify(cpfpSummary.clusters)],
    );
  }

  /** Construye un `PoolTag` a partir de una fila de la tabla `pools`. */
  private rowToPool(
    row: { unique_id: number; name: string; slug: string },
    addresses: string[],
    regexes: string[],
  ): PoolTag {
    return { uniqueId: row.unique_id, name: row.name, slug: row.slug, addresses, regexes, minerNames: null };
  }
}

/** Parsea de forma segura un array JSON almacenado como texto. */
function safeParseArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Aplica una expresión regular de forma segura (ignora patrones inválidos). */
function tryRegex(pattern: string, subject: string): boolean {
  try {
    return new RegExp(pattern).test(subject);
  } catch {
    return false;
  }
}

export default new BlocksRepository();
