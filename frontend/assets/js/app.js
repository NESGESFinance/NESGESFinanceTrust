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
function inyectarPie(idioma = getIdioma()) {
  const pie = document.getElementById('pie');
  if (!pie) {
    return;
  }
  const plataforma = I18N[idioma]?.footerPlatform || I18N.es.footerPlatform;
  pie.innerHTML = `
    <div><strong>${NESGES.EMPRESA}</strong> · ${plataforma} · ${NESGES.VERSION}</div>
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
  crearSelectorIdioma();
  traducirInterfaz(getIdioma());
  marcarNavActivo();
});

/** Traducciones de la interfaz pública. El idioma elegido se conserva entre páginas. */
const I18N = {
  es: {
    navHome: 'Inicio', navProjects: 'Explorar marco de evaluación de activos', navEcosystem: 'Ecosistema', navDashboard: 'Dashboard',
    navMempool: 'Mempool en Vivo', navExplorer: 'Explorador', navRwa: 'Tokenización RWA',
    navMarketplace: 'Marketplace', language: 'Idioma', switchLanguage: 'Cambiar idioma a inglés',
    footerPlatform: 'Plataforma nesgesfinancetrust.com',
    pageTitle: 'NESGESFinanceTrust — Ecosistema Financiero sobre Bitcoin',
    metaDescription: 'NESGESFinance Ecosystem — plataforma de exploración Bitcoin, tokenización de activos del mundo real (RWA), Runes y Ordinals.',
    heroTagline: 'Tokenización con Propósito · Bitcoin L1/L2 · RWA e impacto',
    heroDescription: 'Arquitectura institucional y tecnológica para conectar activos reales, trazabilidad y utilidad productiva sobre Bitcoin. El acceso, los derechos y la documentación se estructuran por cada proyecto y su serie.',
    learnEcosystem: 'Conocer el ecosistema', viewProjects: 'Ver proyectos', openDashboard: 'Abrir dashboard', exploreData: 'Explorar datos',
    disclaimer: 'NESGESFinanceTrust es una capa institucional/patrimonial propuesta y en proceso de formalización. La información es técnica e institucional; no constituye una oferta de inversión ni asesoramiento.',
    heroImageAlt: 'Ilustración de infraestructura Bitcoin, datos y registros',
    platformCapabilities: 'Capacidades de la plataforma', realTimeExploration: 'Exploración en Tiempo Real',
    realTimeExplorationDescription: 'Indexación de bloques desde Bitcoin Core / Esplora, seguimiento del mempool y difusión por WebSocket con latencia mínima.',
    runes: 'Runes · Utility Token', runesDescription: 'Decodificación de RuneStones (OP_RETURN + LEB128) del protocolo de Casey Rodarmor, activo desde el bloque 840 000.',
    ordinals: 'Ordinals e inscripciones', ordinalsDescription: 'Consulta de inscripciones ancladas en Bitcoin y de sus metadatos asociados dentro del registro técnico de la plataforma.',
    rwaRegistry: 'Registro RWA', rwaRegistryDescription: 'Flujo de registro para inmuebles, vehículos, arte, deuda y participaciones, con identificadores de inscripción y trazabilidad de eventos.',
    complianceControls: 'Controles de cumplimiento', complianceControlsDescription: 'Validaciones configurables de KYC, riesgo AML y clasificación de activos que requieren revisión jurídica y operativa independiente.',
    apiRealtime: 'API y tiempo real', apiRealtimeDescription: 'API REST y WebSocket para integrar consultas de red, activos indexados y eventos de la plataforma.',
    architecture: 'Arquitectura',
  },
  en: {
    navHome: 'Home', navProjects: 'Asset evaluation framework', navEcosystem: 'Ecosystem', navDashboard: 'Dashboard',
    navMempool: 'Live Mempool', navExplorer: 'Explorer', navRwa: 'RWA Tokenization',
    navMarketplace: 'Marketplace', language: 'Language', switchLanguage: 'Switch language to Spanish',
    footerPlatform: 'nesgesfinancetrust.com platform',
    pageTitle: 'NESGESFinanceTrust — Financial Ecosystem on Bitcoin',
    metaDescription: 'NESGESFinance Ecosystem — a platform for Bitcoin exploration, real-world asset (RWA) tokenization, Runes and Ordinals.',
    heroTagline: 'Purpose-Driven Tokenization · Bitcoin L1/L2 · RWA and impact',
    heroDescription: 'Institutional and technological architecture connecting real-world assets, traceability and productive utility on Bitcoin. Access, rights and documentation are structured for each project and its series.',
    learnEcosystem: 'Discover the ecosystem', viewProjects: 'View projects', openDashboard: 'Open dashboard', exploreData: 'Explore data',
    disclaimer: 'NESGESFinanceTrust is a proposed institutional/asset layer undergoing formalization. This technical and institutional information is not an investment offer or advice.',
    heroImageAlt: 'Illustration of Bitcoin infrastructure, data and records',
    platformCapabilities: 'Platform capabilities', realTimeExploration: 'Real-Time Exploration',
    realTimeExplorationDescription: 'Block indexing through Bitcoin Core / Esplora, mempool monitoring and WebSocket broadcasts with minimal latency.',
    runes: 'Runes · Utility Token', runesDescription: 'RuneStone decoding (OP_RETURN + LEB128) for Casey Rodarmor\'s protocol, active since block 840,000.',
    ordinals: 'Ordinals and inscriptions', ordinalsDescription: 'Look up Bitcoin-anchored inscriptions and their related metadata in the platform\'s technical registry.',
    rwaRegistry: 'RWA Registry', rwaRegistryDescription: 'Registration workflow for real estate, vehicles, art, debt and equity, with inscription identifiers and event traceability.',
    complianceControls: 'Compliance controls', complianceControlsDescription: 'Configurable KYC validations, AML risk checks and asset classification that require independent legal and operational review.',
    apiRealtime: 'API and real time', apiRealtimeDescription: 'REST API and WebSocket for integrating network queries, indexed assets and platform events.',
    architecture: 'Architecture',
  },
};

const NAVIGATION_TRANSLATIONS = {
  'index.html': 'navHome',
  'proyectos.html': 'navProjects',
  'verify.html': 'navProjects',
  'institucional.html': 'navEcosystem',
  'dashboard-unificado.html': 'navDashboard',
  'dashboard1.html': 'navMempool',
  'explorer.html': 'navExplorer',
  'dashboard2.html': 'navRwa',
  'rwa-marketplace.html': 'navMarketplace',
};

function getIdioma() {
  try {
    return localStorage.getItem('nesges-language') === 'en' ? 'en' : 'es';
  } catch (_) {
    return 'es';
  }
}

function traducirInterfaz(idioma) {
  const mensajes = I18N[idioma];
  document.documentElement.lang = idioma;
  document.querySelectorAll('[data-i18n]').forEach((elemento) => {
    const texto = mensajes[elemento.dataset.i18n];
    if (texto) elemento.textContent = texto;
  });
  document.querySelectorAll('[data-i18n-alt]').forEach((elemento) => {
    const texto = mensajes[elemento.dataset.i18nAlt];
    if (texto) elemento.alt = texto;
  });
  document.querySelectorAll('[data-i18n-content]').forEach((elemento) => {
    const texto = mensajes[elemento.dataset.i18nContent];
    if (texto) elemento.content = texto;
  });
  document.querySelectorAll('.nav-enlaces a').forEach((enlace) => {
    const clave = NAVIGATION_TRANSLATIONS[enlace.getAttribute('href')];
    if (clave && mensajes[clave]) enlace.textContent = mensajes[clave];
  });
  const selector = document.querySelector('.selector-idioma');
  if (selector) {
    selector.setAttribute('aria-label', mensajes.language);
    selector.setAttribute('title', mensajes.switchLanguage);
    selector.textContent = idioma === 'es' ? 'EN' : 'ES';
  }
  inyectarPie(idioma);
}

function crearSelectorIdioma() {
  const nav = document.querySelector('.nav-principal');
  if (!nav || nav.querySelector('.selector-idioma')) return;
  const selector = document.createElement('button');
  selector.type = 'button';
  selector.className = 'selector-idioma';
  selector.addEventListener('click', () => {
    const idioma = getIdioma() === 'es' ? 'en' : 'es';
    try { localStorage.setItem('nesges-language', idioma); } catch (_) { /* Storage unavailable. */ }
    traducirInterfaz(idioma);
  });
  nav.appendChild(selector);
}
