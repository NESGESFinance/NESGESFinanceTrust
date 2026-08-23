/**
 * API REST del protocolo Runes.
 *
 * Expone los endpoints de consulta de tokens fungibles (Utility Token) de la
 * plataforma NESGESFinance:
 *   GET  /api/runes                  → listado paginado de Runes
 *   GET  /api/runes/:name            → detalle de un Rune por nombre
 *   GET  /api/runes/id/:block/:tx    → detalle de un Rune por identificador
 *   GET  /api/runes/:name/holders    → mayores tenedores de un Rune
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { Router, Request, Response } from 'express';
import logger from '../../logger';
import runesRepository, { RunesRepository } from '../../repositories/RunesRepository';
import { RuneHolder, RuneToken } from '../../interfaces/runes.interfaces';

/** Serializa un RuneToken a JSON (convierte los `bigint` a cadena). */
function serializeToken(token: RuneToken): Record<string, unknown> {
  return {
    ...token,
    premine: token.premine.toString(),
    totalSupply: token.totalSupply.toString(),
    circulatingSupply: token.circulatingSupply.toString(),
  };
}

/** Serializa un tenedor a JSON. */
function serializeHolder(holder: RuneHolder): Record<string, unknown> {
  return { address: holder.address, amount: holder.amount.toString(), runeId: holder.runeId };
}

export class RunesAPI {
  public readonly router: Router;

  constructor(private readonly repository: RunesRepository = runesRepository) {
    this.router = Router();
    this.registerRoutes();
  }

  /** Registra las rutas del módulo Runes. */
  private registerRoutes(): void {
    this.router.get('/', this.listRunes.bind(this));
    this.router.get('/id/:block/:tx', this.getRuneById.bind(this));
    this.router.get('/:name/holders', this.getRuneHolders.bind(this));
    this.router.get('/:name', this.getRuneByName.bind(this));
  }

  /** GET /api/runes — listado paginado. */
  private async listRunes(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const offset = Number(req.query.offset ?? 0);
      const runes = await this.repository.$listRunes(limit, offset);
      res.json(runes.map(serializeToken));
    } catch (e) {
      this.fail(res, e, 'Error al listar los Runes.');
    }
  }

  /** GET /api/runes/:name — detalle por nombre. */
  private async getRuneByName(req: Request, res: Response): Promise<void> {
    try {
      const name = req.params.name.toUpperCase().replace(/•/g, '');
      const rune = await this.repository.$getRuneByName(name);
      if (!rune) {
        res.status(404).json({ error: 'Rune no encontrado.' });
        return;
      }
      res.json(serializeToken(rune));
    } catch (e) {
      this.fail(res, e, 'Error al obtener el Rune.');
    }
  }

  /** GET /api/runes/id/:block/:tx — detalle por identificador. */
  private async getRuneById(req: Request, res: Response): Promise<void> {
    try {
      const rune = await this.repository.$getRuneById({
        block: Number(req.params.block),
        tx: Number(req.params.tx),
      });
      if (!rune) {
        res.status(404).json({ error: 'Rune no encontrado.' });
        return;
      }
      res.json(serializeToken(rune));
    } catch (e) {
      this.fail(res, e, 'Error al obtener el Rune por identificador.');
    }
  }

  /** GET /api/runes/:name/holders — mayores tenedores. */
  private async getRuneHolders(req: Request, res: Response): Promise<void> {
    try {
      const name = req.params.name.toUpperCase().replace(/•/g, '');
      const rune = await this.repository.$getRuneByName(name);
      if (!rune) {
        res.status(404).json({ error: 'Rune no encontrado.' });
        return;
      }
      const limit = Math.min(Number(req.query.limit ?? 100), 500);
      const holders = await this.repository.$getRuneHolders(rune.runeId, limit);
      res.json(holders.map(serializeHolder));
    } catch (e) {
      this.fail(res, e, 'Error al obtener los tenedores del Rune.');
    }
  }

  /** Manejo uniforme de errores. */
  private fail(res: Response, error: unknown, message: string): void {
    logger.err(`${message} ${error instanceof Error ? error.message : String(error)}`, logger.tags.runes);
    res.status(500).json({ error: message });
  }
}

export default new RunesAPI();
