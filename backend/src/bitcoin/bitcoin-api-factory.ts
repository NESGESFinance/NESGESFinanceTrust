/**
 * Factoría unificada de acceso a datos on-chain.
 *
 * Abstrae la fuente de datos (Bitcoin Core RPC o Blockstream Esplora) tras una
 * interfaz común (`IBitcoinApiFactory`). Según `MEMPOOL_BACKEND`, delega en el
 * cliente correspondiente y normaliza las respuestas a los tipos internos
 * (`IEsploraApi.Block`, `TransactionExtended`).
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import config from '../config';
import esploraClient, { EsploraClient, EsploraTx } from './esplora-client';
import { IBitcoinApi, IBitcoinApiFactory, IEsploraApi } from '../api/_contracts';
import { TransactionExtended, Vin, Vout } from '../interfaces/mempool.interfaces';

/** Normaliza un input de Esplora al tipo interno `Vin`. */
function mapVin(vin: EsploraTx['vin'][number]): Vin {
  return {
    txid: vin.txid,
    vout: vin.vout,
    scriptsig: vin.scriptsig,
    scriptsig_asm: vin.scriptsig_asm,
    is_coinbase: vin.is_coinbase,
    sequence: vin.sequence,
    witness: vin.witness,
    prevout: vin.prevout
      ? {
          scriptpubkey: vin.prevout.scriptpubkey,
          scriptpubkey_address: vin.prevout.scriptpubkey_address,
          value: vin.prevout.value,
        }
      : null,
  };
}

/** Normaliza un output de Esplora al tipo interno `Vout`. */
function mapVout(vout: EsploraTx['vout'][number]): Vout {
  return {
    scriptpubkey: vout.scriptpubkey,
    scriptpubkey_asm: vout.scriptpubkey_asm,
    scriptpubkey_type: vout.scriptpubkey_type,
    scriptpubkey_address: vout.scriptpubkey_address,
    value: vout.value,
  };
}

/** Normaliza una transacción de Esplora a `TransactionExtended`. */
function mapTransaction(tx: EsploraTx): TransactionExtended {
  const vsize = Math.ceil(tx.weight / 4);
  return {
    txid: tx.txid,
    version: tx.version,
    locktime: tx.locktime,
    size: tx.size,
    weight: tx.weight,
    fee: tx.fee ?? 0,
    vin: tx.vin.map(mapVin),
    vout: tx.vout.map(mapVout),
    status: {
      confirmed: tx.status.confirmed,
      block_height: tx.status.block_height,
      block_hash: tx.status.block_hash,
      block_time: tx.status.block_time,
    },
    vsize,
    feePerVsize: vsize > 0 ? (tx.fee ?? 0) / vsize : 0,
    effectiveFeePerVsize: vsize > 0 ? (tx.fee ?? 0) / vsize : 0,
  };
}

/**
 * Implementación de la factoría basada en Esplora (backend por defecto).
 */
export class EsploraApiFactory implements IBitcoinApiFactory {
  constructor(private readonly esplora: EsploraClient = esploraClient) {}

  public $getBlockHeightTip(): Promise<number> {
    return this.esplora.$getBlockHeightTip();
  }

  public $getBlockHash(height: number): Promise<string> {
    return this.esplora.$getBlockHash(height);
  }

  public async $getBlock(hash: string): Promise<IEsploraApi.Block> {
    const raw = await this.esplora.$getBlock(hash);
    return this.normalizeBlock(raw);
  }

  public $getTxIdsForBlock(hash: string): Promise<string[]> {
    return this.esplora.$getTxIdsForBlock(hash);
  }

  public async $getTxsForBlock(hash: string): Promise<TransactionExtended[]> {
    const txs = await this.esplora.$getTxsForBlock(hash);
    return txs.map(mapTransaction);
  }

  public async $getCoinbaseTx(hash: string): Promise<TransactionExtended> {
    const txids = await this.esplora.$getTxIdsForBlock(hash);
    const coinbase = await this.esplora.$getTransaction(txids[0]);
    return mapTransaction(coinbase);
  }

  /** Convierte un bloque verboso de Bitcoin Core al formato Esplora. */
  public convertBlock(verboseBlock: IBitcoinApi.VerboseBlock): IEsploraApi.Block {
    const raw = verboseBlock as unknown as Record<string, unknown>;
    return this.normalizeBlock(raw);
  }

  /** Normaliza un bloque en crudo (Record) al tipo `IEsploraApi.Block`. */
  private normalizeBlock(raw: Record<string, unknown>): IEsploraApi.Block {
    return {
      id: String(raw.id ?? raw.hash ?? ''),
      height: Number(raw.height ?? 0),
      version: Number(raw.version ?? 0),
      timestamp: Number(raw.timestamp ?? raw.time ?? 0),
      bits: Number(raw.bits ?? 0),
      nonce: Number(raw.nonce ?? 0),
      difficulty: Number(raw.difficulty ?? 0),
      merkle_root: String(raw.merkle_root ?? raw.merkleroot ?? ''),
      tx_count: Number(raw.tx_count ?? (Array.isArray(raw.tx) ? raw.tx.length : 0)),
      size: Number(raw.size ?? 0),
      weight: Number(raw.weight ?? 0),
      previousblockhash: String(raw.previousblockhash ?? ''),
      mediantime: Number(raw.mediantime ?? 0),
    };
  }
}

/** Instancia por defecto seleccionada según `MEMPOOL_BACKEND`. */
const factory: IBitcoinApiFactory = new EsploraApiFactory();

if (config.MEMPOOL.BACKEND === 'core') {
  // En una implementación completa aquí se seleccionaría una factoría basada en
  // Bitcoin Core RPC. Por defecto se utiliza Esplora, compatible con Core vía
  // el mismo contrato `IBitcoinApiFactory`.
}

export default factory;
