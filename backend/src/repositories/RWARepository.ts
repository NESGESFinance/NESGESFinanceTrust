/**
 * Repositorio de persistencia de Activos del Mundo Real (RWA).
 *
 * Encapsula el acceso a las tablas `rwa_assets` y `rwa_history` de MariaDB. Los
 * metadatos extendidos (documentos legales, certificaciones...) se serializan
 * como JSON en la columna `metadata`.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import database from '../database';
import logger from '../logger';
import {
  AssetHistoryEntry,
  AssetMetadata,
  AssetStatus,
  AssetType,
  RealWorldAsset,
} from '../interfaces/rwa.interfaces';

/** Fila cruda de la tabla `rwa_assets`. */
interface AssetRow extends RowDataPacket {
  id: string;
  type: AssetType;
  status: AssetStatus;
  name: string;
  description: string;
  valuation_usd: number;
  inscription_id: string;
  rune_block: number | null;
  rune_tx: number | null;
  owner: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

/** Fila cruda de la tabla `rwa_history`. */
interface HistoryRow extends RowDataPacket {
  asset_id: string;
  action: AssetHistoryEntry['action'];
  from_owner: string | null;
  to_owner: string | null;
  txid: string | null;
  timestamp: string;
  notes: string;
}

/** Convierte una fila en el modelo de dominio `RealWorldAsset`. */
function rowToAsset(row: AssetRow): RealWorldAsset {
  const metadata = JSON.parse(row.metadata) as AssetMetadata;
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    name: row.name,
    description: row.description,
    valuationUSD: row.valuation_usd,
    inscriptionId: row.inscription_id,
    runeId: row.rune_block !== null && row.rune_tx !== null ? { block: row.rune_block, tx: row.rune_tx } : null,
    owner: row.owner,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class RWARepository {
  /** Inserta o actualiza un activo del mundo real. */
  public async $upsertAsset(asset: RealWorldAsset): Promise<void> {
    await database.query<ResultSetHeader>(
      `INSERT INTO rwa_assets
        (id, type, status, name, description, valuation_usd, inscription_id,
         rune_block, rune_tx, owner, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         valuation_usd = VALUES(valuation_usd),
         owner = VALUES(owner),
         metadata = VALUES(metadata),
         updated_at = VALUES(updated_at)`,
      [
        asset.id,
        asset.type,
        asset.status,
        asset.name,
        asset.description,
        asset.valuationUSD,
        asset.inscriptionId,
        asset.runeId?.block ?? null,
        asset.runeId?.tx ?? null,
        asset.owner,
        JSON.stringify(asset.metadata),
        asset.createdAt,
        asset.updatedAt,
      ],
    );
    logger.debug(`Activo RWA persistido: ${asset.id} (${asset.name}).`, logger.tags.rwa);
  }

  /** Obtiene un activo por su identificador interno. */
  public async $getAsset(id: string): Promise<RealWorldAsset | null> {
    const rows = await database.query<AssetRow[]>(`SELECT * FROM rwa_assets WHERE id = ? LIMIT 1`, [id]);
    return rows.length ? rowToAsset(rows[0]) : null;
  }

  /** Obtiene un activo por el identificador del Ordinal vinculado. */
  public async $getAssetByInscription(inscriptionId: string): Promise<RealWorldAsset | null> {
    const rows = await database.query<AssetRow[]>(
      `SELECT * FROM rwa_assets WHERE inscription_id = ? LIMIT 1`,
      [inscriptionId],
    );
    return rows.length ? rowToAsset(rows[0]) : null;
  }

  /** Lista activos con filtros opcionales de tipo y estado. */
  public async $listAssets(
    filters: { type?: AssetType; status?: AssetStatus } = {},
    limit = 50,
    offset = 0,
  ): Promise<RealWorldAsset[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters.type) {
      clauses.push('type = ?');
      params.push(filters.type);
    }
    if (filters.status) {
      clauses.push('status = ?');
      params.push(filters.status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    params.push(limit, offset);
    const rows = await database.query<AssetRow[]>(
      `SELECT * FROM rwa_assets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params,
    );
    return rows.map(rowToAsset);
  }

  /** Registra una entrada en el historial de auditoría de un activo. */
  public async $addHistoryEntry(entry: AssetHistoryEntry): Promise<void> {
    await database.query<ResultSetHeader>(
      `INSERT INTO rwa_history (asset_id, action, from_owner, to_owner, txid, timestamp, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entry.assetId, entry.action, entry.fromOwner, entry.toOwner, entry.txid, entry.timestamp, entry.notes],
    );
  }

  /** Obtiene el historial completo de un activo, cronológicamente. */
  public async $getAssetHistory(assetId: string): Promise<AssetHistoryEntry[]> {
    const rows = await database.query<HistoryRow[]>(
      `SELECT * FROM rwa_history WHERE asset_id = ? ORDER BY timestamp ASC`,
      [assetId],
    );
    return rows.map((r) => ({
      assetId: r.asset_id,
      action: r.action,
      fromOwner: r.from_owner,
      toOwner: r.to_owner,
      txid: r.txid,
      timestamp: r.timestamp,
      notes: r.notes,
    }));
  }
}

export default new RWARepository();
