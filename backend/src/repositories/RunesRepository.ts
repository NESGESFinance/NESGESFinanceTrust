/**
 * Repositorio de persistencia de Runes (tokens fungibles L1).
 *
 * Encapsula el acceso a las tablas `runes` y `rune_holders` de MariaDB. Todas
 * las cantidades se almacenan como cadenas decimales para preservar la
 * precisión de los `bigint` de 128 bits del protocolo.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import database from '../database';
import logger from '../logger';
import { RuneHolder, RuneId, RuneToken } from '../interfaces/runes.interfaces';

/** Fila cruda de la tabla `runes`. */
interface RuneRow extends RowDataPacket {
  rune_block: number;
  rune_tx: number;
  name: string;
  symbol: string;
  divisibility: number;
  premine: string;
  total_supply: string;
  circulating_supply: string;
  mints: number;
  holders: number;
  etched_height: number;
  etched_txid: string;
  timestamp: number;
}

/** Fila cruda de la tabla `rune_holders`. */
interface HolderRow extends RowDataPacket {
  address: string;
  amount: string;
  rune_block: number;
  rune_tx: number;
}

/** Convierte una fila de BD en el modelo de dominio `RuneToken`. */
function rowToToken(row: RuneRow): RuneToken {
  return {
    runeId: { block: row.rune_block, tx: row.rune_tx },
    name: row.name,
    symbol: row.symbol,
    divisibility: row.divisibility,
    premine: BigInt(row.premine),
    totalSupply: BigInt(row.total_supply),
    circulatingSupply: BigInt(row.circulating_supply),
    mints: row.mints,
    holders: row.holders,
    etchedAtHeight: row.etched_height,
    etchedAtTxid: row.etched_txid,
    timestamp: row.timestamp,
  };
}

export class RunesRepository {
  /** Inserta o actualiza un token Rune (idempotente por `rune_block:rune_tx`). */
  public async $upsertRune(token: RuneToken): Promise<void> {
    await database.query<ResultSetHeader>(
      `INSERT INTO runes
        (rune_block, rune_tx, name, symbol, divisibility, premine, total_supply,
         circulating_supply, mints, holders, etched_height, etched_txid, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_supply = VALUES(total_supply),
         circulating_supply = VALUES(circulating_supply),
         mints = VALUES(mints),
         holders = VALUES(holders)`,
      [
        token.runeId.block,
        token.runeId.tx,
        token.name,
        token.symbol,
        token.divisibility,
        token.premine.toString(),
        token.totalSupply.toString(),
        token.circulatingSupply.toString(),
        token.mints,
        token.holders,
        token.etchedAtHeight,
        token.etchedAtTxid,
        token.timestamp,
      ],
    );
    logger.debug(`Rune persistido: ${token.name} (${token.runeId.block}:${token.runeId.tx})`, logger.tags.runes);
  }

  /** Lista los Runes con paginación, ordenados por altura de grabado descendente. */
  public async $listRunes(limit = 50, offset = 0): Promise<RuneToken[]> {
    const rows = await database.query<RuneRow[]>(
      `SELECT * FROM runes ORDER BY etched_height DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return rows.map(rowToToken);
  }

  /** Obtiene un Rune por su nombre (sin espaciadores). */
  public async $getRuneByName(name: string): Promise<RuneToken | null> {
    const rows = await database.query<RuneRow[]>(`SELECT * FROM runes WHERE name = ? LIMIT 1`, [name]);
    return rows.length ? rowToToken(rows[0]) : null;
  }

  /** Obtiene un Rune por su identificador `block:tx`. */
  public async $getRuneById(runeId: RuneId): Promise<RuneToken | null> {
    const rows = await database.query<RuneRow[]>(
      `SELECT * FROM runes WHERE rune_block = ? AND rune_tx = ? LIMIT 1`,
      [runeId.block, runeId.tx],
    );
    return rows.length ? rowToToken(rows[0]) : null;
  }

  /** Obtiene los mayores tenedores (holders) de un Rune. */
  public async $getRuneHolders(runeId: RuneId, limit = 100): Promise<RuneHolder[]> {
    const rows = await database.query<HolderRow[]>(
      `SELECT address, amount, rune_block, rune_tx
       FROM rune_holders
       WHERE rune_block = ? AND rune_tx = ?
       ORDER BY CAST(amount AS DECIMAL(65)) DESC
       LIMIT ?`,
      [runeId.block, runeId.tx, limit],
    );
    return rows.map((r) => ({
      address: r.address,
      amount: BigInt(r.amount),
      runeId: { block: r.rune_block, tx: r.rune_tx },
    }));
  }

  /** Actualiza (suma) el saldo de una dirección para un Rune. */
  public async $updateHolderBalance(holder: RuneHolder): Promise<void> {
    await database.query<ResultSetHeader>(
      `INSERT INTO rune_holders (rune_block, rune_tx, address, amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = ?`,
      [holder.runeId.block, holder.runeId.tx, holder.address, holder.amount.toString(), holder.amount.toString()],
    );
  }
}

export default new RunesRepository();
