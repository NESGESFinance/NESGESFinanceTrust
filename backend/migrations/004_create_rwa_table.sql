-- ===========================================================================
--  Migración 004 — Tablas de Activos del Mundo Real (RWA)
--
--  Plataforma : nesgesfinancetrust.com (v3.4-dev)
--  Motor      : MariaDB 10.11+ / MySQL 8+
--
--  Cada RWA se vincula a un Ordinal (Security Token / metadatos legales) y,
--  opcionalmente, a un Rune (Utility Token para fraccionamiento).
--
--  Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
--  TODOS LOS DERECHOS RESERVADOS 2025-2026.
-- ===========================================================================

-- Activos del mundo real tokenizados.
CREATE TABLE IF NOT EXISTS rwa_assets (
  id             CHAR(36)      NOT NULL,  -- UUID
  type           ENUM('INMUEBLE','VEHICULO','ARTE','COMMODITIES','DEUDA','EQUITY') NOT NULL,
  status         ENUM('PENDIENTE','ACTIVO','TRANSFERIDO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  name           VARCHAR(256)  NOT NULL,
  description    TEXT          NOT NULL,
  valuation_usd  DOUBLE        NOT NULL DEFAULT 0,
  inscription_id VARCHAR(80)   NOT NULL,  -- Ordinal vinculado
  rune_block     INT UNSIGNED  NULL,      -- Rune vinculado (opcional)
  rune_tx        INT UNSIGNED  NULL,
  owner          VARCHAR(128)  NOT NULL,  -- dirección Bitcoin propietaria
  metadata       LONGTEXT      NOT NULL,  -- JSON de AssetMetadata
  created_at     VARCHAR(32)   NOT NULL,
  updated_at     VARCHAR(32)   NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_inscription (inscription_id),
  KEY idx_type (type),
  KEY idx_status (status),
  KEY idx_owner (owner)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de auditoría de los activos (cambios de estado y titularidad).
CREATE TABLE IF NOT EXISTS rwa_history (
  entry_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  asset_id    CHAR(36)      NOT NULL,
  action      ENUM('REGISTRO','TASACION','TRANSFERENCIA','CANCELACION','ACTUALIZACION') NOT NULL,
  from_owner  VARCHAR(128)  NULL,
  to_owner    VARCHAR(128)  NULL,
  txid        CHAR(64)      NULL,
  timestamp   VARCHAR(32)   NOT NULL,
  notes       TEXT          NOT NULL,
  PRIMARY KEY (entry_id),
  KEY idx_asset (asset_id),
  CONSTRAINT fk_history_asset FOREIGN KEY (asset_id)
    REFERENCES rwa_assets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
