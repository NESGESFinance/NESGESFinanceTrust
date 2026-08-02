/**
 * API REST del registro de Activos del Mundo Real (RWA).
 *
 * Expone los endpoints del marketplace de tokenización de NESGESFinance:
 *   GET  /api/rwa/assets              → listado paginado (filtros type/status)
 *   GET  /api/rwa/assets/:id          → detalle de un activo
 *   GET  /api/rwa/assets/:id/history  → historial de auditoría
 *   POST /api/rwa/assets              → registro de un nuevo activo
 *   POST /api/rwa/assets/:id/transfer → transferencia de titularidad
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { Router, Request, Response } from 'express';
import logger from '../../logger';
import rwaRegistry, { RWARegistry, RegisterAssetParams } from './rwa-registry';
import { KycStatus, RiskLevel } from '../../utils/compliance';
import { AssetStatus, AssetType } from '../../interfaces/rwa.interfaces';

export class RWAAPI {
  public readonly router: Router;

  constructor(private readonly registry: RWARegistry = rwaRegistry) {
    this.router = Router();
    this.registerRoutes();
  }

  /** Registra las rutas del módulo RWA. */
  private registerRoutes(): void {
    this.router.get('/assets', this.listAssets.bind(this));
    this.router.get('/assets/:id', this.getAsset.bind(this));
    this.router.get('/assets/:id/history', this.getHistory.bind(this));
    this.router.post('/assets', this.registerAsset.bind(this));
    this.router.post('/assets/:id/transfer', this.transferAsset.bind(this));
  }

  /** GET /api/rwa/assets — listado con filtros. */
  private async listAssets(req: Request, res: Response): Promise<void> {
    try {
      const type = req.query.type as AssetType | undefined;
      const status = req.query.status as AssetStatus | undefined;
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const offset = Number(req.query.offset ?? 0);
      const assets = await this.registry.listAssets({ type, status }, limit, offset);
      res.json(assets);
    } catch (e) {
      this.fail(res, e, 'Error al listar los activos.');
    }
  }

  /** GET /api/rwa/assets/:id — detalle. */
  private async getAsset(req: Request, res: Response): Promise<void> {
    try {
      const asset = await this.registry.getAsset(req.params.id);
      if (!asset) {
        res.status(404).json({ error: 'Activo no encontrado.' });
        return;
      }
      res.json(asset);
    } catch (e) {
      this.fail(res, e, 'Error al obtener el activo.');
    }
  }

  /** GET /api/rwa/assets/:id/history — historial de auditoría. */
  private async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = await this.registry.getAssetHistory(req.params.id);
      res.json(history);
    } catch (e) {
      this.fail(res, e, 'Error al obtener el historial del activo.');
    }
  }

  /** POST /api/rwa/assets — registro de un nuevo activo. */
  private async registerAsset(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as Partial<RegisterAssetParams>;
      if (!body.type || !body.name || body.valuationUSD === undefined || !body.owner || !body.inscriptionId || !body.metadata) {
        res.status(400).json({ error: 'Faltan campos obligatorios (type, name, valuationUSD, owner, inscriptionId, metadata).' });
        return;
      }
      const params: RegisterAssetParams = {
        type: body.type,
        name: body.name,
        description: body.description ?? '',
        valuationUSD: body.valuationUSD,
        inscriptionId: body.inscriptionId,
        runeId: body.runeId ?? null,
        owner: body.owner,
        metadata: body.metadata,
        ownerKyc: body.ownerKyc ?? KycStatus.NO_INICIADO,
        jurisdictionRisk: body.jurisdictionRisk ?? RiskLevel.BAJO,
        backing: body.backing ?? 'security',
      };
      const result = await this.registry.registerAsset(params);
      if (!result.asset) {
        res.status(422).json({ error: 'Validación fallida.', validation: result.validation });
        return;
      }
      res.status(201).json({ asset: result.asset, validation: result.validation });
    } catch (e) {
      this.fail(res, e, 'Error al registrar el activo.');
    }
  }

  /** POST /api/rwa/assets/:id/transfer — transferencia de titularidad. */
  private async transferAsset(req: Request, res: Response): Promise<void> {
    try {
      const { newOwner, txid } = req.body as { newOwner?: string; txid?: string };
      if (!newOwner || !txid) {
        res.status(400).json({ error: 'Se requieren los campos newOwner y txid.' });
        return;
      }
      const asset = await this.registry.transferOwnership(req.params.id, newOwner, txid);
      if (!asset) {
        res.status(404).json({ error: 'Activo no encontrado.' });
        return;
      }
      res.json(asset);
    } catch (e) {
      this.fail(res, e, 'Error al transferir el activo.');
    }
  }

  /** Manejo uniforme de errores. */
  private fail(res: Response, error: unknown, message: string): void {
    logger.err(`${message} ${error instanceof Error ? error.message : String(error)}`, logger.tags.rwa);
    res.status(500).json({ error: message });
  }
}

export default new RWAAPI();
