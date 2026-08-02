/**
 * Validador de Activos del Mundo Real (RWA).
 *
 * Comprueba la integridad y coherencia de los datos de un activo antes de su
 * registro on-chain: campos obligatorios, integridad de documentos legales
 * (hash SHA-256), coherencia de la valoración y cumplimiento normativo
 * (KYC/AML/MiCA) del propietario y de la operación.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { RealWorldAsset } from '../../interfaces/rwa.interfaces';
import { sha256 } from '../../bitcoin/crypto/hash-utils';
import {
  ComplianceResult,
  KycStatus,
  RiskLevel,
  assessAmlRisk,
  classifyUnderMica,
  requiresKyc,
} from '../../utils/compliance';

/** Resultado de la validación de un activo. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  compliance: ComplianceResult;
  micaClass: string;
}

/** Expresión regular para una dirección Bitcoin (heurística básica). */
const BTC_ADDRESS_REGEX = /^(bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,39})$/;

/** Patrón de un hash SHA-256 hexadecimal (64 caracteres). */
const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/i;

export class RWAValidator {
  /**
   * Valida un activo del mundo real de forma exhaustiva.
   * @param asset Activo a validar.
   * @param ownerKyc Estado KYC del propietario.
   * @param jurisdictionRisk Riesgo de la jurisdicción del activo.
   * @param backing Naturaleza del respaldo del token (para MiCA).
   * @returns Resultado de la validación.
   */
  public validate(
    asset: RealWorldAsset,
    ownerKyc: KycStatus,
    jurisdictionRisk: RiskLevel,
    backing: 'fiat' | 'basket' | 'utility' | 'security',
  ): ValidationResult {
    const errors: string[] = [];

    if (!asset.name || asset.name.trim().length === 0) {
      errors.push('El nombre del activo es obligatorio.');
    }
    if (asset.valuationUSD <= 0) {
      errors.push('La valoración debe ser un importe positivo en USD.');
    }
    if (!BTC_ADDRESS_REGEX.test(asset.owner)) {
      errors.push('La dirección del propietario no es una dirección Bitcoin válida.');
    }
    if (!asset.inscriptionId || !asset.inscriptionId.includes('i')) {
      errors.push('El identificador de inscripción (Ordinal) es obligatorio y debe tener el formato <txid>i<index>.');
    }

    // Validación de los documentos legales.
    for (const doc of asset.metadata.legalDocuments) {
      if (!SHA256_HEX_REGEX.test(doc.sha256)) {
        errors.push(`El documento "${doc.title}" tiene un hash SHA-256 inválido.`);
      }
      if (!doc.uri) {
        errors.push(`El documento "${doc.title}" no tiene URI.`);
      }
    }

    // Evaluación de cumplimiento (KYC/AML).
    if (requiresKyc(asset.valuationUSD) && ownerKyc !== KycStatus.VERIFICADO) {
      errors.push('El propietario requiere verificación KYC para el importe de la operación.');
    }
    const compliance = assessAmlRisk({
      amountUSD: asset.valuationUSD,
      counterpartyFlagged: false,
      jurisdictionRisk,
      kycStatus: ownerKyc,
    });

    const micaClass = classifyUnderMica(backing);

    return {
      valid: errors.length === 0 && compliance.approved,
      errors,
      compliance,
      micaClass,
    };
  }

  /**
   * Verifica la integridad de un documento comparando su hash SHA-256.
   * @param content Contenido binario del documento.
   * @param expectedSha256 Hash esperado en hexadecimal.
   * @returns `true` si el hash coincide.
   */
  public verifyDocumentIntegrity(content: Buffer, expectedSha256: string): boolean {
    const actual = sha256(content).toString('hex');
    return actual.toLowerCase() === expectedSha256.toLowerCase();
  }
}

export default new RWAValidator();
