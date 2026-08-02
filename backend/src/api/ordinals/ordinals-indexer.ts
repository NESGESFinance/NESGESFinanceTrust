/**
 * Indexador del protocolo Ordinals.
 *
 * Recorre los bloques y detecta las inscripciones incrustadas en los datos de
 * testigo (witness) de los inputs Taproot. Asigna un número secuencial de
 * inscripción y persiste los metadatos y el contenido en el
 * `OrdinalsRepository`.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import config from '../../config';
import logger from '../../logger';
import esploraClient, { EsploraClient, EsploraTx } from '../../bitcoin/esplora-client';
import ordinalsRepository, { OrdinalsRepository } from '../../repositories/OrdinalsRepository';
import { buildInscriptionId, parseInscriptions } from './inscription-parser';
import { Inscription } from '../../interfaces/ordinals.interfaces';

export class OrdinalsIndexer {
  private running = false;
  private nextInscriptionNumber = 0;

  constructor(
    private readonly esplora: EsploraClient = esploraClient,
    private readonly repository: OrdinalsRepository = ordinalsRepository,
  ) {}

  /**
   * Indexa un rango de bloques `[fromHeight, toHeight]`.
   * @param fromHeight Altura inicial.
   * @param toHeight Altura final (por defecto la punta de la cadena).
   */
  public async $indexRange(fromHeight: number, toHeight?: number): Promise<void> {
    if (!config.TOKENIZATION.ORDINALS_INDEXING_ENABLED) {
      logger.notice('Indexación de Ordinals deshabilitada por configuración.', logger.tags.ordinals);
      return;
    }
    if (this.running) {
      logger.warn('El indexador de Ordinals ya está en ejecución.', logger.tags.ordinals);
      return;
    }
    this.running = true;

    const tip = toHeight ?? (await this.esplora.$getBlockHeightTip());
    logger.notice(`Indexando Ordinals desde el bloque ${fromHeight} hasta ${tip}.`, logger.tags.ordinals);
    try {
      for (let height = fromHeight; height <= tip; height++) {
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

    for (const tx of txs) {
      await this.$indexTransaction(tx, height);
    }
    logger.debug(`Bloque ${height} indexado para Ordinals.`, logger.tags.ordinals);
  }

  /** Detecta y persiste las inscripciones de una transacción. */
  private async $indexTransaction(tx: EsploraTx, height: number): Promise<void> {
    for (const vin of tx.vin) {
      if (!vin.witness || vin.witness.length < 2) {
        continue;
      }
      // En Taproot, el "reveal script" suele ser el penúltimo elemento del witness.
      const revealScript = Buffer.from(vin.witness[vin.witness.length - 2], 'hex');
      const inscriptions = parseInscriptions(revealScript);

      let idx = 0;
      for (const content of inscriptions) {
        const genesisAddress = tx.vout[0]?.scriptpubkey_address ?? null;
        const inscription: Inscription = {
          id: buildInscriptionId(tx.txid, idx),
          number: this.nextInscriptionNumber++,
          address: genesisAddress,
          genesisAddress,
          contentType: content.contentType,
          contentLength: content.body.length,
          satPoint: { txid: tx.txid, vout: 0, offset: 0n },
          timestamp: tx.status.block_time ?? 0,
          genesisHeight: height,
          genesisTxid: tx.txid,
        };
        await this.repository.$upsertInscription(inscription, content);
        logger.info(`Inscripción #${inscription.number} indexada (${inscription.contentType}).`, logger.tags.ordinals);
        idx++;
      }
    }
  }
}

export default new OrdinalsIndexer();
