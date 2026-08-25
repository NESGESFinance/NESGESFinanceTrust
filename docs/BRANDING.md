# Branding NESGESFinanceTrust

Esta guía centraliza las especificaciones técnicas y de uso de los logotipos oficiales incorporados al repositorio.

## Assets oficiales

| Asset | Archivo | Formato | Dimensiones base | Uso recomendado |
| --- | --- | --- | --- | --- |
| NESGESFinance Ecosystem | `frontend/assets/img/NESGESFinance_Logo.jpg` | JPG | 740 × 740 px | Cabeceras institucionales, piezas corporativas, README y documentación de ecosistema. |
| NGF-BTC-AM | `frontend/assets/img/NGF-BTC-AM.jpg` | PNG | 1023 × 1024 px | Comunicación de la Rune NGF-BTC-AM, activos vinculados a Bitcoin y material promocional especializado. |
| Wordmark NESGESFinance | `frontend/assets/img/nesgesfinance-logo.svg` | SVG | Escalable | Navegación principal, branding web, documentación y componentes ligeros. |
| Bitcoin ledger | `frontend/assets/img/bitcoin-ledger.svg` | SVG | Escalable | Elementos gráficos de soporte para secciones de verificación, trazabilidad y protocolo Bitcoin. |

## Mapa de uso por sección

### 1. Identidad institucional y portada

- **Logo principal:** `NESGESFinance_Logo.jpg`
- **Apoyo visual secundario:** `NGF-BTC-AM.jpg`
- **Motivo:** representa la capa paraguas del ecosistema y la dualidad institucional + activa.
- **Secciones sugeridas:** `index.html`, `institucional.html`, `README.md`, portada de documentos institucionales.

### 2. Exploración Bitcoin, mempool y arquitectura técnica

- **Logo principal de marca:** `NESGESFinance_Logo.jpg`
- **Activo específico de Bitcoin:** `NGF-BTC-AM.jpg`
- **Apoyo conceptual:** `bitcoin-ledger.svg`
- **Motivo:** estas vistas están asociadas a exploración on-chain, mempool, Runes y Ordinals.
- **Secciones sugeridas:** `dashboard1.html`, `dashboard-unificado.html`, `explorer.html`, `verify.html`, `status.html`, `developers.html`.

### 3. Tokenización RWA y marketplace

- **Logo principal de marca:** `NESGESFinance_Logo.jpg`
- **Activo específico de Bitcoin:** `NGF-BTC-AM.jpg`
- **Motivo:** el portal RWA y su marketplace deben mantener identidad institucional, pero el activo NGF-BTC-AM puede reforzar la relación con Bitcoin y utilidad técnica.
- **Secciones sugeridas:** `dashboard2.html`, `rwa-marketplace.html`, `rwa-states.html`, `evidence-policy.html`.

### 4. Secciones documentales y de cumplimiento

- **Logo principal:** `NESGESFinance_Logo.jpg`
- **Apoyo visual opcional:** `bitcoin-ledger.svg`
- **Motivo:** estas páginas priorizan claridad, trazabilidad y tono formal.
- **Secciones sugeridas:** `docs/*.md`, `README.md`, `evidence-policy.html`, `status.html`.

## Directrices de integración

- Usar `NESGESFinance_Logo.jpg` como imagen principal cuando la sección trate sobre la plataforma, la marca o el ecosistema completo.
- Usar `NGF-BTC-AM.jpg` cuando la sección esté centrada en Bitcoin, Runes, Ordinals, mempool, activos digitales o componentes de utilidad.
- Usar `bitcoin-ledger.svg` como recurso decorativo o contextual, no como sustituto de marca principal.
- Usar `nesgesfinance-logo.svg` en navegación, footers o componentes que requieran peso visual reducido y mejor escalabilidad.
- Evitar colocar imágenes relacionadas con proyectos no alineados con la plataforma actual.

## Casos excluidos

No se deben integrar en la plataforma imágenes relacionadas con:

- **Motel El Refugio**
- **Serie A**

## Paleta oficial

| Nombre | Hex | Uso sugerido |
| --- | --- | --- |
| NESGESFinance Blue | `#0B3C8A` | Titulares, fondos institucionales, navegación y elementos principales de la marca. |
| Bitcoin Orange | `#F7931A` | Resaltar vínculos con Bitcoin, Runes, llamadas a la acción y chips temáticos. |
| Accent Green | `#2EAF6D` | Estados positivos, realces secundarios y acentos de producto. |

## Tipografía recomendada

- **Titulares y marca:** sans-serif geométrica o neo-grotesca de alto contraste visual.
- **Cuerpo de texto:** sans-serif legible para documentación técnica y UI.
- **Fallback web:** `Inter`, `Segoe UI`, `Arial`, `sans-serif`.

## Tamaños mínimos sugeridos

| Contexto | NESGESFinance Ecosystem | NGF-BTC-AM | Wordmark SVG |
| --- | --- | --- | --- |
| README / documentación web | 180 px de ancho | 180 px de ancho | 160 px de ancho |
| Presentaciones | 220 px de ancho | 220 px de ancho | 180 px de ancho |
| Tarjetas / badges / paneles compactos | 96 px de ancho | 96 px de ancho | 72 px de ancho |
| Impresión o exportación de alta densidad | 25 mm | 25 mm | Escalable |

## Checklist de implementación

- [ ] Verificar que cada pieza usa el logo correcto según el contexto.
- [ ] Mantener relación de aspecto original en todos los entornos.
- [ ] Conservar contraste suficiente respecto del fondo.
- [ ] Evitar filtros, recortes o recolorizaciones no autorizadas.
- [ ] Excluir por completo contenidos de Motel El Refugio o Serie A.
