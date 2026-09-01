<!--
  README principal — NESGESFinanceTrust
  Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
-->
# NESGESFinanceTrust

<p align="center">
  <img src="assets/logos/NESGESFinance_Logo.jpg" alt="Logo oficial de NESGESFinance" width="220" />
  <img src="assets/logos/NGF-BTC-AM.jpg" alt="Logo oficial de NGF•BTC•AM" width="220" />
</p>

<p align="center"><strong>Infraestructura técnica Bitcoin L1 · Runes · Ordinals · Tokenización RWA del ecosistema NESGESFinance</strong></p>

⚠️ **Estado de auditoría:** Esta plataforma está actualmente en etapa de **auditoría técnica y testeo de conectores**. Los datos, módulos y funcionalidades visibles pueden corresponder a pruebas de integración y no reflejan necesariamente el estado final ni la disponibilidad definitiva del servicio.

---

Plataforma de **indexación de Bitcoin y tokenización de Activos del Mundo Real
(RWA)** de la **NESGESFinance Ecosystem**. Indexa bloques, mempool, **Runes**
(Utility Token), **Ordinals** (Security Tokens) y registra RWA con
cumplimiento normativo, exponiendo una API REST/WebSocket y un panel web.

> **Plataforma:** nesgesfinancetrust.com · **Versión:** v3.4-dev-audit (Agosto 2026)
> **Lema:** *"Y a tu prójimo como a ti mismo"*
> **Web:** [https://nesgesfinance.org](https://nesgesfinance.org)
> **Whitepaper:** [`NESGESFinance Ecosystem — Documento Maestro Institucional, Tecnológico y de Proyectos 2026`](./NESGESFinance%20Ecosystem%20Mini%20Whitepaper%20Institucional%202026%20(2).pdf)
> **Fuente institucional primaria:** el PDF adjunto funciona como mini whitepaper institucional y documento maestro base para las secciones de arquitectura, tokenómica, postulación de proyectos y gobernanza descritas en este repositorio.
> **Fuente documental única:** [`NESGESFinance/Documentacion`](https://github.com/NESGESFinance/Documentacion) es el repositorio institucional oficial y actualizado para glosario, política de control documental, changelog documental, checklist de publicación y matriz de trazabilidad de claims. Su reflejo literal se mantiene en [`docs/institucional/`](./docs/institucional/README.md).

Referencias de diseño y uso:

- [`docs/BRANDING.md`](./docs/BRANDING.md)
- [`frontend/assets/img/`](./frontend/assets/img/)

---

## Identidad y doctrina

**NESGES** — Núcleo Estratégico y de Gestión para la Comunidad y Ecosistemas
Sostenibles, Financieros, Tecnológicos y Tokenizados.

**Doctrina:** *"Tokenización con Propósito"* — la representación digital debe
estar subordinada al activo real, al expediente jurídico, a la trazabilidad y
a la utilidad productiva.

**Estructura corporativa dual:**

| Entidad | Jurisdicción | Identificador | Función |
|---|---|---|---|
| NESGESFinance Ecosystem S.A.S. BIC | Ecuador (Ibarra) | RUC 1091799299001 | Coordinación tecnológica e impacto BIC local |
| NESGESFinance Ecosystem S.A.S. LLC | Nuevo México, EE.UU. | File #3168825 · EIN 0008086872 | Propiedad intelectual, infraestructura y expansión internacional |
| NESGESFinanceTrust | En proceso de formalización | — | Capa patrimonial/fiduciaria, cumplimiento normativo y primer SPV piloto |

---

## Ecosistema de activos

- **NGF•BTC•AM** → Rune de utilidad #208,645 (ID `923867:120`), supply fijo de
  5.930.000.000 NGF, sin derechos económicos directos sobre proyectos.
- **Runes** → Utility Token fungible nativo (protocolo de Casey Rodarmor, bloque 840000).
- **Ordinals** → Security Tokens y contenedores de metadatos de RWA; cada
  proyecto emite una serie independiente con Reglamento de Emisión y SPV propio.
- **Taproot Assets + Lightning** → liquidez y liquidación en capa 2 (L2).

## Arquitectura (resumen)

```
Bitcoin Core RPC / Esplora  →  blocks.ts / indexadores  →  MySQL/MariaDB + Redis
                                           │
                                           ▼
                               API REST (/api) + WebSocket (/ws)
                                           │
                                           ▼
                      Frontend HTML5 + CSS3 + JavaScript vainilla
```

Detalle completo en [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md).

> **Nota de auditoría:** Esta arquitectura se considera de referencia y está sujeta a confirmación tras la conclusión de la auditoría técnica.

## Requisitos

- **Node.js** ≥ 18
- **MariaDB** 10.11 (o MySQL 8)
- **Redis** 7
- **Bitcoin Core** (JSON-RPC) o un backend **Esplora**

## Instalación

```bash
# 1. Instalar dependencias del backend
npm install

# 2. Configurar variables de entorno
cp .env.example .env      # editar credenciales de BD, Redis y Bitcoin

# 3. Ejecutar migraciones de base de datos
npm run migrate

# 4. Compilar y arrancar
npm run build && npm start
#   o, en desarrollo con recarga:
npm run dev
```

El frontend estático se sirve desde `frontend/` (por Nginx o cualquier
servidor de estáticos). El backend escucha en el puerto `3000` por defecto.
El script `npm run migrate` ejecuta las migraciones SQL ubicadas en
`backend/migrations/` y crea la base de datos si aún no existe.

## Scripts npm

| Script            | Acción                                        |
|-------------------|-----------------------------------------------|
| `npm run build`   | Compila TypeScript a `dist/`.                 |
| `npm start`       | Arranca el servidor compilado.                |
| `npm run dev`     | Desarrollo con `ts-node-dev` (recarga).       |
| `npm run typecheck` | Verificación de tipos (`tsc --noEmit`).     |
| `npm run lint`    | Análisis estático con ESLint.                 |
| `npm run migrate` | Aplica las migraciones SQL.                   |
| `npm test`        | Pruebas con Jest.                             |

## Variables de entorno principales

Ver [`.env.example`](./.env.example). Incluyen: `APP_PORT`, `API_PREFIX`,
`DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`, `REDIS_HOST`/`REDIS_PORT`,
`BITCOIN_RPC_URL`/`BITCOIN_RPC_USER`/`BITCOIN_RPC_PASSWORD`, `ESPLORA_URL`.

## API

Endpoints REST y canales WebSocket documentados en [`docs/API.md`](./docs/API.md).
Resumen:

- `GET /api/health`
- `GET /api/blocks/recent`
- `GET /api/blocks/:height`
- `GET /api/mempool` · `/fees` · `/recent`
- `GET /api/runes` · `/id/:block/:tx` · `/:name` · `/:name/holders`
- `GET /api/ordinals/inscriptions` · `/inscription/:id` · `/content/:id`
- `GET /api/rwa/assets` · `/:id` · `/:id/history` · `POST /assets` · `POST /assets/:id/transfer`
- WebSocket `/ws` (canales: `blocks`, `mempool`, `runes`, `ordinals`, `rwa`)

## Estructura literal completa del proyecto

El siguiente inventario textual refleja las carpetas, subcarpetas y archivos
presentes en el repositorio para complementar el contenido visual ya incorporado:

```text
nesgesfinancetrust/
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── NESGESFinance Ecosystem Mini Whitepaper Institucional 2026 (2).pdf
├── README.md
├── assets/
│   ├── logos/
│   │   ├── NESGESFinance_Logo.jpg
│   │   └── NGF-BTC-AM.jpg
│   └── manifest.json
├── backend/
│   ├── Dockerfile
│   ├── migrations/
│   │   ├── 001_create_blocks_table.sql
│   │   ├── 002_create_runes_table.sql
│   │   ├── 003_create_ordinals_table.sql
│   │   └── 004_create_rwa_table.sql
│   └── src/
│       ├── __tests__/
│       │   ├── branding-assets.test.ts
│       │   ├── compliance.test.ts
│       │   ├── frontend-branding.test.ts
│       │   └── varint.test.ts
│       ├── api/
│       │   ├── _contracts.ts
│       │   ├── blocks.ts
│       │   ├── mempool.ts
│       │   ├── ordinals/
│       │   │   ├── inscription-parser.ts
│       │   │   ├── ordinals-api.ts
│       │   │   └── ordinals-indexer.ts
│       │   ├── runes/
│       │   │   ├── runes-api.ts
│       │   │   ├── runes-indexer.ts
│       │   │   └── runes-parser.ts
│       │   ├── rwa/
│       │   │   ├── rwa-api.ts
│       │   │   ├── rwa-registry.ts
│       │   │   └── rwa-validator.ts
│       │   └── websocket-handler.ts
│       ├── bitcoin/
│       │   ├── bitcoin-api-factory.ts
│       │   ├── bitcoin-client.ts
│       │   ├── crypto/
│       │   │   ├── base58.ts
│       │   │   ├── hash-utils.ts
│       │   │   ├── merkle.ts
│       │   │   └── secp256k1-utils.ts
│       │   └── esplora-client.ts
│       ├── interfaces/
│       │   ├── mempool.interfaces.ts
│       │   ├── ordinals.interfaces.ts
│       │   ├── runes.interfaces.ts
│       │   └── rwa.interfaces.ts
│       ├── repositories/
│       │   ├── BlocksRepository.ts
│       │   ├── OrdinalsRepository.ts
│       │   ├── RWARepository.ts
│       │   └── RunesRepository.ts
│       ├── scripts/
│       │   └── migrate.ts
│       ├── utils/
│       │   ├── bitcoin-script.ts
│       │   ├── compliance.ts
│       │   └── varint.ts
│       ├── config.ts
│       ├── database.ts
│       ├── index.ts
│       ├── indexer-dependencies.ts
│       └── logger.ts
├── docker-compose.yml
├── docs/
│   ├── API.docx
│   ├── API.md
│   ├── API.pdf
│   ├── ARQUITECTURA.docx
│   ├── ARQUITECTURA.md
│   ├── ARQUITECTURA.pdf
│   ├── BRANDING.md
│   ├── COMPLIANCE.docx
│   ├── COMPLIANCE.md
│   ├── COMPLIANCE.pdf
│   ├── institucional/
│   │   ├── CHANGELOG_DOCUMENTAL.md
│   │   ├── CHECKLIST_PUBLICACION_GITHUB_PAGES.md
│   │   ├── GLOSARIO_NESGESFinance.md
│   │   ├── LICENCIA_DOCUMENTACION.md
│   │   ├── MATRIZ_TRAZABILIDAD_CLAIMS.csv
│   │   ├── Politica_Control_Documental.md
│   │   └── README.md
│   ├── ORDINALS_PROTOCOL.docx
│   ├── ORDINALS_PROTOCOL.md
│   ├── ORDINALS_PROTOCOL.pdf
│   ├── PROYECTOS.md
│   ├── RUNES_PROTOCOL.docx
│   ├── RUNES_PROTOCOL.md
│   ├── RUNES_PROTOCOL.pdf
│   ├── TOKENOMICA.md
│   └── WHITEPAPER.md
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── components.css
│   │   │   ├── dashboard.css
│   │   │   └── main.css
│   │   ├── img/
│   │   │   ├── NESGESFinance_Logo.jpg
│   │   │   ├── NGF-BTC-AM.jpg
│   │   │   ├── WA_1787215477423.jpeg
│   │   │   ├── WA_1787215527323.jpeg
│   │   │   ├── WA_1787215591323.jpeg
│   │   │   ├── WA_1787215663190.jpeg
│   │   │   ├── WA_1787215727764.jpeg
│   │   │   ├── WA_1787215808753.jpeg
│   │   │   ├── WA_1787215859983.jpeg
│   │   │   ├── WA_1787215930370.jpeg
│   │   │   ├── WA_1787215982921.jpeg
│   │   │   ├── WA_1787216025279.jpeg
│   │   │   ├── WA_1787216111473.jpeg
│   │   │   ├── WA_1787216163402.jpeg
│   │   │   ├── WA_1787216217261.jpeg
│   │   │   ├── WA_1787216257374.jpeg
│   │   │   ├── WA_1787216381540.jpeg
│   │   │   ├── WA_1787216435207.jpeg
│   │   │   ├── WA_1787216510093.jpeg
│   │   │   ├── WA_1787216676730.jpeg
│   │   │   ├── WA_1787216718634.jpeg
│   │   │   ├── WA_1787216775286.jpeg
│   │   │   ├── bitcoin-ledger.svg
│   │   │   └── nesgesfinance-logo.svg
│   │   └── js/
│   │       ├── app.js
│   │       ├── data-metadata.js
│   │       ├── mempool-viz.js
│   │       ├── ordinals-ui.js
│   │       ├── runes-ui.js
│   │       ├── state-badge.js
│   │       └── websocket-client.js
│   ├── components/
│   │   ├── block-card.html
│   │   ├── rune-token-card.html
│   │   ├── rwa-asset-card.html
│   │   └── tx-row.html
│   ├── dashboard-unificado.html
│   ├── dashboard1.html
│   ├── dashboard2.html
│   ├── developers.html
│   ├── evidence-policy.html
│   ├── explorer.html
│   ├── index.html
│   ├── institucional.html
│   ├── proyectos.html
│   ├── rwa-marketplace.html
│   ├── rwa-states.html
│   ├── status.html
│   ├── vercel.json
│   └── verify.html
├── jest.config.js
├── legal/
│   ├── AVISO_LEGAL.md
│   ├── DIVULGACION_VULNERABILIDADES.md
│   ├── POLITICA_PRIVACIDAD.md
│   └── TERMINOS_USO.md
├── nginx/
│   ├── frontend.conf
│   └── proxy.conf
├── package-lock.json
├── package.json
└── tsconfig.json
```

Resumen funcional por carpeta principal:

- `assets/`: logotipos institucionales oficiales y `manifest.json` de branding.
- `backend/`: API, indexadores, utilidades Bitcoin, migraciones SQL y pruebas.
- `docs/`: documentación funcional, técnica y normativa en formatos MD/PDF/DOCX.
- `frontend/`: páginas HTML, componentes reutilizables, hojas de estilo, scripts e imágenes.
- `legal/`: políticas y textos legales de uso, privacidad y divulgación.
- `nginx/`: configuración de publicación del frontend y proxy reverso.

## Documentación

- [`docs/API.md`](./docs/API.md) — Referencia de la API.
- [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md) — Arquitectura del sistema.
- [`docs/RUNES_PROTOCOL.md`](./docs/RUNES_PROTOCOL.md) — Protocolo Runes y NGF•BTC•AM.
- [`docs/ORDINALS_PROTOCOL.md`](./docs/ORDINALS_PROTOCOL.md) — Protocolo Ordinals y tokens de proyecto.
- [`docs/COMPLIANCE.md`](./docs/COMPLIANCE.md) — Cumplimiento KYC/AML/MiCA y proceso F0–F6.
- [`docs/TOKENOMICA.md`](./docs/TOKENOMICA.md) — Tokenómica oficial v5.0.
- [`docs/PROYECTOS.md`](./docs/PROYECTOS.md) — Portafolio de proyectos y proceso de postulación.
- [`docs/WHITEPAPER.md`](./docs/WHITEPAPER.md) — Documento Maestro / mini whitepaper institucional 2026 (resumen, índice y trazabilidad).
- [`docs/BRANDING.md`](./docs/BRANDING.md) — Guía de branding y uso de logotipos oficiales.
- [`docs/institucional/`](./docs/institucional/README.md) — Documentos de gobierno documental
  sincronizados literalmente desde el repositorio fuente
  [`NESGESFinance/Documentacion`](https://github.com/NESGESFinance/Documentacion)
  (glosario, política de control documental, changelog documental, checklist de
  publicación y matriz de trazabilidad de claims).

## 🎨 Branding y Logotipos

| Asset | Ruta | Uso principal |
| --- | --- | --- |
| NESGESFinance Ecosystem | `assets/logos/NESGESFinance_Logo.jpg` | Encabezados institucionales, documentos corporativos y piezas del ecosistema. |
| NGF•BTC•AM | `assets/logos/NGF-BTC-AM.jpg` | Activos vinculados a Bitcoin, Runes, fichas visuales y comunicaciones específicas del producto. |

Referencias relacionadas:

- [Guía completa de branding](docs/BRANDING.md)
- [Manifest de assets](assets/manifest.json)

## Exclusiones editoriales

Este repositorio no debe incorporar ni referenciar contenido relacionado con
**Motel El Refugio** o **Serie A** dentro de sus secciones visuales o
documentales.

## Créditos

- **Empresa:** NESGESFinance Ecosystem S.A.S. BIC. & LLC. — EIN: 0008086872
- **CEO-Fundador:** Cbr. Joan Santiago Ramírez Almeida
- **Plataforma:** nesgesfinancetrust.com · [https://nesgesfinance.org](https://nesgesfinance.org)

## Licencia

®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872 — TODOS LOS DERECHOS RESERVADOS 2025-2026
