-- ===========================================================================
--  Migración 002 — Tablas del protocolo Runes (Utility Token)
--
--  Plataforma : nesgesfinancetrust.com (v3.4-dev)
--  Motor      : MariaDB 10.11+ / MySQL 8+
--
--  Las cantidades se almacenan como cadenas decimales (VARCHAR/DECIMAL(65)) para
--  preservar la precisión de los enteros de 128 bits del protocolo Runes.
--
--  Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
--  TODOS LOS DERECHOS RESERVADOS 2025-2026.
-- ===========================================================================

-- Tokens Rune grabados (etched).
CREATE TABLE IF NOT EXISTS runes (
  rune_block          INT UNSIGNED  NOT NULL,  -- bloque del grabado (RuneId.block)
  rune_tx             INT UNSIGNED  NOT NULL,  -- índice de tx (RuneId.tx)
  name                VARCHAR(64)   NOT NULL,  -- nombre sin espaciadores
  symbol              VARCHAR(8)    NOT NULL DEFAULT '¤',
  divisibility        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  premine             VARCHAR(40)   NOT NULL DEFAULT '0',
  total_supply        VARCHAR(40)   NOT NULL DEFAULT '0',
  circulating_supply  VARCHAR(40)   NOT NULL DEFAULT '0',
  mints               INT UNSIGNED  NOT NULL DEFAULT 0,
  holders             INT UNSIGNED  NOT NULL DEFAULT 0,
  etched_height       INT UNSIGNED  NOT NULL,
  etched_txid         CHAR(64)      NOT NULL,
  timestamp           BIGINT        NOT NULL,
  PRIMARY KEY (rune_block, rune_tx),
  UNIQUE KEY uniq_name (name),
  KEY idx_etched_height (etched_height)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Saldos de Runes por dirección (holders).
CREATE TABLE IF NOT EXISTS rune_holders (
  rune_block  INT UNSIGNED  NOT NULL,
  rune_tx     INT UNSIGNED  NOT NULL,
  address     VARCHAR(128)  NOT NULL,
  amount      VARCHAR(40)   NOT NULL DEFAULT '0',
  PRIMARY KEY (rune_block, rune_tx, address),
  KEY idx_address (address),
  CONSTRAINT fk_holder_rune FOREIGN KEY (rune_block, rune_tx)
    REFERENCES runes (rune_block, rune_tx) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
