/**
 * Manejador de WebSocket para difusión en tiempo real.
 *
 * Gestiona las conexiones de los clientes del explorador y los dashboards, y
 * les difunde eventos en directo: nuevos bloques, actualizaciones del mempool,
 * grabados de Runes, inscripciones Ordinals y eventos de activos RWA.
 *
 * Los clientes se suscriben a "canales" mediante un mensaje `{ "action":
 * "subscribe", "channels": [...] }`.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

import { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import logger from '../logger';

/** Canales de suscripción disponibles. */
export type WsChannel = 'blocks' | 'mempool' | 'runes' | 'ordinals' | 'rwa';

/** Mensaje entrante de un cliente. */
interface ClientMessage {
  action: 'subscribe' | 'unsubscribe' | 'ping';
  channels?: WsChannel[];
}

/** Cliente con su conjunto de canales suscritos. */
interface Client {
  socket: WebSocket;
  channels: Set<WsChannel>;
}

export class WebsocketHandler {
  private wss: WebSocketServer | null = null;
  private readonly clients = new Set<Client>();

  /**
   * Inicializa el servidor WebSocket adjunto a un servidor HTTP existente.
   * @param server Servidor HTTP de Express.
   * @param path Ruta del endpoint WebSocket.
   */
  public init(server: HttpServer, path = '/ws'): void {
    this.wss = new WebSocketServer({ server, path });
    this.wss.on('connection', (socket: WebSocket) => this.onConnection(socket));
    logger.notice(`Servidor WebSocket escuchando en la ruta ${path}.`, logger.tags.websocket);
  }

  /** Maneja una nueva conexión de cliente. */
  private onConnection(socket: WebSocket): void {
    const client: Client = { socket, channels: new Set() };
    this.clients.add(client);
    logger.debug(`Cliente WebSocket conectado (total: ${this.clients.size}).`, logger.tags.websocket);

    socket.on('message', (raw: Buffer) => this.onMessage(client, raw));
    socket.on('close', () => {
      this.clients.delete(client);
      logger.debug(`Cliente WebSocket desconectado (total: ${this.clients.size}).`, logger.tags.websocket);
    });
    socket.on('error', (err: Error) => {
      logger.warn(`Error en socket de cliente: ${err.message}`, logger.tags.websocket);
    });

    // Mensaje de bienvenida con la identidad de la plataforma.
    this.sendTo(client, 'system', {
      message: 'Conectado a NESGESFinanceTrust en tiempo real.',
      version: '3.4.0-dev',
    });
  }

  /** Procesa un mensaje entrante de un cliente. */
  private onMessage(client: Client, raw: Buffer): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      this.sendTo(client, 'error', { message: 'Mensaje JSON inválido.' });
      return;
    }

    switch (msg.action) {
      case 'subscribe':
        for (const channel of msg.channels ?? []) {
          client.channels.add(channel);
        }
        this.sendTo(client, 'subscribed', { channels: Array.from(client.channels) });
        break;
      case 'unsubscribe':
        for (const channel of msg.channels ?? []) {
          client.channels.delete(channel);
        }
        this.sendTo(client, 'unsubscribed', { channels: Array.from(client.channels) });
        break;
      case 'ping':
        this.sendTo(client, 'pong', { timestamp: Date.now() });
        break;
      default:
        this.sendTo(client, 'error', { message: 'Acción desconocida.' });
    }
  }

  /**
   * Difunde un evento a todos los clientes suscritos a un canal.
   * @param channel Canal del evento.
   * @param payload Datos del evento.
   */
  public broadcast(channel: WsChannel, payload: unknown): void {
    const data = JSON.stringify({ channel, payload, timestamp: Date.now() });
    let delivered = 0;
    for (const client of this.clients) {
      if (client.channels.has(channel) && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
        delivered++;
      }
    }
    logger.debug(`Evento difundido en '${channel}' a ${delivered} cliente(s).`, logger.tags.websocket);
  }

  /** Envía un mensaje puntual a un cliente concreto. */
  private sendTo(client: Client, type: string, payload: unknown): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }

  /** Número de clientes conectados. */
  public get clientCount(): number {
    return this.clients.size;
  }

  /** Cierra el servidor WebSocket y todas las conexiones. */
  public close(): void {
    for (const client of this.clients) {
      client.socket.close();
    }
    this.clients.clear();
    this.wss?.close();
  }
}

export default new WebsocketHandler();
