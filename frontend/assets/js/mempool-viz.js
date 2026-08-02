/*
 * Visualización del mempool: histograma de comisiones y métricas en vivo.
 *
 * Consume el endpoint REST `/api/mempool` y el canal WebSocket `mempool` para
 * renderizar un gráfico de barras de la distribución de comisiones (sat/vB).
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

'use strict';

const MempoolViz = {
  /** Renderiza el histograma de comisiones en el contenedor indicado. */
  renderHistograma(contenedor, feeHistogram) {
    if (!contenedor) {
      return;
    }
    if (!feeHistogram || !feeHistogram.length) {
      contenedor.innerHTML = '<div class="vacio">Sin datos de comisiones disponibles.</div>';
      return;
    }
    const maxVsize = Math.max(...feeHistogram.map((h) => h[1]));
    const barras = feeHistogram
      .slice(0, 60)
      .map((h) => {
        const [feeRate, vsize] = h;
        const altura = maxVsize > 0 ? Math.max(4, (vsize / maxVsize) * 100) : 4;
        const info = `${feeRate.toFixed(1)} sat/vB · ${fmt.bytes(vsize)}`;
        return `<div class="fee-barra" style="height:${altura}%" data-info="${info}"></div>`;
      })
      .join('');
    contenedor.innerHTML = `<div class="fee-barras">${barras}</div>
      <div class="fee-leyenda"><span>menor comisión</span><span>mayor comisión</span></div>`;
  },

  /** Actualiza las métricas numéricas (recuento, vsize, comisión total). */
  renderMetricas(stats) {
    this._set('mp-count', fmt.numero(stats.count));
    this._set('mp-vsize', fmt.bytes(stats.vsize));
    this._set('mp-fees', `${fmt.numero(Math.round(stats.totalFee / 1e8 * 1000) / 1000)} BTC`);
  },

  /** Actualiza las estimaciones de comisión por objetivo. */
  renderFees(fees) {
    this._set('fee-fastest', `${Math.ceil(fees.fastest)} sat/vB`);
    this._set('fee-halfhour', `${Math.ceil(fees.halfHour)} sat/vB`);
    this._set('fee-hour', `${Math.ceil(fees.hour)} sat/vB`);
    this._set('fee-economy', `${Math.ceil(fees.economy)} sat/vB`);
  },

  _set(id, valor) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = valor;
    }
  },

  /** Carga inicial de datos vía REST. */
  async cargar(contenedorHistograma) {
    try {
      const [stats, fees] = await Promise.all([api.get('/mempool'), api.get('/mempool/fees')]);
      this.renderMetricas(stats);
      this.renderFees(fees);
      this.renderHistograma(contenedorHistograma, stats.feeHistogram);
    } catch (e) {
      if (contenedorHistograma) {
        contenedorHistograma.innerHTML = `<div class="vacio">No se pudo conectar con el backend (${e.message}).</div>`;
      }
    }
  },
};
