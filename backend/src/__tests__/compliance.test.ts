/**
 * Pruebas unitarias para las utilidades de cumplimiento normativo.
 *
 * Cubre: requiresKyc, assessAmlRisk, classifyUnderMica.
 *
 * Las pruebas no dependen de la base de datos ni de Redis; sólo ejercen la
 * lógica de negocio pura implementada en `compliance.ts`.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import {
  requiresKyc,
  assessAmlRisk,
  classifyUnderMica,
  RiskLevel,
  KycStatus,
  MicaAssetClass,
} from '../utils/compliance';

/* ────────────────────────────────────────────────────────────────────────────
   requiresKyc
   ──────────────────────────────────────────────────────────────────────────── */
describe('requiresKyc', () => {
  it('devuelve true cuando KYC_REQUIRED está activo (defecto de config)', () => {
    // La configuración por defecto tiene KYC_REQUIRED=true.
    expect(requiresKyc(1)).toBe(true);
    expect(requiresKyc(0)).toBe(true);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   assessAmlRisk
   ──────────────────────────────────────────────────────────────────────────── */
describe('assessAmlRisk', () => {
  const baseParams = {
    amountUSD: 100,
    counterpartyFlagged: false,
    jurisdictionRisk: RiskLevel.BAJO,
    kycStatus: KycStatus.VERIFICADO,
  };

  it('aprueba una operación de bajo riesgo con KYC verificado', () => {
    const result = assessAmlRisk(baseParams);
    expect(result.approved).toBe(true);
    expect(result.riskLevel).toBe(RiskLevel.BAJO);
    expect(result.reasons).toHaveLength(0);
  });

  it('asigna riesgo BAJO por importe ≥ 10 000 USD (score=1, umbral MEDIO=2)', () => {
    const result = assessAmlRisk({ ...baseParams, amountUSD: 15000 });
    expect(result.riskLevel).toBe(RiskLevel.BAJO);
    expect(result.reasons.some((r) => r.includes('10.000'))).toBe(true);
  });

  it('asigna riesgo ALTO por importe ≥ 100 000 USD y KYC no verificado', () => {
    const result = assessAmlRisk({
      ...baseParams,
      amountUSD: 150000,
      kycStatus: KycStatus.PENDIENTE,
    });
    expect(result.riskLevel).toBe(RiskLevel.ALTO);
    expect(result.approved).toBe(false);
  });

  it('asigna riesgo CRITICO por contraparte marcada y KYC no verificado', () => {
    const result = assessAmlRisk({
      amountUSD: 5000,
      counterpartyFlagged: true,
      jurisdictionRisk: RiskLevel.ALTO,
      kycStatus: KycStatus.PENDIENTE,
    });
    expect(result.riskLevel).toBe(RiskLevel.CRITICO);
    expect(result.approved).toBe(false);
  });

  it('aprueba cuando sólo la contraparte está marcada y KYC verificado (score=3 → MEDIO, aprobado)', () => {
    const result = assessAmlRisk({
      ...baseParams,
      counterpartyFlagged: true,
    });
    // score = 3 (contraparte) → MEDIO; KYC verificado → approved=true
    expect(result.riskLevel).toBe(RiskLevel.MEDIO);
    expect(result.approved).toBe(true);
    expect(result.reasons.some((r) => r.includes('Contraparte'))).toBe(true);
  });

  it('no aprueba si el nivel es CRITICO aunque el KYC esté verificado', () => {
    const result = assessAmlRisk({
      amountUSD: 200000,
      counterpartyFlagged: true,
      jurisdictionRisk: RiskLevel.ALTO,
      kycStatus: KycStatus.VERIFICADO,
    });
    expect(result.riskLevel).toBe(RiskLevel.CRITICO);
    expect(result.approved).toBe(false);
  });

  it('rechaza si el KYC no está verificado aunque el riesgo sea BAJO', () => {
    const result = assessAmlRisk({
      ...baseParams,
      kycStatus: KycStatus.NO_INICIADO,
    });
    expect(result.approved).toBe(false);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   classifyUnderMica
   ──────────────────────────────────────────────────────────────────────────── */
describe('classifyUnderMica', () => {
  it('clasifica backing fiat como EMT', () => {
    expect(classifyUnderMica('fiat')).toBe(MicaAssetClass.EMT);
  });

  it('clasifica backing basket como ART', () => {
    expect(classifyUnderMica('basket')).toBe(MicaAssetClass.ART);
  });

  it('clasifica backing utility como UTILITY', () => {
    expect(classifyUnderMica('utility')).toBe(MicaAssetClass.UTILITY);
  });

  it('clasifica backing security como FUERA_DE_AMBITO (MiFID II)', () => {
    expect(classifyUnderMica('security')).toBe(MicaAssetClass.FUERA_DE_AMBITO);
  });
});
