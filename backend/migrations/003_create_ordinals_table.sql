-- ===========================================================================
--  Migración 003 — Tabla del protocolo Ordinals (Security Tokens)
--
--  Plataforma : nesgesfinancetrust.com (v3.4-dev)
--  Motor      : MariaDB 10.11+ / MySQL 8+
--
--  Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
--  TODOS LOS DERECHOS RESERVADOS 2025-2026.
-- ===========================================================================

-- Inscripciones Ordinals con su contenido binario embebido.
CREATE TABLE IF NOT EXISTS ordinals (
  id               VARCHAR(80)   NOT NULL,  -- <txid>i<index>
  number           BIGINT        NOT NULL,  -- número secuencial de inscripción
  address          VARCHAR(128)  NULL,      -- propietario actual
  genesis_address  VARCHAR(128)  NULL,      -- propietario en la génesis
  content_type     VARCHAR(128)  NOT NULL DEFAULT 'application/octet-stream',
  content_length   INT UNSIGNED  NOT NULL DEFAULT 0,
  sat_txid         CHAR(64)      NOT NULL,
  sat_vout         INT UNSIGNED  NOT NULL DEFAULT 0,
  sat_offset       VARCHAR(40)   NOT NULL DEFAULT '0',
  timestamp        BIGINT        NOT NULL,
  genesis_height   INT UNSIGNED  NOT NULL,
  genesis_txid     CHAR(64)      NOT NULL,
  sat              VARCHAR(40)   NULL,       -- número ordinal del satoshi
  content          LONGBLOB      NULL,       -- contenido crudo de la inscripción
  PRIMARY KEY (id),
  UNIQUE KEY uniq_number (number),
  KEY idx_genesis_height (genesis_height),
  KEY idx_address (address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
