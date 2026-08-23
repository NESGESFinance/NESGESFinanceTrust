# API REST y WebSocket — NESGESFinanceTrust

> Plataforma: **nesgesfinancetrust.com** · Versión **3.4.0-dev** (Agosto 2026)
> Empresa: **NESGESFinance Ecosystem S.A.S. BIC. & LLC.** · EIN: 0008086872
> Lema: *"Y a tu prójimo como a ti mismo"*

Este documento describe la implementación actual del repositorio. Todos los endpoints REST se sirven bajo el prefijo configurable `API_PREFIX`
(por defecto `/api`). Las respuestas son JSON codificado en UTF-8. Los importes
en satoshis y los suministros de tokens se transmiten como cadenas para
preservar la precisión de enteros grandes (`bigint`).

---

## Índice

1. [Salud del servicio](#salud-del-servicio)
2. [Bloques](#bloques)
3. [Mempool](#mempool)
4. [Runes (Utility Token)](#runes-utility-tokens)
5. [Ordinals e inscripciones](#ordinals-e-inscripciones)
6. [RWA — Activos del Mundo Real](#rwa--activos-del-mundo-real)
7. [WebSocket en tiempo real](#websocket-en-tiempo-real)
8. [Códigos de estado y errores](#códigos-de-estado-y-errores)

---

## Salud del servicio

### `GET /api/health`

Comprueba la identidad de la plataforma y el estado real de dependencias
críticas. Si la base de datos está habilitada pero no disponible, responde
`503 Service Unavailable` con `status: "degraded"`.

**Respuesta `200 OK`**
```json
{
  "status": "ok",
  "plataforma": "nesgesfinancetrust.com",
  "version": "3.4.0-dev",
  "lema": "Y a tu prójimo como a ti mismo",
  "empresa": "NESGESFinance Ecosystem S.A.S. BIC. & LLC.",
  "ein": "0008086872",
  "services": {
    "database": { "enabled": true, "status": "connected", "message": "Conexión operativa." },
    "redis": { "enabled": true, "status": "configured", "message": "Redis configurado en redis:6379." },
    "mempool": { "backend": "esplora", "audit": true, "message": "Fuente de datos on-chain: esplora." },
    "rwa": { "status": "audit_only", "message": "Las operaciones de escritura del registro RWA permanecen bloqueadas durante la auditoría." }
  }
}
```

---

## Bloques

### `GET /api/blocks/recent`

Devuelve los bloques más recientes persistidos.

| Parámetro | Ubicación | Tipo   | Por defecto | Descripción                |
|-----------|-----------|--------|-------------|----------------------------|
| `limit`   | query     | entero | 10          | Máximo de resultados (≤50).|

### `GET /api/blocks/:height`

Devuelve el bloque indexado a la altura indicada.

| Parámetro | Ubicación | Tipo    | Descripción              |
|-----------|-----------|---------|--------------------------|
| `height`  | ruta      | entero  | Altura del bloque (≥ 0). |

**Respuesta `200 OK`** — objeto `BlockExtended` con `id`, `height`,
`timestamp`, `tx_count`, `size`, `weight`, `total_fees`, `medianFee`, etc.

**Errores:** `404` si el bloque no está indexado; `500` en error interno.

---

## Mempool

### `GET /api/mempool`

Estadísticas agregadas del mempool en memoria.

```json
{ "count": 12345, "vsize": 48211234, "total_fee": 210394000, "fee_histogram": [[1, 120000], [2, 98000]] }
```

### `GET /api/mempool/fees`

Estimaciones de comisión por objetivo de confirmación (sat/vB).

```json
{ "fastest": 42, "halfHour": 30, "hour": 18, "economy": 6, "minimum": 1 }
```

### `GET /api/mempool/recent`

Últimas transacciones observadas en el mempool (array de resúmenes con
`txid`, `fee`, `vsize`, `value`).

---

## Runes (Utility Token)

Protocolo Runes de Casey Rodarmor (ver [`RUNES_PROTOCOL.md`](./RUNES_PROTOCOL.md)).

### `GET /api/runes`

Listado paginado de Runes.

| Parámetro | Ubicación | Tipo   | Por defecto | Descripción                 |
|-----------|-----------|--------|-------------|-----------------------------|
| `limit`   | query     | entero | 50          | Máximo de resultados (≤200).|
| `offset`  | query     | entero | 0           | Desplazamiento de paginación.|

### `GET /api/runes/id/:block/:tx`

Obtiene un Rune por su `RuneId` (`bloque:índiceTx`), p. ej. `840000:1`.

### `GET /api/runes/:name`

Obtiene un Rune por su nombre (con o sin espaciadores `•`).

### `GET /api/runes/:name/holders`

Lista de titulares de un Rune con su saldo (ordenado descendente).

---

## Ordinals e inscripciones

Teoría ordinal y protocolo de inscripciones (ver
[`ORDINALS_PROTOCOL.md`](./ORDINALS_PROTOCOL.md)).

### `GET /api/ordinals/inscriptions`

Listado paginado de inscripciones (`limit`, `offset` como en Runes).

### `GET /api/ordinals/inscription/:id`

Metadatos de una inscripción por su ID (`<txid>i<index>`).

### `GET /api/ordinals/content/:id`

Contenido bruto de la inscripción. Se responde con el `Content-Type`
original de la inscripción (imagen, texto, JSON, etc.).

---

## RWA — Activos del Mundo Real

Registro de activos tokenizados. Cumplimiento MiCA/KYC/AML descrito en
[`COMPLIANCE.md`](./COMPLIANCE.md).

### `GET /api/rwa/assets`

Listado de activos con filtros.

| Parámetro | Ubicación | Tipo   | Descripción                                            |
|-----------|-----------|--------|--------------------------------------------------------|
| `type`    | query     | enum   | `INMUEBLE`,`VEHICULO`,`ARTE`,`COMMODITIES`,`DEUDA`,`EQUITY`. |
| `status`  | query     | enum   | `PENDIENTE`,`ACTIVO`,`TRANSFERIDO`,`CANCELADO`.        |
| `limit`   | query     | entero | Máximo de resultados (≤200, por defecto 50).           |
| `offset`  | query     | entero | Desplazamiento de paginación.                          |

### `GET /api/rwa/assets/:id`

Detalle de un activo por su UUID interno.

### `GET /api/rwa/assets/:id/history`

Historial de eventos (registro, transferencias, cambios de estado).

### `POST /api/rwa/assets`

Registra y tokeniza un nuevo activo. Ejecuta las validaciones de cumplimiento
antes de persistir.

**Cuerpo (JSON)**
```json
{
  "type": "INMUEBLE",
  "name": "Apartamento Torre Central 12B",
  "description": "Inmueble residencial de 92 m².",
  "valuationUSD": 150000,
  "owner": "bc1p...",
  "inscriptionId": "<txid>i0",
  "runeId": "840000:1",
  "backing": "security",
  "ownerKyc": "VERIFICADO",
  "jurisdictionRisk": "BAJO",
  "metadata": {
    "legalDocuments": [],
    "physicalLocation": "Bogotá, Colombia",
    "appraisalDate": "2026-08-01T00:00:00.000Z",
    "appraisalValue": 150000,
    "certifications": ["Escritura pública No. 1234"]
  }
}
```

**Campos obligatorios:** `type`, `name`, `valuationUSD`, `owner`,
`inscriptionId`, `metadata`.

**Respuestas**
- `201 Created` → `{ "asset": { ... }, "validation": { "valid": true, "errors": [] } }`
- `400 Bad Request` → faltan campos obligatorios.
- `422 Unprocessable Entity` → `{ "error": "Validación fallida.", "validation": { "errors": [ ... ] } }`
- `503 Service Unavailable` → `{ "error": "Registro de activos deshabilitado en etapa de auditoría.", "status": "en_auditoria", ... }`

### `POST /api/rwa/assets/:id/transfer`

Transfiere la titularidad de un activo.

**Cuerpo:** `{ "newOwner": "bc1p...", "txid": "<txid de la transferencia>" }`

**Respuestas destacadas**
- `200 OK` → activo transferido.
- `503 Service Unavailable` → transferencias bloqueadas por modo auditoría.

---

## WebSocket en tiempo real

**Endpoint:** `ws(s)://<host>/ws`

El cliente se suscribe a canales mediante un mensaje JSON:

```json
{ "action": "subscribe", "channels": ["blocks", "mempool", "runes", "ordinals", "rwa"] }
```

| Canal      | Evento emitido                                          |
|------------|---------------------------------------------------------|
| `blocks`   | Nuevo bloque indexado cuando el indexador emite el evento. |
| `mempool`  | Reservado para actualizaciones de mempool.                |
| `runes`    | Reservado para eventos de Runes.                          |
| `ordinals` | Reservado para eventos de Ordinals.                       |
| `rwa`      | Reservado para eventos del registro RWA.                  |

Cada mensaje del servidor tiene la forma:
```json
{ "channel": "blocks", "payload": { ... }, "timestamp": 0 }
```

---

## Códigos de estado y errores

| Código | Significado                                        |
|--------|----------------------------------------------------|
| `200`  | Operación correcta.                                |
| `201`  | Recurso creado.                                    |
| `400`  | Petición inválida (parámetros o cuerpo).           |
| `404`  | Recurso no encontrado.                             |
| `422`  | Validación de cumplimiento fallida.                |
| `503`  | Dependencia crítica no disponible o endpoint bloqueado por auditoría. |
| `500`  | Error interno del servidor.                        |

Los errores se devuelven con la forma `{ "error": "mensaje descriptivo" }`.

---

Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872 — TODOS LOS DERECHOS RESERVADOS 2025-2026
