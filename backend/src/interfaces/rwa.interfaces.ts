/**
 * Interfaces de los Activos del Mundo Real (RWA — Real World Assets).
 *
 * Modelan el registro de activos físicos/financieros tokenizados en la
 * plataforma NESGESFinance. Cada RWA se vincula a un Ordinal (Security Token,
 * contenedor de metadatos y titularidad legal) y opcionalmente a un Rune
 * (Utility Token para fraccionamiento y liquidez).
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

import { RuneId } from './runes.interfaces';

/** Categorías de activo del mundo real admitidas. */
export enum AssetType {
  INMUEBLE = 'INMUEBLE',
  VEHICULO = 'VEHICULO',
  ARTE = 'ARTE',
  COMMODITIES = 'COMMODITIES',
  DEUDA = 'DEUDA',
  EQUITY = 'EQUITY',
}

/** Estado del ciclo de vida de un activo tokenizado. */
export enum AssetStatus {
  PENDIENTE = 'PENDIENTE',
  ACTIVO = 'ACTIVO',
  TRANSFERIDO = 'TRANSFERIDO',
  CANCELADO = 'CANCELADO',
}

/** Documento legal asociado a un activo (con su hash de integridad). */
export interface LegalDocument {
  /** Título o tipo de documento (escritura, factura, certificado…). */
  title: string;
  /** URI del documento (IPFS, Arweave o almacenamiento institucional). */
  uri: string;
  /** Hash SHA-256 del documento para verificación de integridad. */
  sha256: string;
}

/** Metadatos extendidos de un activo del mundo real. */
export interface AssetMetadata {
  /** Documentación legal (escrituras, contratos, facturas…). */
  legalDocuments: LegalDocument[];
  /** Ubicación física o jurisdicción del activo. */
  physicalLocation: string;
  /** Fecha de la última tasación (ISO 8601). */
  appraisalDate: string;
  /** Valor de tasación en USD. */
  appraisalValue: number;
  /** Certificaciones o sellos (ISO, RUC, notaría, etc.). */
  certifications: string[];
}

/** Activo del mundo real tokenizado y registrado en la plataforma. */
export interface RealWorldAsset {
  /** Identificador interno del activo (UUID). */
  id: string;
  type: AssetType;
  status: AssetStatus;
  name: string;
  description: string;
  /** Valoración vigente en USD. */
  valuationUSD: number;
  /** Ordinal vinculado (Security Token / contenedor de metadatos). */
  inscriptionId: string;
  /** Rune vinculado (Utility Token para fraccionamiento). Opcional. */
  runeId: RuneId | null;
  /** Dirección Bitcoin propietaria actual. */
  owner: string;
  metadata: AssetMetadata;
  createdAt: string;
  updatedAt: string;
}

/** Entrada del historial de un activo (auditoría de cambios de estado). */
export interface AssetHistoryEntry {
  assetId: string;
  action: 'REGISTRO' | 'TASACION' | 'TRANSFERENCIA' | 'CANCELACION' | 'ACTUALIZACION';
  fromOwner: string | null;
  toOwner: string | null;
  txid: string | null;
  timestamp: string;
  notes: string;
}
