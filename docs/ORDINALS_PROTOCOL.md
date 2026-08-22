# Protocolo Ordinals — NESGESFinanceTrust

> Plataforma: **nesgesfinancetrust.com** · Versión **3.4.0-dev** (Agosto 2026)
> Empresa: **NESGESFinance Ecosystem S.A.S. BIC. & LLC.** · EIN: 0008086872

En NESGESFinance, los **Ordinals** se utilizan como inscripciones y como
contenedores de metadatos de los **RWA** (activos del mundo real). Se basan en
la **teoría ordinal** y en el protocolo de inscripciones sobre Bitcoin.

## 1. Teoría ordinal

- Cada satoshi recibe un **número ordinal** según el orden en que fue minado.
- Los satoshis se rastrean a través de las transacciones con el criterio
  *first-in-first-out* (las entradas ordenan las salidas).
- Esto permite tratar satoshis individuales como activos únicos e
  identificables (base de la no fungibilidad).

## 2. Inscripciones

- Una **inscripción** adjunta contenido arbitrario (imagen, texto, JSON…) a un
  satoshi concreto.
- El contenido se guarda en el **witness** de una entrada gastada por Taproot,
  dentro de un *envelope* (sobre) con el marcador de protocolo `"ord"`.
- Estructura del sobre: `OP_FALSE OP_IF "ord" ... OP_ENDIF`, con campos para el
  `content-type` y el cuerpo troceado en *pushes*.
- El identificador de la inscripción es `<txid>i<index>`.

## 3. Seguimiento de satoshis (sat tracking)

El indexador determina a qué satoshi queda anclada cada inscripción y sigue su
recorrido en transferencias posteriores, de modo que la titularidad del Ordinal
puede utilizarse como referencia técnica dentro del registro; no acredita por sí sola titularidad legal del activo.

## 4. Implementación en la plataforma

- `api/ordinals/inscription-parser.ts` — reconstruye el *witness envelope*,
  valida el marcador `"ord"`, extrae `content-type` y contenido.
- `api/ordinals/ordinals-indexer.ts` — asigna la inscripción a su satoshi y
  registra su procedencia.
- `api/ordinals/ordinals-api.ts` — expone metadatos y contenido bruto
  (ver `API.md`).
- `repositories/OrdinalsRepository.ts` — persistencia (contenido en `LONGBLOB`).

## 5. Vínculo con RWA

Un activo del mundo real (`rwa-registry`) referencia el `inscriptionId` del
Ordinal que porta sus metadatos legales. Así, el Ordinal es el ancla de
titularidad on-chain, mientras que el Rune opcional aporta fraccionamiento y
liquidez.

## 6. Ordinals de proyecto — Securities tokenizados

Cada proyecto aprobado dentro del ecosistema NESGESFinance emite una **serie
independiente** de Ordinals sobre Bitcoin L1. Esto les diferencia del Rune de
utilidad (NGF·BTC·AM) y garantiza el aislamiento patrimonial:

- Los metadatos de cada Ordinal incorporan **hashes SHA-256** de contratos
  legales, validaciones KYC/AML y el hash del Reglamento de Emisión del SPV.
- El acceso a la compra está restringido a **whitelist obligatoria** de
  direcciones Bitcoin previamente habilitadas.
- Estos activos son tratados como *securities tokenizados* desde su origen,
  sujetos al marco jurídico de cada serie (Reg D 506(c) y/o Reg S según aplique).

### 6.1 Modelo SPV por proyecto

Cada proyecto se estructura mediante un **SPV (Special Purpose Vehicle)**
independiente, separado de las entidades coordinadoras, con:

- Expediente documental propio.
- Activo subyacente identificado y valorado.
- Reglamento de Emisión definitorio del suministro, distribución, calendario
  y gobernanza.
- Custodia multifirma 3/5 propia.
- Trazabilidad on-chain completa (TXID y metadata pública).

> Ver el proceso completo de postulación F0–F6 en [`docs/PROYECTOS.md`](./PROYECTOS.md)
> y la documentación de cumplimiento normativo en [`docs/COMPLIANCE.md`](./COMPLIANCE.md).

---

Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872 — TODOS LOS DERECHOS RESERVADOS 2025-2026
