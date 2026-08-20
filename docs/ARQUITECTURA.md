# Arquitectura del sistema — NESGESFinanceTrust

> Plataforma: **nesgesfinancetrust.com** · Versión **3.4.0-dev** (Agosto 2026)
> Empresa: **NESGESFinance Ecosystem S.A.S. BIC. & LLC.** · EIN: 0008086872
> CEO-Fundador: Cbr. Joan Santiago Ramírez Almeida
> Lema: *"Y a tu prójimo como a ti mismo"*

Este documento describe la arquitectura de la plataforma de indexación y
tokenización de la NESGESFinance Ecosystem, construida sobre Bitcoin y sus protocolos de capa 1.

---

## 1. Visión general

NESGESFinanceTrust indexa la cadena de Bitcoin y expone una capa de servicios
para tres clases de activos digitales:

- **Runes** → *Utility Tokens* (fungibles, protocolo de Casey Rodarmor).
- **Ordinals** → inscripciones y contenedores de metadatos asociados a RWA.
- **Registro RWA** → activos, historial y validaciones configurables.

---

## 2. Diagrama de capas

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENTES (navegador)                           │
│   Frontend HTML5 + CSS3 + JavaScript vainilla (sin frameworks)         │
│   index · dashboard1 (mempool) · explorer · dashboard2 (RWA) · market  │
└───────────────┬───────────────────────────────────┬──────────────────┘
                │ HTTPS (REST /api)                  │ WSS (/ws)
                ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      CAPA DE APLICACIÓN (backend)                      │
│   Node.js + Express + TypeScript (modo strict)                         │
│  ┌──────────┬──────────┬───────────┬───────────┬──────────────────┐   │
│  │ blocks   │ mempool  │  runes    │ ordinals  │  rwa             │   │
│  │  API     │  API     │  API      │  API      │  API             │   │
│  └────┬─────┴────┬─────┴─────┬─────┴─────┬─────┴────────┬─────────┘   │
│       │          │           │           │              │             │
│  ┌────▼──────────▼───────────▼───────────▼──────────────▼─────────┐   │
│  │                 Indexadores y parsers                          │   │
│  │  runes-indexer · ordinals-indexer · rwa-registry · blocks      │   │
│  └────────────────────────────┬───────────────────────────────────┘   │
│                               │                                        │
│  ┌────────────────────────────▼───────────────────────────────────┐   │
│  │           Repositorios (acceso a datos)                        │   │
│  │  BlocksRepository · RunesRepository · OrdinalsRepository · RWA │   │
│  └───────────────┬────────────────────────────────┬───────────────┘   │
└──────────────────┼────────────────────────────────┼───────────────────┘
                   │                                 │
          ┌────────▼─────────┐              ┌────────▼─────────┐
          │  MySQL / MariaDB │              │      Redis       │
          │  (persistencia)  │              │  (caché/colas)   │
          └──────────────────┘              └──────────────────┘
                   ▲
                   │  RPC / REST
          ┌────────┴───────────────────────────────┐
          │   Bitcoin Core (JSON-RPC)  ó  Esplora   │
          │   fuente de bloques y transacciones     │
          └─────────────────────────────────────────┘
```

---

## 3. Flujo de datos

1. **Ingesta.** `bitcoin-api-factory` selecciona el backend de datos:
   `bitcoin-client` (JSON-RPC de Bitcoin Core) o `esplora-client` (REST).
2. **Indexación de bloques.** `blocks.ts` recupera cada bloque nuevo, calcula
   estadísticas (comisiones, tamaño, CPFP, ajuste de dificultad) y las persiste
   mediante `BlocksRepository`.
3. **Parseo de protocolos.**
   - `runes-parser` decodifica los *RuneStone* del `OP_RETURN` (`OP_13`, LEB128).
   - `inscription-parser` extrae las inscripciones del *witness* Taproot.
4. **Tokenización RWA.** `rwa-registry` vincula un Ordinal (titularidad legal)
   y, opcionalmente, un Rune (fraccionamiento) a un activo del mundo real, tras
   pasar `rwa-validator` (KYC/AML/MiCA).
5. **Persistencia.** Los repositorios escriben en MySQL/MariaDB; Redis queda disponible como dependencia de caché para la plataforma.
6. **Difusión.** `websocket-handler` publica los eventos por canal
   (`blocks`, `mempool`, `runes`, `ordinals`, `rwa`) a los clientes suscritos.
7. **Presentación.** El frontend consume REST para carga inicial y WebSocket
   para actualizaciones en vivo.

---

## 4. Componentes del backend

| Módulo                       | Responsabilidad                                       |
|------------------------------|-------------------------------------------------------|
| `index.ts`                   | Arranque del servidor Express y montaje de rutas.     |
| `config.ts`                  | Configuración tipada (incluye sección `MEMPOOL`).     |
| `logger.ts`                  | Registro estructurado (Winston).                      |
| `database.ts`                | Pool de conexiones MySQL/MariaDB.                     |
| `api/blocks.ts`              | Indexación y estadísticas de bloques.                 |
| `api/mempool.ts`             | Estado del mempool y estimación de comisiones.        |
| `api/runes/*`                | Parser, indexador y API de Runes.                     |
| `api/ordinals/*`             | Parser, indexador y API de Ordinals.                  |
| `api/rwa/*`                  | Validador, registro y API de RWA.                     |
| `bitcoin/*`                  | Clientes RPC/Esplora y utilidades criptográficas.     |
| `repositories/*`             | Acceso a datos por dominio.                           |
| `interfaces/*`               | Contratos de tipos compartidos.                       |
| `utils/*`                    | `bitcoin-script`, `varint`, `compliance`.             |

---

## 5. Seguridad

- **TypeScript strict** con `noUnusedLocals`/`noUnusedParameters` para reducir
  errores en tiempo de compilación.
- **Validación de entrada** en todos los endpoints (parámetros y cuerpos).
- **Cumplimiento normativo** (KYC/AML/MiCA) obligatorio antes de tokenizar RWA.
- **Integridad documental** mediante hash SHA-256 de cada documento legal.
- **Separación de secretos** vía variables de entorno (`.env`, nunca en el repo).
- **Límite de tamaño de cuerpo** de `2mb`. La política CORS actual permite cualquier origen y debe restringirse antes de un despliegue público.

---

## 6. Escalabilidad

- **Caché Redis** para consultas frecuentes y para desacoplar la difusión.
- **Indexación incremental** por altura de bloque (reanudable).
- **Repositorios desacoplados** que permiten fragmentación o réplica de lectura.
- **Frontend estático** servible desde CDN o Nginx, independiente del backend.
- **Contenedores Docker** (ver `docker-compose.yml`) para despliegue horizontal.

---

Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872 — TODOS LOS DERECHOS RESERVADOS 2025-2026
