/*
 * Vercel Speed Insights initialization for NESGESFinanceTrust.
 * 
 * This module initializes Vercel Speed Insights to track Core Web Vitals
 * and performance metrics for the application.
 * 
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

'use strict';

/**
 * Initialize the Speed Insights queue
 */
function initSpeedInsightsQueue() {
  if (window.si) return;
  window.si = function a(...params) {
    (window.siq = window.siq || []).push(params);
  };
}

/**
 * Detect if running in development environment
 */
function isDevelopment() {
  try {
    // Check common development indicators
    if (location.hostname === 'localhost' || 
        location.hostname === '127.0.0.1' ||
        location.hostname.includes('.local')) {
      return true;
    }
  } catch (e) {
    // Ignore errors
  }
  return false;
}

/**
 * Get the appropriate script source URL
 */
function getScriptSrc(debug) {
  if (isDevelopment() || debug) {
    return 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js';
  }
  return '/_vercel/speed-insights/script.js';
}

/**
 * Inject Vercel Speed Insights tracking script
 * @param {Object} options - Configuration options
 * @param {boolean} options.debug - Enable debug mode (defaults to false in production)
 * @param {number} options.sampleRate - Percentage of events to send (0-1, defaults to 1)
 * @param {Function} options.beforeSend - Middleware to modify events before sending
 * @param {string} options.route - Current route for dynamic routing
 */
function injectSpeedInsights(options = {}) {
  // Only run in browser
  if (typeof window === 'undefined') return null;
  
  // Initialize the queue
  initSpeedInsightsQueue();
  
  // Get script source
  const src = getScriptSrc(options.debug);
  
  // Check if script already exists
  if (document.head.querySelector(`script[src*="${src}"]`)) {
    return null;
  }
  
  // Set beforeSend middleware if provided
  if (options.beforeSend && window.si) {
    window.si('beforeSend', options.beforeSend);
  }
  
  // Create and configure script element
  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  script.dataset.sdkn = '@vercel/speed-insights';
  script.dataset.sdkv = '1.3.1';
  
  if (options.sampleRate) {
    script.dataset.sampleRate = options.sampleRate.toString();
  }
  
  if (options.route) {
    script.dataset.route = options.route;
  }
  
  if (options.endpoint) {
    script.dataset.endpoint = options.endpoint;
  }
  
  // Disable debug in production if explicitly set to false
  if (!isDevelopment() && options.debug === false) {
    script.dataset.debug = 'false';
  }
  
  // Error handler
  script.onerror = () => {
    console.warn(
      `[Vercel Speed Insights] Failed to load script from ${src}. ` +
      'Please check if any content blockers are enabled and try again.'
    );
  };
  
  // Inject script into head
  document.head.appendChild(script);
  
  return {
    setRoute: (route) => {
      script.dataset.route = route ?? undefined;
    }
  };
}

// Export for use in app.js
window.NESGES = window.NESGES || {};
window.NESGES.injectSpeedInsights = injectSpeedInsights;
