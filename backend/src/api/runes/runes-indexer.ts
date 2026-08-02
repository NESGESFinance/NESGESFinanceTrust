/**
 * Indexador del protocolo Runes.
 *
 * Recorre los bloques a partir de la altura de activación (840,000) y decodifica
 * los RuneStones presentes en los outputs OP_RETURN de cada transacción,
 * actualizando el estado de los tokens (grabados, acuñaciones y edictos) en el
 * `RunesRepository`.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import config from '../../config';
import logger from '../../logger';
import esploraClient, { EsploraClient, EsploraTx } from '../../bitcoin/esplora-client';
import runesRepository, { RunesRepository } from '../../repositories/RunesRepository';
import { decodeRunestone } from './runes-parser';
import { RuneStone, RuneToken } from '../../interfaces/runes.interfaces';

export class RunesIndexer {
  private running = false;

  constructor(
    private readonly esplora: EsploraClient = esploraClient,
    private readonly repository: RunesRepository = runesRepository,
  ) {}

  /**
   * Indexa un rango de bloques `[fromHeight, toHeight]`. Si no se indica
   * `toHeight`, indexa hasta la punta de la cadena.
   * @param fromHeight Altura inicial (por defecto la de activación).
   * @param toHeight Altura final (por defecto la punta).
   */
  public async $indexRange(fromHeight?: number, toHeight?: number): Promise<void> {
    if (!config.TOKENIZATION.RUNES_INDEXING_ENABLED) {
      logger.notice('Indexación de Runes deshabilitada por configuración.', logger.tags.runes);
      return;
    }
    if (this.running) {
      logger.warn('El indexador de Runes ya está en ejecución.', logger.tags.runes);
      return;
    }
    this.running = true;

    const start = Math.max(fromHeight ?? config.TOKENIZATION.RUNES_ACTIVATION_HEIGHT, config.TOKENIZATION.RUNES_ACTIVATION_HEIGHT);
    const tip = toHeight ?? (await this.esplora.$getBlockHeightTip());

    logger.notice(`Indexando Runes desde el bloque ${start} hasta ${tip}.`, logger.tags.runes);
    try {
      for (let height = start; height <= tip; height++) {
        await this.$indexBlock(height);
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Indexa un único bloque por altura.
   * @param height Altura del bloque.
   */
  public async $indexBlock(height: number): Promise<void> {
    const hash = await this.esplora.$getBlockHash(height);
    const txs = await this.esplora.$getTxsForBlock(hash);

    let txIndex = 0;
    for (const tx of txs) {
      const runestone = this.decodeFromTx(tx, height, txIndex);
      if (runestone) {
        await this.$applyRunestone(runestone, tx, height);
      }
      txIndex++;
    }
    logger.debug(`Bloque ${height} indexado para Runes (${txs.length} txs).`, logger.tags.runes);
  }

  /** Busca y decodifica el RuneStone de una transacción (si existe). */
  private decodeFromTx(tx: EsploraTx, block: number, txIndex: number): RuneStone | null {
    for (const vout of tx.vout) {
      if (!vout.scriptpubkey) {
        continue;
      }
      const script = Buffer.from(vout.scriptpubkey, 'hex');
      const runestone = decodeRunestone(script, block, txIndex);
      if (runestone) {
        return runestone;
      }
    }
    return null;
  }

  /**
   * Aplica los efectos de un RuneStone al estado persistido: registra un
   * grabado nuevo y actualiza los contadores de acuñación.
   */
  private async $applyRunestone(runestone: RuneStone, tx: EsploraTx, height: number): Promise<void> {
    if (runestone.cenotaph) {
      logger.debug(`Cenotafio detectado en ${tx.txid}; se queman los Runes de entrada.`, logger.tags.runes);
      return;
    }

    if (runestone.etching) {
      const e = runestone.etching;
      const token: RuneToken = {
        runeId: e.runeId,
        name: e.name,
        symbol: e.symbol,
        divisibility: e.divisibility,
        premine: e.premine,
        totalSupply: e.premine,
        circulatingSupply: e.premine,
        mints: 0,
        holders: e.premine > 0n ? 1 : 0,
        etchedAtHeight: height,
        etchedAtTxid: tx.txid,
        timestamp: tx.status.block_time ?? 0,
      };
      await this.repository.$upsertRune(token);
      logger.info(`Nuevo Rune grabado: ${e.name} en el bloque ${height}.`, logger.tags.runes);
    }

    if (runestone.mint) {
      const existing = await this.repository.$getRuneById(runestone.mint);
      if (existing) {
        existing.mints += 1;
        await this.repository.$upsertRune(existing);
      }
    }
  }
}

export default new RunesIndexer();
