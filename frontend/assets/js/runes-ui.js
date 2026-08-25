/*
 * Interfaz de usuario del explorador de Runes (Utility Token).
 *
 * Consume `/api/runes` y renderiza tarjetas de token. Sin dependencias externas.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

'use strict';

const RunesUI = {
  /** Renderiza una tarjeta de token Rune. */
  tarjeta(rune) {
    const id = `${rune.runeId.block}:${rune.runeId.tx}`;
    return `
      <div class="rune-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="nombre">${rune.name}</span>
          <span class="simbolo">${rune.symbol || '¤'}</span>
        </div>
        <span class="badge badge-runes">RUNE · ${id}</span>
        <div class="metricas">
          <span>Suministro</span><span>${fmt.numero(rune.circulatingSupply)}</span>
          <span>Divisibilidad</span><span>${rune.divisibility}</span>
          <span>Acuñaciones</span><span>${fmt.numero(rune.mints)}</span>
          <span>Tenedores</span><span>${fmt.numero(rune.holders)}</span>
          <span>Grabado</span><span>#${fmt.numero(rune.etchedAtHeight)}</span>
        </div>
      </div>`;
  },

  /** Carga y renderiza el listado de Runes. */
  async cargar(contenedor) {
    if (!contenedor) {
      return;
    }
    contenedor.innerHTML = '<div class="cargando">Cargando Runes…</div>';
    try {
      const runes = await api.get('/runes?limit=24');
      if (!runes.length) {
        contenedor.innerHTML = '<div class="vacio">Aún no se han indexado Runes.</div>';
        return;
      }
      contenedor.innerHTML = runes.map((r) => this.tarjeta(r)).join('');
    } catch (e) {
      contenedor.innerHTML = `<div class="vacio">No se pudo cargar el listado de Runes (${e.message}).</div>`;
    }
  },
};
