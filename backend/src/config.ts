/**
 * Configuración central de la plataforma NESGESFinanceTrust.
 *
 * Lee las variables de entorno (ver `.env.example`) y expone un objeto de
 * configuración fuertemente tipado y de solo lectura para todo el backend.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import * as dotenv from 'dotenv';

dotenv.config();

/** Lee una variable de entorno de tipo cadena con valor por defecto. */
function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

/** Lee una variable de entorno numérica con valor por defecto. */
function envNumber(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/** Lee una variable de entorno booleana (`true`/`false`) con valor por defecto. */
function envBool(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/** Estructura de configuración global de la aplicación. */
export interface IConfig {
  APP: {
    NAME: string;
    VERSION: string;
    ENV: string;
    HTTP_HOST: string;
    HTTP_PORT: number;
    API_PREFIX: string;
  };
  MEMPOOL: {
    NETWORK: string;
    BACKEND: 'core' | 'esplora';
    INDEXING_BLOCKS_AMOUNT: number;
    INITIAL_BLOCKS_AMOUNT: number;
    BLOCKS_SUMMARIES_INDEXING: boolean;
    CPFP_INDEXING: boolean;
    AUDIT: boolean;
    /** BLK-005 — timestamp del primer bloque con coinbase BIP-54 (configurable). */
    BIP54_ACTIVATION_TIMESTAMP: number;
    /** BLK-011 — timeout del bucle principal en milisegundos (configurable). */
    MAIN_LOOP_TIMEOUT: number;
    /** BLK-012 — offset de bloques del quarter epoch block time (configurable). */
    QUARTER_EPOCH_BLOCK_OFFSET: number;
    /** BLK-015 — tamaño de lote de indexación histórica (configurable). */
    BLOCK_DB_CHUNK_SIZE: number;
    /** BLK-010 — rango máximo permitido entre alturas de bloque (configurable). */
    MAX_BLOCKS_BETWEEN_HEIGHT: number;
  };
  CORE_RPC: {
    HOST: string;
    PORT: number;
    USERNAME: string;
    PASSWORD: string;
    TIMEOUT: number;
    DEBUG_LOG_PATH: string;
  };
  ESPLORA: {
    REST_API_URL: string;
    UNIX_SOCKET_PATH: string;
  };
  DATABASE: {
    ENABLED: boolean;
    HOST: string;
    PORT: number;
    NAME: string;
    USERNAME: string;
    PASSWORD: string;
    POOL_SIZE: number;
  };
  REDIS: {
    ENABLED: boolean;
    HOST: string;
    PORT: number;
    PASSWORD: string;
  };
  TOKENIZATION: {
    RUNES_ACTIVATION_HEIGHT: number;
    RUNES_INDEXING_ENABLED: boolean;
    ORDINALS_INDEXING_ENABLED: boolean;
    RWA_REGISTRY_ENABLED: boolean;
  };
  COMPLIANCE: {
    KYC_REQUIRED: boolean;
    AML_PROVIDER: string;
    MICA_JURISDICTION: string;
  };
}

const config: IConfig = {
  APP: {
    NAME: env('APP_NAME', 'NESGESFinanceTrust'),
    VERSION: env('APP_VERSION', '3.4.0-dev'),
    ENV: env('NODE_ENV', 'development'),
    HTTP_HOST: env('HTTP_HOST', '0.0.0.0'),
    HTTP_PORT: envNumber('HTTP_PORT', 3000),
    API_PREFIX: env('API_PREFIX', '/api'),
  },
  MEMPOOL: {
    NETWORK: env('MEMPOOL_NETWORK', 'mainnet'),
    BACKEND: env('MEMPOOL_BACKEND', 'esplora') as 'core' | 'esplora',
    INDEXING_BLOCKS_AMOUNT: envNumber('INDEXING_BLOCKS_AMOUNT', -1),
    INITIAL_BLOCKS_AMOUNT: envNumber('INITIAL_BLOCKS_AMOUNT', 8),
    BLOCKS_SUMMARIES_INDEXING: envBool('BLOCKS_SUMMARIES_INDEXING', true),
    CPFP_INDEXING: envBool('CPFP_INDEXING', true),
    AUDIT: envBool('AUDIT', true),
    BIP54_ACTIVATION_TIMESTAMP: envNumber('BIP54_ACTIVATION_TIMESTAMP', 1771507776),
    MAIN_LOOP_TIMEOUT: envNumber('MAIN_LOOP_TIMEOUT', 120000),
    QUARTER_EPOCH_BLOCK_OFFSET: envNumber('QUARTER_EPOCH_BLOCK_OFFSET', 503),
    BLOCK_DB_CHUNK_SIZE: envNumber('BLOCK_DB_CHUNK_SIZE', 10000),
    MAX_BLOCKS_BETWEEN_HEIGHT: envNumber('MAX_BLOCKS_BETWEEN_HEIGHT', 10000),
  },
  CORE_RPC: {
    HOST: env('CORE_RPC_HOST', '127.0.0.1'),
    PORT: envNumber('CORE_RPC_PORT', 8332),
    USERNAME: env('CORE_RPC_USERNAME', 'nesges_rpc'),
    PASSWORD: env('CORE_RPC_PASSWORD', ''),
    TIMEOUT: envNumber('CORE_RPC_TIMEOUT', 60000),
    DEBUG_LOG_PATH: env('CORE_RPC_DEBUG_LOG_PATH', ''),
  },
  ESPLORA: {
    REST_API_URL: env('ESPLORA_REST_API_URL', 'https://blockstream.info/api'),
    UNIX_SOCKET_PATH: env('ESPLORA_UNIX_SOCKET_PATH', ''),
  },
  DATABASE: {
    ENABLED: envBool('DATABASE_ENABLED', true),
    HOST: env('DATABASE_HOST', '127.0.0.1'),
    PORT: envNumber('DATABASE_PORT', 3306),
    NAME: env('DATABASE_NAME', 'nesgesfinance'),
    USERNAME: env('DATABASE_USERNAME', 'nesges'),
    PASSWORD: env('DATABASE_PASSWORD', ''),
    POOL_SIZE: envNumber('DATABASE_POOL_SIZE', 10),
  },
  REDIS: {
    ENABLED: envBool('REDIS_ENABLED', true),
    HOST: env('REDIS_HOST', '127.0.0.1'),
    PORT: envNumber('REDIS_PORT', 6379),
    PASSWORD: env('REDIS_PASSWORD', ''),
  },
  TOKENIZATION: {
    RUNES_ACTIVATION_HEIGHT: envNumber('RUNES_ACTIVATION_HEIGHT', 840000),
    RUNES_INDEXING_ENABLED: envBool('RUNES_INDEXING_ENABLED', true),
    ORDINALS_INDEXING_ENABLED: envBool('ORDINALS_INDEXING_ENABLED', true),
    RWA_REGISTRY_ENABLED: envBool('RWA_REGISTRY_ENABLED', true),
  },
  COMPLIANCE: {
    KYC_REQUIRED: envBool('COMPLIANCE_KYC_REQUIRED', true),
    AML_PROVIDER: env('COMPLIANCE_AML_PROVIDER', 'interno'),
    MICA_JURISDICTION: env('COMPLIANCE_MICA_JURISDICTION', 'EU'),
  },
};

export default config;
