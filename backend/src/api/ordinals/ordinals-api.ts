/**
 * API REST del protocolo Ordinals.
 *
 * Expone los endpoints de consulta de inscripciones (Security Tokens) de la
 * plataforma NESGESFinance:
 *   GET  /api/ordinals/inscriptions          → listado paginado
 *   GET  /api/ordinals/inscription/:id        → detalle de una inscripción
 *   GET  /api/ordinals/content/:id            → contenido binario en crudo
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { Router, Request, Response } from 'express';
import logger from '../../logger';
import ordinalsRepository, { OrdinalsRepository } from '../../repositories/OrdinalsRepository';
import { Inscription } from '../../interfaces/ordinals.interfaces';

/** Serializa una inscripción a JSON (convierte `bigint` a cadena). */
function serializeInscription(inscription: Inscription): Record<string, unknown> {
  return {
    ...inscription,
    satPoint: {
      txid: inscription.satPoint.txid,
      vout: inscription.satPoint.vout,
      offset: inscription.satPoint.offset.toString(),
    },
    sat: inscription.sat !== undefined ? inscription.sat.toString() : undefined,
  };
}

export class OrdinalsAPI {
  public readonly router: Router;

  constructor(private readonly repository: OrdinalsRepository = ordinalsRepository) {
    this.router = Router();
    this.registerRoutes();
  }

  /** Registra las rutas del módulo Ordinals. */
  private registerRoutes(): void {
    this.router.get('/inscriptions', this.listInscriptions.bind(this));
    this.router.get('/inscription/:id', this.getInscription.bind(this));
    this.router.get('/content/:id', this.getInscriptionContent.bind(this));
  }

  /** GET /api/ordinals/inscriptions — listado paginado. */
  private async listInscriptions(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const offset = Number(req.query.offset ?? 0);
      const inscriptions = await this.repository.$listInscriptions(limit, offset);
      res.json(inscriptions.map(serializeInscription));
    } catch (e) {
      this.fail(res, e, 'Error al listar las inscripciones.');
    }
  }

  /** GET /api/ordinals/inscription/:id — detalle. */
  private async getInscription(req: Request, res: Response): Promise<void> {
    try {
      const inscription = await this.repository.$getInscription(req.params.id);
      if (!inscription) {
        res.status(404).json({ error: 'Inscripción no encontrada.' });
        return;
      }
      res.json(serializeInscription(inscription));
    } catch (e) {
      this.fail(res, e, 'Error al obtener la inscripción.');
    }
  }

  /** GET /api/ordinals/content/:id — contenido binario en crudo. */
  private async getInscriptionContent(req: Request, res: Response): Promise<void> {
    try {
      const content = await this.repository.$getInscriptionContent(req.params.id);
      if (!content) {
        res.status(404).json({ error: 'Contenido no encontrado.' });
        return;
      }
      res.setHeader('Content-Type', content.contentType);
      res.send(content.body);
    } catch (e) {
      this.fail(res, e, 'Error al obtener el contenido de la inscripción.');
    }
  }

  /** Manejo uniforme de errores. */
  private fail(res: Response, error: unknown, message: string): void {
    logger.err(`${message} ${error instanceof Error ? error.message : String(error)}`, logger.tags.ordinals);
    res.status(500).json({ error: message });
  }
}

export default new OrdinalsAPI();
