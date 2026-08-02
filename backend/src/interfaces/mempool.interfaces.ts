/**
 * Interfaces del subsistema de bloques y mempool.
 *
 * Modelan las estructuras de datos extendidas usadas por el indexador de
 * bloques (`api/blocks.ts`), el manejador de mempool y la capa de auditoría.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

/** Estado de confirmación de una transacción. */
export interface TransactionStatus {
  confirmed: boolean;
  block_height?: number;
  block_hash?: string;
  block_time?: number;
}

/** Entrada (input) de una transacción Bitcoin. */
export interface Vin {
  txid?: string;
  vout?: number;
  scriptsig?: string;
  scriptsig_asm?: string;
  is_coinbase?: boolean;
  sequence?: number;
  witness?: string[];
  prevout?: Vout | null;
}

/** Salida (output) de una transacción Bitcoin. */
export interface Vout {
  scriptpubkey?: string;
  scriptpubkey_asm?: string;
  scriptpubkey_type?: string;
  scriptpubkey_address?: string;
  value: number;
}

/** Transacción base con datos on-chain. */
export interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  weight: number;
  fee: number;
  vin: Vin[];
  vout: Vout[];
  status?: TransactionStatus;
}

/** Transacción con campos derivados (vsize, feePerVsize, etc.). */
export interface TransactionExtended extends Transaction {
  vsize: number;
  feePerVsize?: number;
  effectiveFeePerVsize?: number;
  ancestors?: unknown[];
  descendants?: unknown[];
  bestDescendant?: unknown | null;
  cpfpChecked?: boolean;
  acc?: boolean;
  flags?: number;
}

/** Transacción del mempool con metadatos adicionales de aceleración. */
export interface MempoolTransactionExtended extends TransactionExtended {
  firstSeen?: number;
  order?: number;
  position?: { block: number; vsize: number };
}

/** Transacción clasificada (flags de "Goggles"). */
export interface TransactionClassified {
  txid: string;
  fee: number;
  vsize: number;
  value: number;
  flags: number;
}

/** Información mínima necesaria para identificar al minero de un bloque. */
export interface TransactionMinerInfo {
  vin: Vin[];
  vout: Vout[];
}

/** Etiqueta de pool de minería. */
export interface PoolTag {
  uniqueId: number;
  name: string;
  slug: string;
  addresses?: string[];
  regexes?: string[];
  minerNames?: string[] | null;
}

/** Datos extendidos (extras) asociados a un bloque. */
export interface BlockExtension {
  reward: number;
  coinbaseRaw: string;
  orphans: unknown[] | null;
  medianFee: number;
  feeRange: number[];
  totalFees: number;
  avgFee: number;
  avgFeeRate: number;
  utxoSetChange: number;
  avgTxSize: number;
  totalInputs: number;
  totalOutputs: number;
  totalOutputAmt: number;
  totalInputAmt: number | null;
  segwitTotalTxs: number;
  segwitTotalSize: number;
  segwitTotalWeight: number;
  feePercentiles: number[] | null;
  medianFeeAmt?: number;
  virtualSize: number;
  coinbaseAddress: string | null;
  coinbaseAddresses: string[] | null;
  coinbaseSignature: string | null;
  coinbaseSignatureAscii: string | null;
  coinbaseBip54?: boolean;
  header: string;
  utxoSetSize: number | null;
  matchRate: number | null;
  expectedFees: number | null;
  expectedWeight: number | null;
  firstSeen: number | null;
  pool?: {
    id: number;
    name: string;
    slug: string;
    minerNames: string[] | null;
  };
}

/** Bloque con datos extendidos calculados por el indexador. */
export interface BlockExtended {
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
  extras: BlockExtension;
}

/** Transacción "stripped" incluida en un resumen de bloque. */
export interface BlockSummaryTransaction {
  txid: string;
  vsize: number;
  fee: number;
  value: number;
  flags: number;
  acc?: boolean;
}

/** Resumen de bloque (lista de transacciones simplificadas). */
export interface BlockSummary {
  id: string;
  transactions: BlockSummaryTransaction[];
}

/** Algoritmo de plantilla usado en la auditoría de bloques. */
export type TemplateAlgorithm = 'gbt' | 'rust-gbt' | 'cluster';

/** Resumen de datos CPFP (Child Pays For Parent). */
export interface CpfpSummary {
  transactions: MempoolTransactionExtended[];
  clusters: unknown[];
}

/** Registro de auditoría de un bloque minado frente a la plantilla proyectada. */
export interface BlockAudit {
  version: number;
  height: number;
  hash: string;
  time: number;
  matchRate: number | null;
  expectedFees: number | null;
  expectedWeight: number | null;
}

/** Registro de auditoría a nivel de transacción individual. */
export interface TransactionAudit {
  txid: string;
  status: 'expected' | 'added' | 'missing' | 'fresh' | 'sigop' | 'accelerated';
}
