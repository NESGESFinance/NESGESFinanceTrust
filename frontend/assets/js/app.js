/*
 * Lógica compartida del frontend de NESGESFinanceTrust.
 *
 * Provee la configuración global, un cliente ligero para la API REST y la
 * inyección del pie de página corporativo. Sin dependencias externas
 * (JavaScript "vanilla").
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

'use strict';

/** Configuración global de la aplicación. */
const NESGES = {
  /** Base de la API REST (se resuelve al mismo host por defecto). */
  API_BASE: (window.NESGES_API_BASE || '/api'),
  /** URL del WebSocket en tiempo real. */
  WS_URL: (window.NESGES_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`),
  VERSION: '3.4.0-dev',
  EMPRESA: 'NESGESFinance Ecosystem S.A.S. BIC. & LLC.',
  EIN: '0008086872',
  LEMA: 'Y a tu prójimo como a ti mismo',
  COPYRIGHT: '®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872 — TODOS LOS DERECHOS RESERVADOS 2025-2026',
};

/** Cliente REST minimalista basado en `fetch`. */
const api = {
  async get(path) {
    const res = await fetch(`${NESGES.API_BASE}${path}`);
    if (!res.ok) {
      throw new Error(`GET ${path} → HTTP ${res.status}`);
    }
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`${NESGES.API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  },
};

/** Utilidades de formato. */
const fmt = {
  /** Abrevia un hash o identificador largo (`abcd…wxyz`). */
  hash(value, head = 8, tail = 6) {
    if (!value || value.length <= head + tail) {
      return value || '';
    }
    return `${value.slice(0, head)}…${value.slice(-tail)}`;
  },
  /** Formatea un número con separador de miles (locale es-ES). */
  numero(n) {
    return Number(n).toLocaleString('es-ES');
  },
  /** Formatea un importe en USD. */
  usd(n) {
    return Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  },
  /** Convierte satoshis (o vbytes) a una escala legible. */
  bytes(n) {
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = Number(n);
    while (v >= 1024 && i < u.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
  },
  /** Formatea un timestamp UNIX (segundos) a fecha local. */
  fecha(ts) {
    if (!ts) {
      return '—';
    }
    return new Date(ts * 1000).toLocaleString('es-ES');
  },
};

/** Inyecta el pie de página corporativo en el elemento con id `pie`. */
function inyectarPie() {
  const pie = document.getElementById('pie');
  if (!pie) {
    return;
  }
  pie.innerHTML = `
    <div><strong>${NESGES.EMPRESA}</strong> · Plataforma nesgesfinancetrust.com · ${NESGES.VERSION}</div>
    <div class="lema" style="color:var(--color-verde);font-style:italic;">«${NESGES.LEMA}»</div>
    <div class="copyright">${NESGES.COPYRIGHT}</div>
  `;
}

/** Marca el enlace de navegación activo según la página actual. */
function marcarNavActivo() {
  const actual = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-enlaces a').forEach((a) => {
    if (a.getAttribute('href') === actual) {
      a.classList.add('activo');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  inyectarPie();
  marcarNavActivo();
});
