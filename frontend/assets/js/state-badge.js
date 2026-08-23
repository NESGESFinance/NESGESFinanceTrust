/**
 * State Badge Component — NESGESFinanceTrust
 * Componente reutilizable para visualizar badges de estados RWA
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 */

/**
 * Configuración de estados y sus estilos
 */
const STATE_CONFIG = {
  PENDIENTE: {
    label: 'PENDIENTE',
    color: '#F7931A',
    bgColor: 'rgba(247, 147, 26, 0.2)',
    description: 'Registro iniciado, esperando documentación',
    icon: '⏳',
    severity: 'info'
  },
  EN_REVISIÓN: {
    label: 'EN_REVISIÓN',
    color: '#A9C6FF',
    bgColor: 'rgba(169, 198, 255, 0.2)',
    description: 'Evaluación en curso por equipo de compliance',
    icon: '🔍',
    severity: 'pending'
  },
  INFORMACIÓN_REQUERIDA: {
    label: 'INFORMACIÓN_REQUERIDA',
    color: '#A9C6FF',
    bgColor: 'rgba(169, 198, 255, 0.2)',
    description: 'Se requieren documentos adicionales',
    icon: '⚠️',
    severity: 'warning'
  },
  ACTIVO: {
    label: 'ACTIVO',
    color: '#2EAF6D',
    bgColor: 'rgba(46, 175, 109, 0.2)',
    description: 'Expediente validado y aprobado',
    icon: '✅',
    severity: 'success'
  },
  TOKENIZADO: {
    label: 'TOKENIZADO',
    color: '#A9C6FF',
    bgColor: 'rgba(169, 198, 255, 0.2)',
    description: 'Activo tokenizado y en circulación',
    icon: '🔗',
    severity: 'active'
  },
  TRANSFERIDO: {
    label: 'TRANSFERIDO',
    color: '#A9C6FF',
    bgColor: 'rgba(169, 198, 255, 0.2)',
    description: 'Propiedad transferida a nuevo titular',
    icon: '↔️',
    severity: 'success'
  },
  RECHAZADO: {
    label: 'RECHAZADO',
    color: '#ff4d4d',
    bgColor: 'rgba(255, 77, 77, 0.2)',
    description: 'No cumple criterios de validación',
    icon: '❌',
    severity: 'error'
  },
  CANCELADO: {
    label: 'CANCELADO',
    color: '#ff4d4d',
    bgColor: 'rgba(255, 77, 77, 0.2)',
    description: 'Expediente cancelado por usuario o timeout',
    icon: '🚫',
    severity: 'error'
  }
};

/**
 * Crea un badge de estado
 * @param {string} state - Estado (ej: 'ACTIVO', 'EN_REVISIÓN')
 * @param {object} options - Opciones: size, className, showIcon, showDescription
 * @returns {HTMLElement}
 */
function createStateBadge(state, options = {}) {
  const {
    size = 'medium',
    className = '',
    showIcon = true,
    showDescription = false
  } = options;

  const config = STATE_CONFIG[state];
  if (!config) {
    console.warn(`Estado desconocido: ${state}`);
    return null;
  }

  const badge = document.createElement('span');
  badge.className = `state-badge badge-${state.toLowerCase()} ${className}`;
  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 700;
    background: ${config.bgColor};
    color: ${config.color};
    border: 1px solid ${config.color};
    font-family: 'Courier New', monospace;
  `;

  if (showIcon) {
    const icon = document.createElement('span');
    icon.textContent = config.icon;
    badge.appendChild(icon);
  }

  const label = document.createElement('span');
  label.textContent = config.label;
  badge.appendChild(label);

  if (showDescription) {
    badge.title = config.description;
  }

  return badge;
}

/**
 * Crea un indicador de estado con información detallada
 * @param {string} state - Estado
 * @param {object} info - Información adicional (timestamp, transitionTime, etc)
 * @returns {HTMLElement}
 */
function createStateIndicator(state, info = {}) {
  const config = STATE_CONFIG[state];
  if (!config) return null;

  const container = document.createElement('div');
  container.style.cssText = `
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    padding: 1rem;
    background: var(--c-sup);
    border-left: 4px solid ${config.color};
    border-radius: 8px;
  `;

  // Estado badge
  const badgeContainer = document.createElement('div');
  badgeContainer.style.cssText = `
    display: flex;
    align-items: center;
    font-size: 2rem;
  `;
  badgeContainer.textContent = config.icon;
  container.appendChild(badgeContainer);

  // Información
  const infoContainer = document.createElement('div');
  infoContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  `;

  const stateLabel = document.createElement('div');
  stateLabel.style.cssText = `
    color: ${config.color};
    font-weight: 700;
    font-size: 1rem;
    font-family: 'Courier New', monospace;
  `;
  stateLabel.textContent = config.label;
  infoContainer.appendChild(stateLabel);

  const stateDesc = document.createElement('div');
  stateDesc.style.cssText = `
    color: #999;
    font-size: 0.85rem;
  `;
  stateDesc.textContent = config.description;
  infoContainer.appendChild(stateDesc);

  if (info.timestamp) {
    const timeInfo = document.createElement('div');
    timeInfo.style.cssText = `
      color: #666;
      font-size: 0.75rem;
      font-family: 'Courier New', monospace;
    `;
    const date = new Date(info.timestamp);
    timeInfo.textContent = `📅 ${date.toLocaleString('es-ES')}`;
    infoContainer.appendChild(timeInfo);
  }

  if (info.transitionTime) {
    const transitionInfo = document.createElement('div');
    transitionInfo.style.cssText = `
      color: #F7931A;
      font-size: 0.75rem;
      font-weight: 600;
    `;
    transitionInfo.textContent = `⏱️ ${info.transitionTime}`;
    infoContainer.appendChild(transitionInfo);
  }

  container.appendChild(infoContainer);
  return container;
}

/**
 * Obtiene el próximo estado posible según reglas de máquina de estados
 * @param {string} currentState - Estado actual
 * @returns {array} Array de estados posibles
 */
function getNextStates(currentState) {
  const transitions = {
    PENDIENTE: ['EN_REVISIÓN', 'CANCELADO'],
    EN_REVISIÓN: ['INFORMACIÓN_REQUERIDA', 'ACTIVO', 'RECHAZADO'],
    INFORMACIÓN_REQUERIDA: ['EN_REVISIÓN', 'CANCELADO'],
    ACTIVO: ['TOKENIZADO'],
    TOKENIZADO: ['TRANSFERIDO'],
    TRANSFERIDO: [],
    RECHAZADO: [],
    CANCELADO: []
  };

  return transitions[currentState] || [];
}

/**
 * Valida si una transición de estado es permitida
 * @param {string} fromState - Estado origen
 * @param {string} toState - Estado destino
 * @returns {boolean}
 */
function isTransitionAllowed(fromState, toState) {
  const nextStates = getNextStates(fromState);
  return nextStates.includes(toState);
}

/**
 * Obtiene información sobre tiempos de transición
 * @param {string} fromState - Estado origen
 * @param {string} toState - Estado destino
 * @returns {object} Información de tiempos {min, max, unit, description}
 */
function getTransitionTiming(fromState, toState) {
  const timings = {
    'PENDIENTE_EN_REVISIÓN': { min: 0, max: 0, unit: 'min', description: 'Inmediato' },
    'EN_REVISIÓN_INFORMACIÓN_REQUERIDA': { min: 0, max: 30, unit: 'días', description: 'Evaluación manual (hasta 30 días)' },
    'EN_REVISIÓN_ACTIVO': { min: 1, max: 30, unit: 'días', description: 'Aprobación (1-30 días)' },
    'EN_REVISIÓN_RECHAZADO': { min: 1, max: 30, unit: 'días', description: 'Evaluación (1-30 días)' },
    'INFORMACIÓN_REQUERIDA_EN_REVISIÓN': { min: 0, max: 0, unit: 'min', description: 'Inmediato al reenvío' },
    'INFORMACIÓN_REQUERIDA_CANCELADO': { min: 14, max: 14, unit: 'días', description: 'Timeout automático (14 días)' },
    'ACTIVO_TOKENIZADO': { min: 2, max: 7, unit: 'días', description: 'Procesos backend (2-7 días)' },
    'TOKENIZADO_TRANSFERIDO': { min: 0, max: 0, unit: 'min', description: 'Inmediato (6+ confirmaciones)' },
    'PENDIENTE_CANCELADO': { min: 14, max: 14, unit: 'días', description: 'Timeout automático (14 días)' }
  };

  const key = `${fromState}_${toState}`;
  return timings[key] || { min: 0, max: 0, unit: 'min', description: 'Desconocido' };
}

/**
 * Renderiza una línea de tiempo de estados
 * @param {array} stateHistory - Array de {state, timestamp}
 * @param {HTMLElement} container - Elemento contenedor
 */
function renderStateTimeline(stateHistory, container) {
  if (!container) return;
  container.innerHTML = '';

  const timeline = document.createElement('div');
  timeline.style.cssText = `
    position: relative;
    padding: 2rem 0 2rem 3rem;
  `;

  stateHistory.forEach((entry, index) => {
    const config = STATE_CONFIG[entry.state];
    if (!config) {
      console.warn(`Estado desconocido en timeline: ${entry.state}`);
      return;
    }

    const item = document.createElement('div');
    item.style.cssText = `
      margin-bottom: 2rem;
      position: relative;
    `;

    // Dot
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: absolute;
      left: -2.5rem;
      top: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${config.color};
      border: 2px solid var(--c-sup);
    `;
    item.appendChild(dot);

    // Line
    if (index < stateHistory.length - 1) {
      const line = document.createElement('div');
      line.style.cssText = `
        position: absolute;
        left: -2.05rem;
        top: 12px;
        width: 2px;
        height: calc(100% + 2rem);
        background: ${config.color};
        opacity: 0.3;
      `;
      item.appendChild(line);
    }

    // Content
    const content = document.createElement('div');
    const badge = createStateBadge(entry.state, { showIcon: true });
    if (badge) content.appendChild(badge);

    if (entry.timestamp) {
      const timeEl = document.createElement('div');
      timeEl.style.cssText = `
        margin-top: 0.5rem;
        color: #999;
        font-size: 0.8rem;
      `;
      const date = new Date(entry.timestamp);
      timeEl.textContent = date.toLocaleString('es-ES');
      content.appendChild(timeEl);
    }

    item.appendChild(content);
    timeline.appendChild(item);
  });

  container.appendChild(timeline);
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STATE_CONFIG,
    createStateBadge,
    createStateIndicator,
    getNextStates,
    isTransitionAllowed,
    getTransitionTiming,
    renderStateTimeline
  };
}
