/**
 * Contratos (interfaces) de las dependencias externas del indexador de bloques.
 *
 * El módulo `blocks.ts` original del backend mempool depende de ~30 singletons.
 * Para mantener `blocks.ts` fuertemente tipado, desacoplado y verificable sin
 * arrastrar toda la implementación upstream, aquí se definen los contratos
 * mínimos que dichas dependencias deben cumplir. En producción se inyectan las
 * implementaciones reales; en pruebas, dobles que respeten estas interfaces.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

import {
  BlockExtended,
  BlockSummary,
  BlockSummaryTransaction,
  MempoolTransactionExtended,
  PoolTag,
  TransactionExtended,
  TransactionMinerInfo,
} from '../interfaces/mempool.interfaces';

/* -------------------------------------------------------------------------- */
/*  Tipos de la API Bitcoin Core / Esplora                                    */
/* -------------------------------------------------------------------------- */

export namespace IBitcoinApi {
  export interface VerboseTransaction {
    txid: string;
    weight: number;
    fee?: number;
    vout: { value?: number }[];
  }
  export interface VerboseBlock {
    hash: string;
    height: number;
    tx: VerboseTransaction[];
  }
  export interface BlockStats {
    avgfee: number;
    avgfeerate: number;
    avgtxsize: number;
    blockhash: string;
    feerate_percentiles: number[];
    height: number;
    ins: number;
    maxfee: number;
    maxfeerate: number;
    maxtxsize: number;
    medianfee: number;
    mediantime: number;
    mediantxsize: number;
    minfee: number;
    minfeerate: number;
    mintxsize: number;
    outs: number;
    subsidy: number;
    swtotal_size: number;
    swtotal_weight: number;
    swtxs: number;
    time: number;
    total_out: number;
    total_size: number;
    total_weight: number;
    totalfee: number;
    txs: number;
    utxo_increase: number;
    utxo_size_inc: number;
  }
  export interface TxoutSetInfo {
    txouts: number;
    block_info: { prevout_spent: number };
  }
  export interface CoreIndexInfo {
    best_block_height: number;
  }
  export interface BlockchainInfo {
    blocks: number;
    headers: number;
  }
}

export namespace IEsploraApi {
  export interface Block {
    id: string;
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
    previousblockhash: string;
    mediantime: number;
    stale?: boolean;
  }
}

/* -------------------------------------------------------------------------- */
/*  Contratos de servicios                                                    */
/* -------------------------------------------------------------------------- */

/** Factoría/cliente unificado de acceso a datos on-chain. */
export interface IBitcoinApiFactory {
  $getBlockHeightTip(): Promise<number>;
  $getBlockHash(height: number): Promise<string>;
  $getBlock(hash: string): Promise<IEsploraApi.Block>;
  $getTxIdsForBlock(hash: string, stale: boolean): Promise<string[]>;
  $getTxsForBlock(hash: string, stale: boolean): Promise<TransactionExtended[]>;
  $getCoinbaseTx(hash: string): Promise<TransactionExtended>;
  convertBlock(verboseBlock: IBitcoinApi.VerboseBlock): IEsploraApi.Block;
}

/** Cliente RPC de Bitcoin Core. */
export interface IBitcoinClient {
  getBlockchainInfo(): Promise<IBitcoinApi.BlockchainInfo>;
  getBlock(hash: string, verbosity: number): Promise<IBitcoinApi.VerboseBlock>;
  getBlockHeader(hash: string, verbose: boolean): Promise<string>;
  getBlockStats(hash: string): Promise<IBitcoinApi.BlockStats>;
  getTxoutSetinfo(hashType: string, height: number): Promise<IBitcoinApi.TxoutSetInfo>;
}

/** Manejador del mempool en memoria. */
export interface IMempool {
  getMempool(): { [txid: string]: MempoolTransactionExtended };
  getSpendMap(): Map<string, MempoolTransactionExtended>;
  getAccelerations(): Record<string, unknown>;
  findMinedRbfTransactions?(...args: unknown[]): Record<string, unknown>;
  handleRbfTransactions(rbf: Record<string, unknown>): void;
  removeFromSpendMap(transactions: MempoolTransactionExtended[]): void;
}

/** Utilidades comunes (clasificación, estadísticas de fee, etc.). */
export interface ICommon {
  classifyTransactions(transactions: TransactionExtended[], height: number): BlockSummaryTransaction[];
  calcEffectiveFeeStatistics(transactions: TransactionExtended[]): { medianFee: number; feeRange: number[] };
  findMinedRbfTransactions(transactions: MempoolTransactionExtended[], spendMap: Map<string, MempoolTransactionExtended>): Record<string, unknown>;
  indexingEnabled(): boolean;
  gogglesIndexingEnabled(): boolean;
  sleep$(ms: number): Promise<void>;
}

/** Caché en disco. */
export interface IDiskCache {
  lock(): void;
  unlock(): void;
}

/** Utilidades de transacciones. */
export interface ITransactionUtils {
  $getTransactionExtendedRetry(txid: string, a: boolean, b: boolean, c: boolean, addMempoolData: boolean): Promise<TransactionExtended>;
  extendTransaction(tx: TransactionExtended): TransactionExtended;
  extendMempoolTransaction(tx: TransactionExtended): MempoolTransactionExtended;
  stripCoinbaseTransaction(tx: TransactionExtended): TransactionMinerInfo;
  hex2ascii(hex: string): string;
}

/** Indexador de datos auxiliares. */
export interface IIndexer {
  reindex(): void;
  isCoreIndexReady(name: string): IBitcoinApi.CoreIndexInfo | null;
}

/** Gestión de puntas de cadena y bloques huérfanos. */
export interface IChainTips {
  getOrphanedBlocksAtHeight(height: number | undefined): unknown[] | null;
  updateOrphanedBlocks(): Promise<void>;
  clearOrphanCacheAboveHeight(height: number): void;
}

/** Servicio de estadísticas. */
export interface IStatistics {
  runStatistics(): Promise<void>;
}

/** Resultado del procesamiento de un bloque nuevo. */
export interface IProcessingResult {
  blockExtended: BlockExtended;
  blockSummary: BlockSummary;
  cpfpSummary: { transactions: MempoolTransactionExtended[]; clusters: unknown[] };
}

/** Procesador de bloques. */
export interface IBlockProcessor {
  $processNewBlock(
    block: IEsploraApi.Block,
    transactions: MempoolTransactionExtended[],
    pool: PoolTag,
    accelerations: Record<string, unknown>,
  ): Promise<IProcessingResult>;
}

/** Manejador de WebSocket. */
export interface IWebsocketHandler {
  handleNewBlock(
    block: BlockExtended,
    txIds: string[],
    transactions: MempoolTransactionExtended[],
    rbfTransactions: Record<string, unknown>,
  ): Promise<void>;
}

/** Caché Redis. */
export interface IRedisCache {
  $updateBlocks(blocks: BlockExtended[]): Promise<void>;
  $updateBlockSummaries(summaries: BlockSummary[]): Promise<void>;
  $removeTransactions(): Promise<void>;
  queueTransactionsForRemoval(txIds: string[]): void;
}

/** Caché de RBF (Replace-By-Fee). */
export interface IRbfCache {
  mined(txId: string): void;
  updateCache(): Promise<void>;
}

/** Repositorio de bloques. */
export interface IBlocksRepository {
  $saveBlockInDatabase(block: BlockExtended): Promise<void>;
  $getBlockByHeight(height: number): Promise<BlockExtended | null>;
  $getFeePercentilesByBlockId(id: string): Promise<number[] | null>;
  $blockCountBetweenHeight(from: number, to: number): Promise<number>;
  $getMissingBlocksBetweenHeights(from: number, to: number): Promise<number[]>;
  $validateChain(): Promise<boolean>;
  $getUnknownPool(): PoolTag;
  $matchBlockMiner(scriptsig: string, addresses: string[]): Promise<PoolTag | null>;
  $getBlocksMissingCoinbaseBip54(): Promise<BlockExtended[]>;
  $updateCoinbaseBip54(value: boolean, height: number): Promise<void>;
  $getSummariesBelowVersion(version: number): Promise<{ id: string; height: number }[]>;
  $saveClassifiedTransactions(height: number, hash: string, txs: BlockSummaryTransaction[]): Promise<void>;
  $saveBlockPrices(prices: { height: number; priceId: number | null }[]): Promise<void>;
  $saveCpfp(hash: string, height: number, cpfpSummary: { transactions: MempoolTransactionExtended[]; clusters: unknown[] }): Promise<void>;
}

/** Repositorio de hashrates. */
export interface IHashratesRepository {
  $deleteHashratesFromTimestamp(timestamp: number): Promise<void>;
}

/** Repositorio de ajustes de dificultad. */
export interface IDifficultyAdjustmentsRepository {
  $saveAdjustments(adjustment: { time: number; height: number; difficulty: number; adjustment: number }): Promise<void>;
  $deleteAdjustementsFromHeight(height: number): Promise<void>;
}

/** Indicadores de carga (progreso). */
export interface ILoadingIndicators {
  setProgress(name: string, progress: number, quiet?: boolean): void;
}
