/**
 * Cliente JSON-RPC para Bitcoin Core.
 *
 * Implementa las llamadas RPC usadas por el indexador (`getblockchaininfo`,
 * `getblock`, `getblockheader`, `getblockstats`, `gettxoutsetinfo`, etc.)
 * mediante HTTP básico contra el `bitcoind` configurado.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

import axios, { AxiosInstance } from 'axios';
import config from '../config';

/** Envoltura de una respuesta JSON-RPC. */
interface JsonRpcResponse<T> {
  result: T;
  error: { code: number; message: string } | null;
  id: string | number;
}

export class BitcoinClient {
  private readonly http: AxiosInstance;
  private requestId = 0;

  constructor() {
    const auth = Buffer.from(`${config.CORE_RPC.USERNAME}:${config.CORE_RPC.PASSWORD}`).toString('base64');
    this.http = axios.create({
      baseURL: `http://${config.CORE_RPC.HOST}:${config.CORE_RPC.PORT}`,
      timeout: config.CORE_RPC.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
    });
  }

  /**
   * Ejecuta una llamada JSON-RPC contra Bitcoin Core.
   * @param method Nombre del método RPC.
   * @param params Parámetros posicionales.
   * @returns Resultado tipado de la llamada.
   */
  private async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const { data } = await this.http.post<JsonRpcResponse<T>>('/', {
      jsonrpc: '1.0',
      id: `nesges-${++this.requestId}`,
      method,
      params,
    });
    if (data.error) {
      throw new Error(`RPC ${method} falló (${data.error.code}): ${data.error.message}`);
    }
    return data.result;
  }

  public getBlockchainInfo(): Promise<{ blocks: number; headers: number }> {
    return this.call('getblockchaininfo');
  }

  public getBlockCount(): Promise<number> {
    return this.call('getblockcount');
  }

  public getBlockHash(height: number): Promise<string> {
    return this.call('getblockhash', [height]);
  }

  public getBlock(hash: string, verbosity = 1): Promise<Record<string, unknown>> {
    return this.call('getblock', [hash, verbosity]);
  }

  public getBlockHeader(hash: string, verbose = true): Promise<Record<string, unknown> | string> {
    return this.call('getblockheader', [hash, verbose]);
  }

  public getBlockStats(hashOrHeight: string | number): Promise<Record<string, unknown>> {
    return this.call('getblockstats', [hashOrHeight]);
  }

  public getTxoutSetinfo(hashType = 'none', height?: number): Promise<Record<string, unknown>> {
    return height !== undefined ? this.call('gettxoutsetinfo', [hashType, height]) : this.call('gettxoutsetinfo', [hashType]);
  }

  public getRawTransaction(txid: string, verbose = true): Promise<Record<string, unknown>> {
    return this.call('getrawtransaction', [txid, verbose]);
  }

  public getRawMemPool(verbose = false): Promise<string[] | Record<string, unknown>> {
    return this.call('getrawmempool', [verbose]);
  }
}

export default new BitcoinClient();
