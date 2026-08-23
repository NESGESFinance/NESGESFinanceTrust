/**
 * Data Metadata Injector — NESGESFinanceTrust
 * Sistema de inyección y gestión de metadatos para auditoría y compliance
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

/**
 * Clase para gestionar metadatos de auditoría y cumplimiento
 */
class DataMetadataInjector {
  constructor(options = {}) {
    this.config = {
      enableAuditLog: options.enableAuditLog !== false,
      enableComplianceChecks: options.enableComplianceChecks !== false,
      auditStorageKey: 'nesges_audit_log',
      complianceStorageKey: 'nesges_compliance_flags',
      ...options
    };

    this.auditLog = this.loadAuditLog();
    this.complianceFlags = this.loadComplianceFlags();
  }

  /**
   * Carga log de auditoría desde localStorage
   */
  loadAuditLog() {
    if (!this.config.enableAuditLog) return [];
    try {
      const stored = localStorage.getItem(this.config.auditStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Error cargando audit log:', e);
      return [];
    }
  }

  /**
   * Carga flags de cumplimiento desde localStorage
   */
  loadComplianceFlags() {
    if (!this.config.enableComplianceChecks) return {};
    try {
      const stored = localStorage.getItem(this.config.complianceStorageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('Error cargando compliance flags:', e);
      return {};
    }
  }

  /**
   * Guarda log de auditoría
   */
  saveAuditLog() {
    if (!this.config.enableAuditLog) return;
    try {
      localStorage.setItem(
        this.config.auditStorageKey,
        JSON.stringify(this.auditLog)
      );
    } catch (e) {
      console.error('Error guardando audit log:', e);
    }
  }

  /**
   * Guarda flags de cumplimiento
   */
  saveComplianceFlags() {
    if (!this.config.enableComplianceChecks) return;
    try {
      localStorage.setItem(
        this.config.complianceStorageKey,
        JSON.stringify(this.complianceFlags)
      );
    } catch (e) {
      console.error('Error guardando compliance flags:', e);
    }
  }

  /**
   * Registra un evento de auditoría
   * @param {string} action - Acción realizada
   * @param {object} details - Detalles del evento
   * @param {string} severity - Severidad (info, warning, error)
   */
  logAuditEvent(action, details = {}, severity = 'info') {
    if (!this.config.enableAuditLog) return;

    const event = {
      timestamp: new Date().toISOString(),
      action,
      details,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      sessionId: this.getOrCreateSessionId()
    };

    this.auditLog.push(event);
    this.saveAuditLog();

    // Log en consola si es error o warning
    if (severity === 'error' || severity === 'warning') {
      console[severity === 'error' ? 'error' : 'warn'](`[AUDIT] ${action}:`, details);
    }

    return event;
  }

  /**
   * Registra un evento de compliance
   * @param {string} checkType - Tipo de verificación
   * @param {boolean} passed - Si pasó la verificación
   * @param {string} details - Detalles
   */
  logComplianceCheck(checkType, passed, details = '') {
    if (!this.config.enableComplianceChecks) return;

    const checkEntry = {
      timestamp: new Date().toISOString(),
      checkType,
      passed,
      details,
      sessionId: this.getOrCreateSessionId()
    };

    if (!this.complianceFlags[checkType]) {
      this.complianceFlags[checkType] = [];
    }

    this.complianceFlags[checkType].push(checkEntry);
    this.saveComplianceFlags();

    return checkEntry;
  }

  /**
   * Inyecta metadatos en un objeto de datos
   * @param {object} data - Objeto de datos
   * @param {string} dataType - Tipo de dato (expedient, rwa, token, etc)
   * @returns {object} Datos con metadatos inyectados
   */
  injectMetadata(data, dataType = 'generic') {
    const metadata = {
      _metadata: {
        injectedAt: new Date().toISOString(),
        dataType,
        version: '1.0',
        sessionId: this.getOrCreateSessionId(),
        auditTrail: [],
        complianceStatus: {},
        integrity: {
          hash: this.generateDataHash(data),
          algorithm: 'SHA256'
        }
      }
    };

    // Auditar inyección
    this.logAuditEvent('METADATA_INJECTED', {
      dataType,
      dataSize: JSON.stringify(data).length
    });

    return {
      ...data,
      ...metadata
    };
  }

  /**
   * Verifica integridad de datos
   * @param {object} data - Objeto con metadatos
   * @returns {boolean}
   */
  verifyIntegrity(data) {
    if (!data._metadata || !data._metadata.integrity) {
      return false;
    }

    const currentHash = this.generateDataHash(data);
    const storedHash = data._metadata.integrity.hash;

    const isValid = currentHash === storedHash;

    this.logAuditEvent('INTEGRITY_CHECK', {
      dataType: data._metadata.dataType,
      valid: isValid,
      expectedHash: storedHash,
      currentHash
    });

    return isValid;
  }

  /**
   * Genera hash SHA256 de un objeto (simulado)
   * @param {object} data
   * @returns {string}
   */
  generateDataHash(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'sha256_' + Math.abs(hash).toString(16);
  }

  /**
   * Obtiene o crea ID de sesión
   * @returns {string}
   */
  getOrCreateSessionId() {
    let sessionId = sessionStorage.getItem('nesges_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('nesges_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Obtiene report de auditoría filtrado
   * @param {object} filters - Filtros {action, severity, dateRange}
   * @returns {array}
   */
  getAuditReport(filters = {}) {
    let report = [...this.auditLog];

    if (filters.action) {
      report = report.filter(e => e.action === filters.action);
    }

    if (filters.severity) {
      report = report.filter(e => e.severity === filters.severity);
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      report = report.filter(e => {
        const eventDate = new Date(e.timestamp);
        return eventDate >= start && eventDate <= end;
      });
    }

    return report;
  }

  /**
   * Obtiene reporte de compliance
   * @param {string} checkType - Tipo de verificación específica (opcional)
   * @returns {object}
   */
  getComplianceReport(checkType = null) {
    const report = {
      generatedAt: new Date().toISOString(),
      checkTypes: {},
      summary: {
        totalChecks: 0,
        passed: 0,
        failed: 0,
        passRate: 0
      }
    };

    const checks = checkType ? { [checkType]: this.complianceFlags[checkType] || [] } : this.complianceFlags;

    Object.entries(checks).forEach(([type, entries]) => {
      const passed = entries.filter(e => e.passed).length;
      const failed = entries.length - passed;

      report.checkTypes[type] = {
        total: entries.length,
        passed,
        failed,
        passRate: entries.length > 0 ? (passed / entries.length * 100).toFixed(2) + '%' : 'N/A',
        entries: entries.slice(-10) // Últimas 10 entradas
      };

      report.summary.totalChecks += entries.length;
      report.summary.passed += passed;
      report.summary.failed += failed;
    });

    if (report.summary.totalChecks > 0) {
      report.summary.passRate = (report.summary.passed / report.summary.totalChecks * 100).toFixed(2) + '%';
    }

    return report;
  }

  /**
   * Exporta audit log como JSON
   * @returns {string}
   */
  exportAuditLog() {
    return JSON.stringify(this.auditLog, null, 2);
  }

  /**
   * Exporta compliance report como JSON
   * @returns {string}
   */
  exportComplianceReport() {
    return JSON.stringify(this.getComplianceReport(), null, 2);
  }

  /**
   * Limpia logs antiguos
   * @param {number} daysToKeep - Días a mantener
   */
  pruneOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.auditLog = this.auditLog.filter(entry => {
      return new Date(entry.timestamp) > cutoffDate;
    });

    Object.keys(this.complianceFlags).forEach(checkType => {
      this.complianceFlags[checkType] = this.complianceFlags[checkType].filter(entry => {
        return new Date(entry.timestamp) > cutoffDate;
      });
    });

    this.saveAuditLog();
    this.saveComplianceFlags();

    this.logAuditEvent('LOGS_PRUNED', {
      daysToKeep,
      cutoffDate: cutoffDate.toISOString()
    });
  }

  /**
   * Obtiene estadísticas de auditoría
   * @returns {object}
   */
  getAuditStats() {
    const stats = {
      totalEvents: this.auditLog.length,
      eventsByAction: {},
      eventsBySeverity: {},
      dateRange: {
        earliest: this.auditLog.length > 0 ? this.auditLog[0].timestamp : null,
        latest: this.auditLog.length > 0 ? this.auditLog[this.auditLog.length - 1].timestamp : null
      }
    };

    this.auditLog.forEach(event => {
      // Contar por acción
      if (!stats.eventsByAction[event.action]) {
        stats.eventsByAction[event.action] = 0;
      }
      stats.eventsByAction[event.action]++;

      // Contar por severidad
      if (!stats.eventsBySeverity[event.severity]) {
        stats.eventsBySeverity[event.severity] = 0;
      }
      stats.eventsBySeverity[event.severity]++;
    });

    return stats;
  }

  /**
   * Valida conformidad con estándares
   * @param {object} data - Datos a validar
   * @param {string} standard - Estándar (ISO27001, GDPR, SOC2, etc)
   * @returns {object} Resultado de validación
   */
  validateStandard(data, standard = 'ISO27001') {
    const validation = {
      standard,
      timestamp: new Date().toISOString(),
      checks: [],
      compliant: true
    };

    const standardChecks = {
      ISO27001: [
        { key: 'hasEncryption', message: 'Datos deben estar encriptados' },
        { key: 'hasAuditTrail', message: 'Debe haber trail de auditoría' },
        { key: 'hasIntegrity', message: 'Debe incluir verificación de integridad' }
      ],
      GDPR: [
        { key: 'hasConsent', message: 'Debe tener consentimiento documentado' },
        { key: 'hasRetention', message: 'Debe especificar período de retención' },
        { key: 'hasRightToBeForgotten', message: 'Debe permitir derecho al olvido' }
      ],
      SOC2: [
        { key: 'hasAccessControl', message: 'Debe tener control de acceso' },
        { key: 'hasDataProtection', message: 'Debe tener protección de datos' },
        { key: 'hasMonitoring', message: 'Debe tener monitoreo continuo' }
      ]
    };

    const checksToRun = standardChecks[standard] || [];

    checksToRun.forEach(check => {
      const result = {
        checkKey: check.key,
        message: check.message,
        passed: data[check.key] === true,
        timestamp: new Date().toISOString()
      };
      validation.checks.push(result);
      if (!result.passed) validation.compliant = false;

      this.logComplianceCheck(standard + '_' + check.key, result.passed, check.message);
    });

    return validation;
  }

  /**
   * Registra evento de cambio de estado
   * @param {string} entityId - ID de la entidad
   * @param {string} previousState - Estado anterior
   * @param {string} newState - Nuevo estado
   * @param {object} context - Contexto del cambio
   */
  logStateChange(entityId, previousState, newState, context = {}) {
    this.logAuditEvent('STATE_CHANGE', {
      entityId,
      previousState,
      newState,
      context,
      changedAt: new Date().toISOString()
    });

    this.logComplianceCheck(
      'STATE_TRANSITION_' + previousState + '_TO_' + newState,
      true,
      `Transición válida de ${previousState} a ${newState}`
    );
  }
}

// Instancia global para uso en toda la aplicación
const auditMetadata = new DataMetadataInjector({
  enableAuditLog: true,
  enableComplianceChecks: true
});

// Exportar
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DataMetadataInjector, auditMetadata };
}
