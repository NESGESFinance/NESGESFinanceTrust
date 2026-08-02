/**
 * Cliente para la API REST de Blockstream Esplora.
 *
 * Envuelve los endpoints de Esplora usados por la plataforma: bloques,
 * transacciones, outspends y direcciones. Es la fuente de datos preferente
 * cuando `MEMPOOL_BACKEND=esplora`.
 *
 * Referencia de la API: https://github.com/Blockstream/esplora/blob/master/API.md
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

import axios, { AxiosInstance } from 'axios';
import config from '../config';
import logger from '../logger';

/** Representación de una transacción tal como la devuelve Esplora. */
export interface EsploraTx {
  txid: string;
  version: number;
  locktime: number;
  size: number;
  weight: number;
  fee: number;
  vin: {
    txid?: string;
    vout?: number;
    scriptsig?: string;
    scriptsig_asm?: string;
    is_coinbase?: boolean;
    sequence?: number;
    witness?: string[];
    prevout?: { scriptpubkey?: string; scriptpubkey_address?: string; value: number } | null;
  }[];
  vout: {
    scriptpubkey?: string;
    scriptpubkey_asm?: string;
    scriptpubkey_type?: string;
    scriptpubkey_address?: string;
    value: number;
  }[];
  status: { confirmed: boolean; block_height?: number; block_hash?: string; block_time?: number };
}

export class EsploraClient {
  private readonly http: AxiosInstance;

  constructor(baseURL: string = config.ESPLORA.REST_API_URL) {
    this.http = axios.create({
      baseURL,
      timeout: 30000,
      headers: { 'User-Agent': `NESGESFinanceTrust/${config.APP.VERSION}` },
    });
  }

  /** Devuelve la altura de la punta de la cadena. */
  public async $getBlockHeightTip(): Promise<number> {
    const { data } = await this.http.get<number>('/blocks/tip/height');
    return data;
  }

  /** Devuelve el hash de la punta de la cadena. */
  public async $getBlockHashTip(): Promise<string> {
    const { data } = await this.http.get<string>('/blocks/tip/hash');
    return data;
  }

  /** Devuelve el hash de un bloque dada su altura. */
  public async $getBlockHash(height: number): Promise<string> {
    const { data } = await this.http.get<string>(`/block-height/${height}`);
    return data;
  }

  /** Devuelve los metadatos de un bloque. */
  public async $getBlock(hash: string): Promise<Record<string, unknown>> {
    const { data } = await this.http.get<Record<string, unknown>>(`/block/${hash}`);
    return data;
  }

  /** Devuelve la lista de txids de un bloque. */
  public async $getTxIdsForBlock(hash: string): Promise<string[]> {
    const { data } = await this.http.get<string[]>(`/block/${hash}/txids`);
    return data;
  }

  /** Devuelve una transacción completa. */
  public async $getTransaction(txid: string): Promise<EsploraTx> {
    const { data } = await this.http.get<EsploraTx>(`/tx/${txid}`);
    return data;
  }

  /**
   * Devuelve las transacciones de un bloque paginando de 25 en 25 (límite de
   * Esplora). Concatena todas las páginas.
   */
  public async $getTxsForBlock(hash: string): Promise<EsploraTx[]> {
    const result: EsploraTx[] = [];
    let startIndex = 0;
    // Esplora devuelve como máximo 25 transacciones por página.
    for (;;) {
      const { data } = await this.http.get<EsploraTx[]>(`/block/${hash}/txs/${startIndex}`);
      if (!data.length) {
        break;
      }
      result.push(...data);
      if (data.length < 25) {
        break;
      }
      startIndex += 25;
    }
    return result;
  }

  /** Devuelve el hex crudo de una transacción. */
  public async $getRawTransaction(txid: string): Promise<Buffer> {
    const { data } = await this.http.get<string>(`/tx/${txid}/hex`);
    return Buffer.from(data, 'hex');
  }

  /** Devuelve las transacciones de una dirección. */
  public async $getAddressTransactions(address: string): Promise<EsploraTx[]> {
    try {
      const { data } = await this.http.get<EsploraTx[]>(`/address/${address}/txs`);
      return data;
    } catch (e) {
      logger.warn(`Fallo al obtener transacciones de la dirección ${address}: ${e instanceof Error ? e.message : e}`);
      return [];
    }
  }
}

export default new EsploraClient();
