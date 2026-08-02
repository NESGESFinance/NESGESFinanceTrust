/**
 * Registro de Activos del Mundo Real (RWA).
 *
 * Orquesta el ciclo de vida de un activo tokenizado, vinculando el activo
 * físico/financiero con su Ordinal (Security Token, contenedor de metadatos y
 * titularidad legal) y, opcionalmente, con un Rune (Utility Token para
 * fraccionamiento y liquidez). Antes de persistir, delega la validación en el
 * `RWAValidator`.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { randomUUID } from 'crypto';
import logger from '../../logger';
import rwaRepository, { RWARepository } from '../../repositories/RWARepository';
import rwaValidator, { RWAValidator, ValidationResult } from './rwa-validator';
import { KycStatus, RiskLevel } from '../../utils/compliance';
import {
  AssetMetadata,
  AssetStatus,
  AssetType,
  RealWorldAsset,
} from '../../interfaces/rwa.interfaces';
import { RuneId } from '../../interfaces/runes.interfaces';

/** Parámetros de registro de un nuevo activo. */
export interface RegisterAssetParams {
  type: AssetType;
  name: string;
  description: string;
  valuationUSD: number;
  inscriptionId: string;
  runeId?: RuneId | null;
  owner: string;
  metadata: AssetMetadata;
  ownerKyc: KycStatus;
  jurisdictionRisk: RiskLevel;
  backing: 'fiat' | 'basket' | 'utility' | 'security';
}

/** Resultado del registro de un activo. */
export interface RegisterAssetResult {
  asset: RealWorldAsset | null;
  validation: ValidationResult;
}

export class RWARegistry {
  constructor(
    private readonly repository: RWARepository = rwaRepository,
    private readonly validator: RWAValidator = rwaValidator,
  ) {}

  /**
   * Registra un nuevo activo del mundo real tras validarlo.
   * @param params Datos del activo.
   * @returns El activo registrado (o `null` si la validación falla) y el
   *          resultado de la validación.
   */
  public async registerAsset(params: RegisterAssetParams): Promise<RegisterAssetResult> {
    const now = new Date().toISOString();
    const asset: RealWorldAsset = {
      id: randomUUID(),
      type: params.type,
      status: AssetStatus.PENDIENTE,
      name: params.name,
      description: params.description,
      valuationUSD: params.valuationUSD,
      inscriptionId: params.inscriptionId,
      runeId: params.runeId ?? null,
      owner: params.owner,
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now,
    };

    const validation = this.validator.validate(asset, params.ownerKyc, params.jurisdictionRisk, params.backing);
    if (!validation.valid) {
      logger.warn(`Registro de activo rechazado (${asset.name}): ${validation.errors.join(' ')}`, logger.tags.rwa);
      return { asset: null, validation };
    }

    asset.status = AssetStatus.ACTIVO;
    await this.repository.$upsertAsset(asset);
    await this.repository.$addHistoryEntry({
      assetId: asset.id,
      action: 'REGISTRO',
      fromOwner: null,
      toOwner: asset.owner,
      txid: null,
      timestamp: now,
      notes: `Activo registrado y vinculado al Ordinal ${asset.inscriptionId}.`,
    });
    logger.info(`Activo RWA registrado: ${asset.id} (${asset.name}, ${asset.valuationUSD} USD).`, logger.tags.rwa);

    return { asset, validation };
  }

  /** Obtiene un activo por su identificador interno. */
  public async getAsset(id: string): Promise<RealWorldAsset | null> {
    return this.repository.$getAsset(id);
  }

  /** Lista activos con filtros opcionales. */
  public async listAssets(
    filters: { type?: AssetType; status?: AssetStatus } = {},
    limit = 50,
    offset = 0,
  ): Promise<RealWorldAsset[]> {
    return this.repository.$listAssets(filters, limit, offset);
  }

  /**
   * Verifica que una dirección es la propietaria actual de un activo.
   * @param assetId Identificador del activo.
   * @param address Dirección a comprobar.
   * @returns `true` si la dirección posee el activo.
   */
  public async validateOwnership(assetId: string, address: string): Promise<boolean> {
    const asset = await this.repository.$getAsset(assetId);
    return asset !== null && asset.owner === address && asset.status === AssetStatus.ACTIVO;
  }

  /**
   * Transfiere la titularidad de un activo a un nuevo propietario.
   * @param assetId Identificador del activo.
   * @param newOwner Dirección del nuevo propietario.
   * @param txid Txid de la transacción Bitcoin que ejecuta la transferencia.
   * @returns El activo actualizado o `null` si no existe.
   */
  public async transferOwnership(assetId: string, newOwner: string, txid: string): Promise<RealWorldAsset | null> {
    const asset = await this.repository.$getAsset(assetId);
    if (!asset) {
      return null;
    }
    const previousOwner = asset.owner;
    const now = new Date().toISOString();
    asset.owner = newOwner;
    asset.status = AssetStatus.TRANSFERIDO;
    asset.updatedAt = now;
    await this.repository.$upsertAsset(asset);
    await this.repository.$addHistoryEntry({
      assetId,
      action: 'TRANSFERENCIA',
      fromOwner: previousOwner,
      toOwner: newOwner,
      txid,
      timestamp: now,
      notes: 'Transferencia de titularidad ejecutada on-chain.',
    });
    logger.info(`Activo ${assetId} transferido de ${previousOwner} a ${newOwner}.`, logger.tags.rwa);
    return asset;
  }

  /** Obtiene el historial de auditoría de un activo. */
  public async getAssetHistory(assetId: string): Promise<import('../../interfaces/rwa.interfaces').AssetHistoryEntry[]> {
    return this.repository.$getAssetHistory(assetId);
  }
}

export default new RWARegistry();
