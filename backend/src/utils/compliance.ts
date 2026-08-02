/**
 * Utilidades de cumplimiento normativo (KYC / AML / MiCA).
 *
 * Ofrece funciones auxiliares para la verificación de identidad (KYC), la
 * evaluación de riesgo antiblanqueo (AML) y la clasificación de activos según
 * el reglamento europeo MiCA (Markets in Crypto-Assets). Estas utilidades son
 * el punto de integración con proveedores externos de verificación.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

import config from '../config';
import logger from '../logger';

/** Nivel de riesgo AML asignado a una operación o cliente. */
export enum RiskLevel {
  BAJO = 'BAJO',
  MEDIO = 'MEDIO',
  ALTO = 'ALTO',
  CRITICO = 'CRITICO',
}

/** Estado de la verificación KYC de un cliente. */
export enum KycStatus {
  NO_INICIADO = 'NO_INICIADO',
  PENDIENTE = 'PENDIENTE',
  VERIFICADO = 'VERIFICADO',
  RECHAZADO = 'RECHAZADO',
}

/** Clasificación de un cripto-activo según MiCA. */
export enum MicaAssetClass {
  /** Token referenciado a activos (Asset-Referenced Token). */
  ART = 'ART',
  /** Token de dinero electrónico (E-Money Token). */
  EMT = 'EMT',
  /** Cripto-activo de utilidad (Utility Token). */
  UTILITY = 'UTILITY',
  /** Fuera del ámbito MiCA (p. ej. valores financieros → MiFID II). */
  FUERA_DE_AMBITO = 'FUERA_DE_AMBITO',
}

/** Resultado de una evaluación de cumplimiento. */
export interface ComplianceResult {
  approved: boolean;
  riskLevel: RiskLevel;
  reasons: string[];
}

/**
 * Verifica si una operación requiere KYC según la configuración y el importe.
 * Umbral de referencia: 1000 EUR (Reglamento de Transferencias de Fondos, TFR).
 * @param amountUSD Importe de la operación en USD.
 * @returns `true` si se exige KYC para esta operación.
 */
export function requiresKyc(amountUSD: number): boolean {
  if (config.COMPLIANCE.KYC_REQUIRED) {
    return true;
  }
  const KYC_THRESHOLD_USD = 1000;
  return amountUSD >= KYC_THRESHOLD_USD;
}

/**
 * Evalúa el nivel de riesgo AML de una operación mediante reglas heurísticas.
 * @param params Datos de la operación.
 * @returns Nivel de riesgo y motivos.
 */
export function assessAmlRisk(params: {
  amountUSD: number;
  counterpartyFlagged: boolean;
  jurisdictionRisk: RiskLevel;
  kycStatus: KycStatus;
}): ComplianceResult {
  const reasons: string[] = [];
  let score = 0;

  if (params.amountUSD >= 100000) {
    score += 2;
    reasons.push('Importe elevado (≥ 100.000 USD).');
  } else if (params.amountUSD >= 10000) {
    score += 1;
    reasons.push('Importe significativo (≥ 10.000 USD).');
  }

  if (params.counterpartyFlagged) {
    score += 3;
    reasons.push('Contraparte marcada en listas de vigilancia.');
  }

  if (params.jurisdictionRisk === RiskLevel.ALTO || params.jurisdictionRisk === RiskLevel.CRITICO) {
    score += 2;
    reasons.push(`Jurisdicción de riesgo ${params.jurisdictionRisk}.`);
  }

  if (params.kycStatus !== KycStatus.VERIFICADO) {
    score += 2;
    reasons.push('KYC no verificado.');
  }

  let riskLevel: RiskLevel;
  if (score >= 6) {
    riskLevel = RiskLevel.CRITICO;
  } else if (score >= 4) {
    riskLevel = RiskLevel.ALTO;
  } else if (score >= 2) {
    riskLevel = RiskLevel.MEDIO;
  } else {
    riskLevel = RiskLevel.BAJO;
  }

  const approved = riskLevel !== RiskLevel.CRITICO && params.kycStatus === KycStatus.VERIFICADO;
  if (!approved) {
    logger.warn(`Operación bloqueada por cumplimiento (riesgo ${riskLevel}): ${reasons.join(' ')}`, logger.tags.compliance);
  }

  return { approved, riskLevel, reasons };
}

/**
 * Clasifica un token RWA según MiCA en función de su tipo de respaldo.
 * @param backing Naturaleza del respaldo del token.
 * @returns Clase de activo MiCA.
 */
export function classifyUnderMica(backing: 'fiat' | 'basket' | 'utility' | 'security'): MicaAssetClass {
  switch (backing) {
    case 'fiat':
      return MicaAssetClass.EMT;
    case 'basket':
      return MicaAssetClass.ART;
    case 'utility':
      return MicaAssetClass.UTILITY;
    case 'security':
      // Los valores financieros quedan fuera de MiCA (regidos por MiFID II).
      return MicaAssetClass.FUERA_DE_AMBITO;
    default:
      return MicaAssetClass.FUERA_DE_AMBITO;
  }
}
