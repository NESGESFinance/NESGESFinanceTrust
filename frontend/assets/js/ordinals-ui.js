/*
 * Interfaz de usuario del explorador de Ordinals (Security Tokens).
 *
 * Consume `/api/ordinals/inscriptions` y renderiza las inscripciones, mostrando
 * una previsualización del contenido cuando el tipo MIME lo permite.
 *
 * Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
 * TODOS LOS DERECHOS RESERVADOS 2025-2026.
 */

'use strict';

const OrdinalsUI = {
  /** Devuelve el HTML de previsualización según el tipo de contenido. */
  previsualizacion(inscription) {
    const url = `${NESGES.API_BASE}/ordinals/content/${inscription.id}`;
    if (inscription.contentType.startsWith('image/')) {
      return `<img src="${url}" alt="Inscripción ${inscription.number}" style="max-width:100%;border-radius:6px;" loading="lazy">`;
    }
    if (inscription.contentType.startsWith('text/') || inscription.contentType.includes('json')) {
      return `<div class="mono" style="font-size:0.75rem;color:var(--color-verde);">${inscription.contentType}</div>`;
    }
    return `<div class="mono" style="color:var(--color-texto-tenue);">${inscription.contentType}</div>`;
  },

  /** Renderiza una tarjeta de inscripción. */
  tarjeta(inscription) {
    return `
      <div class="tarjeta">
        <span class="badge badge-ordinals">ORDINAL #${fmt.numero(inscription.number)}</span>
        <div style="margin:0.6rem 0;">${this.previsualizacion(inscription)}</div>
        <div class="descripcion">
          <div>ID: <span class="mono">${fmt.hash(inscription.id, 10, 4)}</span></div>
          <div>Bloque génesis: <span class="mono">#${fmt.numero(inscription.genesisHeight)}</span></div>
          <div>Tamaño: <span class="mono">${fmt.bytes(inscription.contentLength)}</span></div>
        </div>
      </div>`;
  },

  /** Carga y renderiza el listado de inscripciones. */
  async cargar(contenedor) {
    if (!contenedor) {
      return;
    }
    contenedor.innerHTML = '<div class="cargando">Cargando inscripciones…</div>';
    try {
      const inscripciones = await api.get('/ordinals/inscriptions?limit=24');
      if (!inscripciones.length) {
        contenedor.innerHTML = '<div class="vacio">Aún no se han indexado inscripciones.</div>';
        return;
      }
      contenedor.innerHTML = inscripciones.map((i) => this.tarjeta(i)).join('');
    } catch (e) {
      contenedor.innerHTML = `<div class="vacio">No se pudo cargar el listado de Ordinals (${e.message}).</div>`;
    }
  },
};
