/**
 * Repositorio de persistencia de inscripciones Ordinals (Security Tokens).
 *
 * Encapsula el acceso a la tabla `ordinals` de MariaDB. El contenido binario de
 * la inscripción se almacena por separado (columna `content` de tipo LONGBLOB)
 * para permitir su servido bajo demanda.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import database from '../database';
import logger from '../logger';
import { Inscription, InscriptionContent, SatPoint } from '../interfaces/ordinals.interfaces';

/** Fila cruda de la tabla `ordinals`. */
interface OrdinalRow extends RowDataPacket {
  id: string;
  number: number;
  address: string | null;
  genesis_address: string | null;
  content_type: string;
  content_length: number;
  sat_txid: string;
  sat_vout: number;
  sat_offset: string;
  timestamp: number;
  genesis_height: number;
  genesis_txid: string;
  sat: string | null;
}

/** Fila cruda del contenido de una inscripción. */
interface ContentRow extends RowDataPacket {
  content_type: string;
  content: Buffer;
}

/** Convierte una fila en el modelo de dominio `Inscription`. */
function rowToInscription(row: OrdinalRow): Inscription {
  const satPoint: SatPoint = {
    txid: row.sat_txid,
    vout: row.sat_vout,
    offset: BigInt(row.sat_offset),
  };
  return {
    id: row.id,
    number: row.number,
    address: row.address,
    genesisAddress: row.genesis_address,
    contentType: row.content_type,
    contentLength: row.content_length,
    satPoint,
    timestamp: row.timestamp,
    genesisHeight: row.genesis_height,
    genesisTxid: row.genesis_txid,
    sat: row.sat !== null ? BigInt(row.sat) : undefined,
  };
}

export class OrdinalsRepository {
  /** Inserta o actualiza una inscripción junto a su contenido binario. */
  public async $upsertInscription(inscription: Inscription, content: InscriptionContent): Promise<void> {
    await database.query<ResultSetHeader>(
      `INSERT INTO ordinals
        (id, number, address, genesis_address, content_type, content_length,
         sat_txid, sat_vout, sat_offset, timestamp, genesis_height, genesis_txid, sat, content)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         address = VALUES(address),
         sat_txid = VALUES(sat_txid),
         sat_vout = VALUES(sat_vout),
         sat_offset = VALUES(sat_offset)`,
      [
        inscription.id,
        inscription.number,
        inscription.address,
        inscription.genesisAddress,
        inscription.contentType,
        inscription.contentLength,
        inscription.satPoint.txid,
        inscription.satPoint.vout,
        inscription.satPoint.offset.toString(),
        inscription.timestamp,
        inscription.genesisHeight,
        inscription.genesisTxid,
        inscription.sat !== undefined ? inscription.sat.toString() : null,
        content.body,
      ],
    );
    logger.debug(`Inscripción persistida: ${inscription.id}`, logger.tags.ordinals);
  }

  /** Lista inscripciones paginadas, más recientes primero. */
  public async $listInscriptions(limit = 50, offset = 0): Promise<Inscription[]> {
    const rows = await database.query<OrdinalRow[]>(
      `SELECT id, number, address, genesis_address, content_type, content_length,
              sat_txid, sat_vout, sat_offset, timestamp, genesis_height, genesis_txid, sat
       FROM ordinals ORDER BY number DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    return rows.map(rowToInscription);
  }

  /** Obtiene una inscripción por su identificador `<txid>i<index>`. */
  public async $getInscription(id: string): Promise<Inscription | null> {
    const rows = await database.query<OrdinalRow[]>(
      `SELECT id, number, address, genesis_address, content_type, content_length,
              sat_txid, sat_vout, sat_offset, timestamp, genesis_height, genesis_txid, sat
       FROM ordinals WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows.length ? rowToInscription(rows[0]) : null;
  }

  /** Obtiene el contenido binario de una inscripción. */
  public async $getInscriptionContent(id: string): Promise<InscriptionContent | null> {
    const rows = await database.query<ContentRow[]>(
      `SELECT content_type, content FROM ordinals WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) {
      return null;
    }
    return { contentType: rows[0].content_type, body: rows[0].content };
  }
}

export default new OrdinalsRepository();
