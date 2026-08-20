# Protocolo Runes — NESGESFinanceTrust

> Plataforma: **nesgesfinancetrust.com** · Versión **v3.4-dev** (Agosto 2026)
> Empresa: **NESGESFinance Ecosystem S.A.S. BIC. & LLC.** · EIN: 0008086872

En NESGESFinance, los **Runes** son **Utility Tokens** fungibles nativos de
Bitcoin. Implementan el protocolo Runes de **Casey Rodarmor**, activado en el
bloque **840000** (halving de 2024).

## 1. Fundamentos

- Los Runes se emiten y transfieren mediante un **RuneStone**: un mensaje
  codificado dentro de una salida `OP_RETURN`.
- El `OP_RETURN` va seguido de `OP_13` (el *magic number* del protocolo) y de
  un cuerpo de enteros codificados en **LEB128** (varint de longitud variable).
- Un Rune se identifica por su `RuneId` con la forma `bloque:índiceTx`
  (p. ej. `840000:1`).

## 2. Operaciones

| Operación   | Descripción                                                      |
|-------------|------------------------------------------------------------------|
| **Etch**    | Creación (grabado) de un nuevo Rune: nombre, símbolo, divisibilidad, suministro, condiciones de acuñación. |
| **Mint**    | Acuñación de unidades según los términos definidos en el *etch*. |
| **Transfer**| Reparto de saldos entre las salidas de la transacción (*edicts*).|
| **Cenotaph**| RuneStone malformado o no reconocido: quema los Runes implicados.|

## 3. Estructura del RuneStone

El cuerpo es una secuencia de pares *tag → valor* codificados en LEB128:

- **Body / edicts:** tuplas `(id_bloque, id_tx, cantidad, salida)`.
- **Flags:** indican si hay *etching* y/o *mint*.
- **Campos:** `Rune`, `Divisibility`, `Spacers`, `Symbol`, `Premine`, `Cap`,
  `Amount`, `HeightStart`, `HeightEnd`, `OffsetStart`, `OffsetEnd`, `Mint`,
  `Pointer`.

## 4. Implementación en la plataforma

- `api/runes/runes-parser.ts` — decodifica el `OP_RETURN`, valida `OP_13`,
  lee los enteros LEB128 y reconstruye el RuneStone (detecta *cenotaphs*).
- `api/runes/runes-indexer.ts` — aplica *etch/mint/transfer* sobre el estado y
  actualiza saldos de titulares.
- `api/runes/runes-api.ts` — expone las consultas REST (ver `API.md`).
- `repositories/RunesRepository.ts` — persistencia de Runes y titulares.

## 5. Nombres y espaciadores

Los nombres se representan en base 26 (A–Z) y admiten **espaciadores** (`•`)
puramente visuales (p. ej. `UNCOMMON•GOODS`). El indexador almacena el nombre
canónico y su versión con espaciadores.

---

## 6. NGF·BTC·AM — Rune de utilidad del ecosistema

El token nativo de NESGESFinance Ecosystem es el Rune **NGF·BTC·AM**, emitido
sobre Bitcoin L1:

| Campo | Valor |
|---|---|
| **Número de Rune** | #208,645 |
| **RuneId** | `923867:120` |
| **Bloque de etching** | 923.867 |
| **Fecha de etching** | 16 de noviembre de 2025 · 10:24:23 UTC |
| **TXID de etching** | `4c0b2416f3dd122025f89a62d7ff265fcee8d00e0fabd874669617cf85437c82` |
| **Supply** | 5.930.000.000 NGF (fijo · no minteable · no quemable) |
| **Divisibilidad** | 0 |
| **Naturaleza** | Utility token; sin derechos económicos sobre proyectos |

**Funciones declaradas:** identidad digital, acceso técnico al ecosistema,
participación funcional, gobernanza consultiva y unidad de cuenta.

La verificación pública del Rune puede consultarse en:
[UniScan](https://uniscan.xyz), [Mempool.space](https://mempool.space) y
[Ord.io](https://ord.io).

> Ver distribución detallada del supply en [`docs/TOKENOMICA.md`](./TOKENOMICA.md).

---

Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872 — TODOS LOS DERECHOS RESERVADOS 2025-2026
