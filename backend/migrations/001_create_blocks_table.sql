-- ===========================================================================
--  Migración 001 — Tablas de bloques y datos de minería
--
--  Plataforma : nesgesfinancetrust.com (v3.4-dev)
--  Motor      : MariaDB 10.11+ / MySQL 8+
--
--  Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
--  TODOS LOS DERECHOS RESERVADOS 2025-2026.
-- ===========================================================================

-- Tabla principal de bloques indexados.
CREATE TABLE IF NOT EXISTS blocks (
  height              INT UNSIGNED   NOT NULL,
  hash                CHAR(64)       NOT NULL,
  version             INT            NOT NULL,
  timestamp           BIGINT         NOT NULL,
  bits                BIGINT         NOT NULL,
  nonce               BIGINT         NOT NULL,
  difficulty          DOUBLE         NOT NULL,
  merkle_root         CHAR(64)       NOT NULL,
  tx_count            INT UNSIGNED   NOT NULL,
  size                INT UNSIGNED   NOT NULL,
  weight              INT UNSIGNED   NOT NULL,
  previous_block_hash CHAR(64)       NOT NULL DEFAULT '',
  median_time         BIGINT         NOT NULL DEFAULT 0,
  -- Datos extendidos (extras) serializados como JSON: recompensa, fees,
  -- coinbase, pool, coinbaseBip54, percentiles, etc.
  extras              LONGTEXT       NOT NULL,
  PRIMARY KEY (height),
  UNIQUE KEY uniq_hash (hash),
  KEY idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogo de pools de minería para la identificación del minero.
CREATE TABLE IF NOT EXISTS pools (
  unique_id   INT UNSIGNED  NOT NULL,
  name        VARCHAR(128)  NOT NULL,
  slug        VARCHAR(128)  NOT NULL,
  addresses   LONGTEXT      NOT NULL,  -- JSON: direcciones coinbase conocidas
  regexes     LONGTEXT      NOT NULL,  -- JSON: patrones de firma coinbase
  PRIMARY KEY (unique_id),
  UNIQUE KEY uniq_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Resúmenes de bloque con transacciones clasificadas ("Goggles").
CREATE TABLE IF NOT EXISTS block_summaries (
  hash          CHAR(64)     NOT NULL,
  height        INT UNSIGNED NOT NULL,
  transactions  LONGTEXT     NOT NULL,  -- JSON de BlockSummaryTransaction[]
  version       INT          NOT NULL DEFAULT 1,
  PRIMARY KEY (hash),
  KEY idx_height (height),
  KEY idx_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Asociación de precios de mercado a alturas de bloque.
CREATE TABLE IF NOT EXISTS blocks_prices (
  height    INT UNSIGNED NOT NULL,
  price_id  INT          NULL,
  PRIMARY KEY (height)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clústeres CPFP (Child-Pays-For-Parent) por bloque.
CREATE TABLE IF NOT EXISTS cpfp_clusters (
  hash      CHAR(64)     NOT NULL,
  height    INT UNSIGNED NOT NULL,
  clusters  LONGTEXT     NOT NULL,  -- JSON de los clústeres
  PRIMARY KEY (hash),
  KEY idx_height (height)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
