/**
 * Gestor y API del mempool.
 *
 * Mantiene una vista en memoria del mempool (histograma de comisiones y
 * estadísticas agregadas) y expone endpoints REST de consulta. Los datos se
 * refrescan periódicamente desde el backend on-chain (Esplora/Core).
 *
 * Endpoints:
 *   GET /api/mempool            → estadísticas agregadas del mempool
 *   GET /api/mempool/fees       → estimación de comisiones por objetivo
 *   GET /api/mempool/recent     → últimas transacciones observadas
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import axios, { AxiosInstance } from 'axios';
import { Router, Request, Response } from 'express';
import config from '../config';
import logger from '../logger';

/** Estadísticas agregadas del mempool. */
export interface MempoolStats {
  count: number;
  vsize: number;
  totalFee: number;
  feeHistogram: [number, number][];
  updatedAt: number;
}

/** Estimación de comisión (sat/vB) por objetivo de confirmación. */
export interface FeeEstimates {
  fastest: number;
  halfHour: number;
  hour: number;
  economy: number;
  minimum: number;
}

export class Mempool {
  public readonly router: Router;
  private readonly http: AxiosInstance;
  private stats: MempoolStats = { count: 0, vsize: 0, totalFee: 0, feeHistogram: [], updatedAt: 0 };
  private feeEstimates: FeeEstimates = { fastest: 1, halfHour: 1, hour: 1, economy: 1, minimum: 1 };
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.http = axios.create({
      baseURL: config.ESPLORA.REST_API_URL,
      timeout: 30000,
      headers: { 'User-Agent': `NESGESFinanceTrust/${config.APP.VERSION}` },
    });
    this.router = Router();
    this.registerRoutes();
  }

  /** Registra las rutas del módulo mempool. */
  private registerRoutes(): void {
    this.router.get('/', (_req: Request, res: Response) => res.json(this.stats));
    this.router.get('/fees', (_req: Request, res: Response) => res.json(this.feeEstimates));
    this.router.get('/recent', async (_req: Request, res: Response) => {
      try {
        const { data } = await this.http.get('/mempool/recent');
        res.json(data);
      } catch (e) {
        logger.err(`Error al obtener transacciones recientes: ${e instanceof Error ? e.message : String(e)}`);
        res.status(502).json({ error: 'No se pudo consultar el mempool.' });
      }
    });
  }

  /** Inicia el refresco periódico del estado del mempool. */
  public startPolling(intervalMs = 30000): void {
    this.refresh().catch(() => undefined);
    this.refreshTimer = setInterval(() => {
      this.refresh().catch(() => undefined);
    }, intervalMs);
  }

  /** Detiene el refresco periódico. */
  public stopPolling(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /** Devuelve las estadísticas actuales del mempool. */
  public getStats(): MempoolStats {
    return this.stats;
  }

  /** Refresca las estadísticas del mempool y la estimación de comisiones. */
  private async refresh(): Promise<void> {
    try {
      const [mempoolRes, feeRes] = await Promise.all([
        this.http.get<{ count: number; vsize: number; total_fee: number; fee_histogram: [number, number][] }>('/mempool'),
        this.http.get<Record<string, number>>('/fee-estimates'),
      ]);
      const m = mempoolRes.data;
      this.stats = {
        count: m.count,
        vsize: m.vsize,
        totalFee: m.total_fee,
        feeHistogram: m.fee_histogram ?? [],
        updatedAt: Date.now(),
      };
      const f = feeRes.data;
      this.feeEstimates = {
        fastest: f['1'] ?? 1,
        halfHour: f['3'] ?? 1,
        hour: f['6'] ?? 1,
        economy: f['144'] ?? 1,
        minimum: f['1008'] ?? 1,
      };
      logger.debug(`Mempool actualizado: ${this.stats.count} txs, ${this.stats.vsize} vB.`);
    } catch (e) {
      logger.warn(`No se pudo refrescar el mempool: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

export default new Mempool();
