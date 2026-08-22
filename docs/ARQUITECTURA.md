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

## 7. Stack tecnológico

| Componente | Aplicación |
|---|---|
| **Bitcoin L1** | Capa base: registro, inmutabilidad, descentralización, neutralidad y seguridad. |
| **Runes + Ordinals** | Activos fungibles (NGF·BTC·AM) y no fungibles (tokens de proyecto) con metadata. |
| **Lightning Network** | Pagos rápidos y de bajo costo; integración prevista/en desarrollo. |
| **Taproot Assets** | Capa complementaria para operaciones cotidianas y activos sobre Bitcoin. |
| **Custodia** | Wallets multifirma 3/5 P2SH con hardware wallets industriales; rotación semestral de firmantes. |
| **Observabilidad** | Monitoreo de mempool en tiempo real; separación entre consenso, datos derivados y capas superiores. |
| **Software** | Node.js/TypeScript, MySQL/MariaDB, Redis, PSBT, GitHub Actions; oráculo Python. |
| **Ciberseguridad** | Auditoría continua, pentesting recurrente, control de secretos y estrategia de migración post-cuántica. |

---

## 8. Arquitectura de seguridad y auditoría

### 8.1 Principios de separación de capas

- El consenso de Bitcoin, los datos derivados de los indexadores y los estados
  de L2 se mantienen diferenciados y sin acoplamiento directo.
- Ninguna clave privada, semilla BIP39, macaroon o credencial RPC se almacena
  en frontend, repositorios, logs o variables públicas.

### 8.2 CI/CD

Mínimo privilegio, acciones fijadas por SHA, OIDC, ambientes protegidos,
SAST/SCA, SBOM y firma de artefactos.

### 8.3 Backend/API

Validación estricta, rate limiting, timeouts, esquemas tipados, pruebas
negativas y controles anti-SSRF/DoS.

### 8.4 Frontend

CSP, sanitización, lockfiles, control de dependencias y ausencia de secretos
públicos.

### 8.5 RWA/KYC

El explorador público permanece separado de PII, KYC/AML, perfiles de
inversionista y reglas jurisdiccionales.

### 8.6 Estrategia post-cuántica

No se declara Bitcoin como «quantum-safe» por capas auxiliares. Se mantiene la
reducción de exposición de claves y una estrategia de migración documentada.

---

## 9. Transparencia y trazabilidad

- Hashes SHA-256 de documentos vinculantes anclados en Bitcoin mediante `OP_RETURN`.
- Bitácora de custodia multifirma y transacciones autorizadas.
- TXID públicos de distribuciones trimestrales (snapshots al 31-mar, 30-jun,
  30-sep y 31-dic a las 23:59 UTC).
- Scripts de cálculo de distribuciones abiertos a auditoría.
- Metadata pública y referencias a exploradores (Mempool.space, Ord.io, UniScan).
- Proof-of-Reserves/Proof-of-Production sujeto a evidencia primaria y
  procedimientos reproducibles.
- Expediente forense de software: commit → inventario → hashes → archivo
  reproducible → transcripción → diff → pruebas → hallazgos → correcciones.

---

## 10. Roadmap 2025–2030

| Período | Hito |
|---|---|
| **2025–2026 · Fundacional** | Constitución dual, emisión NGF·BTC·AM #208,645, whitepapers y estructura legal base. |
| **2026 · Primer proyecto** | Primer proyecto tokenizado, consolidación LLC, integración Lightning y KYC/AML operativo. |
| **2027–2028 · Consolidación** | Nuevos proyectos agrícolas, sociales y energéticos; expansión de gobernanza. |
| **2029–2030 · Escala global** | Internacionalización, alianzas estratégicas y evolución hacia gobernanza descentralizada/DAO. |

---

Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872 — TODOS LOS DERECHOS RESERVADOS 2025-2026
