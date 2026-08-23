/**
 * Punto de entrada del backend de NESGESFinanceTrust.
 *
 * Arranca el servidor HTTP (Express) y el servidor WebSocket, conecta la base
 * de datos, monta las rutas de la API (bloques, mempool, Runes, Ordinals, RWA)
 * y ensambla el indexador de bloques mediante inyección de dependencias.
 *
 *   Plataforma : nesgesfinancetrust.com
 *   Versión    : v3.4-dev (Agosto 2026)
 *   Lema       : "Y a tu prójimo como a tí mismo"
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import http from 'http';
import express, { Application, Request, Response } from 'express';
import config from './config';
import logger from './logger';
import database from './database';
import websocketHandler from './api/websocket-handler';
import mempool from './api/mempool';
import runesApi from './api/runes/runes-api';
import ordinalsApi from './api/ordinals/ordinals-api';
import rwaApi from './api/rwa/rwa-api';
import blocksRepository from './repositories/BlocksRepository';
import { Blocks } from './api/blocks';
import { buildBlocksDependencies } from './indexer-dependencies';

/** Configura los middlewares globales de Express. */
function configureMiddlewares(app: Application): void {
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS abierto para el frontend estático (ajustable en producción).
  app.use((_req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });
}

/** Monta las rutas de la API bajo el prefijo configurado. */
function configureRoutes(app: Application): void {
  const prefix = config.APP.API_PREFIX;

  // Salud del servicio e identidad de la plataforma.
  app.get(`${prefix}/health`, async (_req: Request, res: Response) => {
    const databaseHealth = await database.getHealth();
    const overallStatus = databaseHealth.enabled && databaseHealth.status !== 'connected' ? 'degraded' : 'ok';
    res.status(overallStatus === 'ok' ? 200 : 503).json({
      status: overallStatus,
      plataforma: 'nesgesfinancetrust.com',
      version: config.APP.VERSION,
      lema: 'Y a tu prójimo como a tí mismo',
      empresa: 'NESGESFinance Ecosystem S.A.S. BIC. & LLC.',
      ein: '0008086872',
      services: {
        database: databaseHealth,
        redis: {
          enabled: config.REDIS.ENABLED,
          status: config.REDIS.ENABLED ? 'configured' : 'disabled',
          message: config.REDIS.ENABLED
            ? `Redis configurado en ${config.REDIS.HOST}:${config.REDIS.PORT}.`
            : 'Redis deshabilitado por configuración.',
        },
        mempool: {
          backend: config.MEMPOOL.BACKEND,
          audit: config.MEMPOOL.AUDIT,
          message: `Fuente de datos on-chain: ${config.MEMPOOL.BACKEND}.`,
        },
        rwa: {
          status: 'audit_only',
          message: 'Las operaciones de escritura del registro RWA permanecen bloqueadas durante la auditoría.',
        },
      },
    });
  });

  // Bloques (consulta directa al repositorio).
  app.get(`${prefix}/blocks/recent`, async (req: Request, res: Response) => {
    try {
      const requested = Number(req.query.limit ?? 10);
      const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 50) : 10;
      const blocks = await blocksRepository.$getRecentBlocks(limit);
      res.json(blocks);
    } catch (e) {
      logger.err(`Error al obtener bloques recientes: ${e instanceof Error ? e.message : String(e)}`);
      res.status(500).json({ error: 'Error interno.' });
    }
  });

  app.get(`${prefix}/blocks/:height`, async (req: Request, res: Response) => {
    try {
      const block = await blocksRepository.$getBlockByHeight(Number(req.params.height));
      if (!block) {
        res.status(404).json({ error: 'Bloque no encontrado.' });
        return;
      }
      res.json(block);
    } catch (e) {
      logger.err(`Error al obtener el bloque: ${e instanceof Error ? e.message : String(e)}`);
      res.status(500).json({ error: 'Error interno.' });
    }
  });

  // Módulos de tokenización y mempool.
  app.use(`${prefix}/mempool`, mempool.router);
  app.use(`${prefix}/runes`, runesApi.router);
  app.use(`${prefix}/ordinals`, ordinalsApi.router);
  app.use(`${prefix}/rwa`, rwaApi.router);
}

/** Ensambla el indexador de bloques mediante inyección de dependencias. */
function buildIndexer(): Blocks {
  const blocks = new Blocks(buildBlocksDependencies());
  // Difunde cada bloque nuevo por WebSocket al canal 'blocks'.
  blocks.setNewBlockCallback((block) => {
    websocketHandler.broadcast('blocks', { height: block.height, id: block.id });
  });
  return blocks;
}

/** Arranca la aplicación completa. */
async function bootstrap(): Promise<void> {
  logger.notice(`Iniciando NESGESFinanceTrust backend v${config.APP.VERSION} (${config.APP.ENV}).`);

  // Conexión a la base de datos (no bloqueante si falla en desarrollo).
  try {
    await database.connect();
  } catch (e) {
    logger.err(`No se pudo conectar a la base de datos: ${e instanceof Error ? e.message : String(e)}`);
  }

  const app = express();
  configureMiddlewares(app);
  configureRoutes(app);

  const server = http.createServer(app);
  websocketHandler.init(server, '/ws');

  // Ensamblado del indexador (queda listo para su ejecución programada).
  const indexer = buildIndexer();
  logger.notice(`Indexador de bloques ensamblado (altura inicial: ${indexer.getCurrentBlockHeight()}).`, logger.tags.mining);

  // Refresco periódico del mempool.
  mempool.startPolling(30000);

  server.listen(config.APP.HTTP_PORT, config.APP.HTTP_HOST, () => {
    logger.notice(`Servidor HTTP escuchando en http://${config.APP.HTTP_HOST}:${config.APP.HTTP_PORT}${config.APP.API_PREFIX}`);
  });

  // Apagado ordenado.
  const shutdown = async (signal: string): Promise<void> => {
    logger.notice(`Señal ${signal} recibida. Cerrando servicios...`);
    mempool.stopPolling();
    websocketHandler.close();
    server.close();
    await database.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((e) => {
  logger.err(`Fallo fatal en el arranque: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
