/**
 * Logger centralizado basado en Winston.
 *
 * Provee niveles semánticos (`err`, `warn`, `notice`, `info`, `debug`) y un
 * conjunto de etiquetas (`tags`) para categorizar los mensajes por subsistema.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

import * as winston from 'winston';
import config from './config';

/** Etiquetas de categoría para clasificar los registros por subsistema. */
const tags = {
  mining: 'mining',
  goggles: 'goggles',
  runes: 'runes',
  ordinals: 'ordinals',
  rwa: 'rwa',
  compliance: 'compliance',
  websocket: 'websocket',
} as const;

const winstonLogger = winston.createLogger({
  level: config.APP.ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

/**
 * Fachada del logger con niveles semánticos usados en todo el backend.
 * `notice` se mapea a `info` de Winston; `err` a `error`.
 */
const logger = {
  tags,
  err: (msg: string, tag?: string): void => {
    winstonLogger.error(tag ? `[${tag}] ${msg}` : msg);
  },
  warn: (msg: string, tag?: string): void => {
    winstonLogger.warn(tag ? `[${tag}] ${msg}` : msg);
  },
  notice: (msg: string, tag?: string): void => {
    winstonLogger.info(tag ? `[${tag}] ${msg}` : msg);
  },
  info: (msg: string, tag?: string): void => {
    winstonLogger.info(tag ? `[${tag}] ${msg}` : msg);
  },
  debug: (msg: string, tag?: string): void => {
    winstonLogger.debug(tag ? `[${tag}] ${msg}` : msg);
  },
};

export default logger;
