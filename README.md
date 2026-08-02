<!--
  README principal — NESGESFinanceTrust
  Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872
-->
# NESGESFinanceTrust

Plataforma de **indexación de Bitcoin y tokenización de Activos del Mundo Real
(RWA)** de la **NESGESFinance Ecosystem**. Indexa bloques, mempool, **Runes**
(Utility Tokens), **Ordinals** (Security Tokens) y registra RWA con
cumplimiento normativo, exponiendo una API REST/WebSocket y un panel web.

> **Plataforma:** nesgesfinancetrust.com · **Versión:** v3.4-dev (Agosto 2026)
> **Lema:** *"Y a tu prójimo como a tí mismo"*

---

## Ecosistema de activos

- **Runes** → *Utility Tokens* fungibles (protocolo de Casey Rodarmor, bloque 840000).
- **Ordinals** → *Security Tokens* y contenedores de metadatos de RWA.
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
- `GET /api/blocks/:height`
- `GET /api/mempool` · `/fees` · `/recent`
- `GET /api/runes` · `/id/:block/:tx` · `/:name` · `/:name/holders`
- `GET /api/ordinals/inscriptions` · `/inscription/:id` · `/content/:id`
- `GET /api/rwa/assets` · `/:id` · `/:id/history` · `POST /assets` · `POST /assets/:id/transfer`
- WebSocket `/ws` (canales: `blocks`, `mempool`, `runes`, `ordinals`, `rwa`)

## Estructura del proyecto

```
nesgesfinancetrust/
├── backend/
│   ├── src/
│   │   ├── index.ts, config.ts, logger.ts, database.ts
│   │   ├── api/            # blocks, mempool, runes, ordinals, rwa, websocket
│   │   ├── bitcoin/        # clientes RPC/Esplora + crypto
│   │   ├── repositories/   # acceso a datos por dominio
│   │   ├── interfaces/     # contratos de tipos
│   │   └── utils/          # bitcoin-script, varint, compliance
│   └── migrations/         # 001..004 (SQL)
├── frontend/
│   ├── index.html, dashboard1.html, explorer.html, dashboard2.html, rwa-marketplace.html
│   ├── assets/ (css, js, img)
│   └── components/         # fragmentos HTML reutilizables
├── docs/                   # API, ARQUITECTURA, RUNES, ORDINALS, COMPLIANCE
├── nginx/                  # configuración de servidor
├── docker-compose.yml
├── package.json, tsconfig.json, .env.example
└── README.md
```

## Documentación

- [`docs/API.md`](./docs/API.md) — Referencia de la API.
- [`docs/ARQUITECTURA.md`](./docs/ARQUITECTURA.md) — Arquitectura del sistema.
- [`docs/RUNES_PROTOCOL.md`](./docs/RUNES_PROTOCOL.md) — Protocolo Runes.
- [`docs/ORDINALS_PROTOCOL.md`](./docs/ORDINALS_PROTOCOL.md) — Protocolo Ordinals.
- [`docs/COMPLIANCE.md`](./docs/COMPLIANCE.md) — Cumplimiento KYC/AML/MiCA.

## Créditos

- **Empresa:** NESGESFinance Ecosystem S.A.S. BIC. & LLC. — EIN: 0008086872
- **CEO-Fundador:** Cbr. Joan Santiago Ramírez Almeida
- **Plataforma:** nesgesfinancetrust.com

## Licencia

®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872 — TODOS LOS DERECHOS RESERVADOS 2025-2026
