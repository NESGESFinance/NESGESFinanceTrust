/**
 * Ensamblado de dependencias del indexador de bloques (`Blocks`).
 *
 * `blocks.ts` recibe sus dependencias por inyección (patrón DI) a través de la
 * interfaz `BlocksDependencies`. Este módulo construye ese grafo de
 * dependencias combinando las implementaciones concretas disponibles
 * (factoría Bitcoin, repositorio de bloques, manejador WebSocket) con
 * adaptadores por defecto para los servicios auxiliares.
 *
 * Cada adaptador por defecto está claramente señalado como PUNTO DE
 * INTEGRACIÓN: en un despliegue de producción se sustituye por la
 * implementación real del subsistema correspondiente (mempool en memoria,
 * caché Redis/disco, estadísticas, etc.).
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import bitcoinApiFactory from './bitcoin/bitcoin-api-factory';
import bitcoinClient from './bitcoin/bitcoin-client';
import blocksRepository from './repositories/BlocksRepository';
import websocketHandler from './api/websocket-handler';
import logger from './logger';
import { BlockExtended, BlockSummary, MempoolTransactionExtended } from './interfaces/mempool.interfaces';
import {
  IBitcoinClient,
  IBlockProcessor,
  IChainTips,
  ICommon,
  IDiskCache,
  IDifficultyAdjustmentsRepository,
  IHashratesRepository,
  IIndexer,
  ILoadingIndicators,
  IMempool,
  IProcessingResult,
  IRbfCache,
  IRedisCache,
  IStatistics,
  ITransactionUtils,
  IWebsocketHandler,
} from './api/_contracts';
import { BlocksDependencies } from './api/blocks';

/** PUNTO DE INTEGRACIÓN — adaptador del cliente RPC de Core (con normalización). */
const bitcoinClientAdapter: IBitcoinClient = {
  getBlockchainInfo: () => bitcoinClient.getBlockchainInfo(),
  getBlock: (hash, verbosity) => bitcoinClient.getBlock(hash, verbosity) as never,
  getBlockHeader: (hash, verbose) => bitcoinClient.getBlockHeader(hash, verbose) as never,
  getBlockStats: (hash) => bitcoinClient.getBlockStats(hash) as never,
  getTxoutSetinfo: (hashType, height) => bitcoinClient.getTxoutSetinfo(hashType, height) as never,
};

/** PUNTO DE INTEGRACIÓN — mempool en memoria (implementación por defecto vacía). */
const memPool: IMempool = {
  getMempool: () => ({}),
  getSpendMap: () => new Map<string, MempoolTransactionExtended>(),
  getAccelerations: () => ({}),
  handleRbfTransactions: () => undefined,
  removeFromSpendMap: () => undefined,
};

/** PUNTO DE INTEGRACIÓN — utilidades comunes (clasificación y estadísticas de fee). */
const common: ICommon = {
  classifyTransactions: () => [],
  calcEffectiveFeeStatistics: () => ({ medianFee: 0, feeRange: [] }),
  findMinedRbfTransactions: () => ({}),
  indexingEnabled: () => true,
  gogglesIndexingEnabled: () => true,
  sleep$: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** PUNTO DE INTEGRACIÓN — bloqueo de la caché en disco. */
const diskCache: IDiskCache = {
  lock: () => undefined,
  unlock: () => undefined,
};

/** PUNTO DE INTEGRACIÓN — utilidades de transacciones. */
const transactionUtils: ITransactionUtils = {
  $getTransactionExtendedRetry: async (txid: string) => {
    throw new Error(`Servicio de transacciones no configurado (txid ${txid}).`);
  },
  extendTransaction: (tx) => tx,
  extendMempoolTransaction: (tx) => tx as MempoolTransactionExtended,
  stripCoinbaseTransaction: (tx) => ({ vin: tx.vin, vout: tx.vout }),
  hex2ascii: (hex: string) => Buffer.from(hex, 'hex').toString('utf8'),
};

/** PUNTO DE INTEGRACIÓN — indexador de índices auxiliares de Core. */
const indexer: IIndexer = {
  reindex: () => undefined,
  isCoreIndexReady: () => null,
};

/** PUNTO DE INTEGRACIÓN — gestión de bloques huérfanos y puntas de cadena. */
const chainTips: IChainTips = {
  getOrphanedBlocksAtHeight: () => null,
  updateOrphanedBlocks: async () => undefined,
  clearOrphanCacheAboveHeight: () => undefined,
};

/** PUNTO DE INTEGRACIÓN — servicio de estadísticas. */
const statistics: IStatistics = {
  runStatistics: async () => undefined,
};

/** PUNTO DE INTEGRACIÓN — procesador de bloques nuevos. */
const blockProcessor: IBlockProcessor = {
  $processNewBlock: async (block): Promise<IProcessingResult> => {
    const blockExtended = block as unknown as BlockExtended;
    const blockSummary = { id: block.id, height: block.height, transactions: [] } as unknown as BlockSummary;
    return { blockExtended, blockSummary, cpfpSummary: { transactions: [], clusters: [] } };
  },
};

/** Adaptador del manejador WebSocket concreto al contrato del indexador. */
const websocketAdapter: IWebsocketHandler = {
  handleNewBlock: async (block) => {
    websocketHandler.broadcast('blocks', block);
  },
};

/** PUNTO DE INTEGRACIÓN — caché Redis. */
const redisCache: IRedisCache = {
  $updateBlocks: async () => undefined,
  $updateBlockSummaries: async () => undefined,
  $removeTransactions: async () => undefined,
  queueTransactionsForRemoval: () => undefined,
};

/** PUNTO DE INTEGRACIÓN — caché de Replace-By-Fee. */
const rbfCache: IRbfCache = {
  mined: () => undefined,
  updateCache: async () => undefined,
};

/** PUNTO DE INTEGRACIÓN — repositorio de hashrates. */
const hashratesRepository: IHashratesRepository = {
  $deleteHashratesFromTimestamp: async () => undefined,
};

/** PUNTO DE INTEGRACIÓN — repositorio de ajustes de dificultad. */
const difficultyAdjustmentsRepository: IDifficultyAdjustmentsRepository = {
  $saveAdjustments: async () => undefined,
  $deleteAdjustementsFromHeight: async () => undefined,
};

/** PUNTO DE INTEGRACIÓN — indicadores de progreso de carga. */
const loadingIndicators: ILoadingIndicators = {
  setProgress: (name: string, progress: number) => {
    logger.debug(`Progreso de '${name}': ${progress.toFixed(1)}%.`);
  },
};

/**
 * Construye el grafo completo de dependencias para el indexador `Blocks`.
 * @returns Objeto `BlocksDependencies` listo para inyectar.
 */
export function buildBlocksDependencies(): BlocksDependencies {
  return {
    bitcoinApi: bitcoinApiFactory,
    bitcoinCoreApi: bitcoinApiFactory,
    bitcoinClient: bitcoinClientAdapter,
    memPool,
    common,
    diskCache,
    transactionUtils,
    indexer,
    chainTips,
    statistics,
    blockProcessor,
    websocketHandler: websocketAdapter,
    redisCache,
    rbfCache,
    blocksRepository,
    hashratesRepository,
    difficultyAdjustmentsRepository,
    loadingIndicators,
  };
}
