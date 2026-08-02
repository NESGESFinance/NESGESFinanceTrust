/*
 * Cliente WebSocket en tiempo real de NESGESFinanceTrust.
 *
 * Gestiona la conexión, la reconexión automática con backoff exponencial, la
 * suscripción a canales y el enrutado de eventos a manejadores registrados.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

'use strict';

class NesgesWebSocket {
  /**
   * @param {string} url URL del endpoint WebSocket.
   * @param {string[]} canales Canales a los que suscribirse al conectar.
   */
  constructor(url, canales = []) {
    this.url = url;
    this.canales = canales;
    this.socket = null;
    this.manejadores = new Map();
    this.reintentos = 0;
    this.maxDelay = 15000;
    this.cerradoManualmente = false;
  }

  /** Registra un manejador para un canal (`blocks`, `mempool`, `runes`...). */
  on(canal, callback) {
    this.manejadores.set(canal, callback);
    return this;
  }

  /** Registra un callback para cambios de estado de la conexión. */
  onEstado(callback) {
    this.estadoCallback = callback;
    return this;
  }

  /** Inicia la conexión. */
  conectar() {
    this.cerradoManualmente = false;
    this.socket = new WebSocket(this.url);

    this.socket.addEventListener('open', () => {
      this.reintentos = 0;
      this._estado('conectado');
      if (this.canales.length) {
        this.socket.send(JSON.stringify({ action: 'subscribe', channels: this.canales }));
      }
    });

    this.socket.addEventListener('message', (evento) => {
      let mensaje;
      try {
        mensaje = JSON.parse(evento.data);
      } catch (e) {
        return;
      }
      const canal = mensaje.channel;
      if (canal && this.manejadores.has(canal)) {
        this.manejadores.get(canal)(mensaje.payload, mensaje);
      }
    });

    this.socket.addEventListener('close', () => {
      this._estado('desconectado');
      if (!this.cerradoManualmente) {
        this._reconectar();
      }
    });

    this.socket.addEventListener('error', () => {
      this._estado('desconectado');
    });
  }

  /** Programa una reconexión con backoff exponencial. */
  _reconectar() {
    const delay = Math.min(1000 * 2 ** this.reintentos, this.maxDelay);
    this.reintentos++;
    setTimeout(() => this.conectar(), delay);
  }

  /** Notifica un cambio de estado. */
  _estado(estado) {
    if (this.estadoCallback) {
      this.estadoCallback(estado);
    }
  }

  /** Cierra la conexión de forma definitiva. */
  cerrar() {
    this.cerradoManualmente = true;
    if (this.socket) {
      this.socket.close();
    }
  }
}

/** Actualiza el indicador visual de estado de conexión. */
function actualizarIndicadorEstado(estado) {
  const el = document.getElementById('estado-conexion');
  if (!el) {
    return;
  }
  el.classList.remove('conectado', 'desconectado');
  el.classList.add(estado);
  const texto = el.querySelector('.texto');
  if (texto) {
    texto.textContent = estado === 'conectado' ? 'En vivo' : 'Reconectando…';
  }
}
