# Cumplimiento normativo (KYC / AML / MiCA) — NESGESFinanceTrust

> Plataforma: **nesgesfinancetrust.com** · Versión **v3.4-dev** (Agosto 2026)
> Empresa: **NESGESFinance Ecosystem S.A.S. BIC. & LLC.** · EIN: 0008086872
> Lema: *"Y a tu prójimo como a tí mismo"*

La tokenización de RWA en NESGESFinance exige controles de cumplimiento antes
de registrar o transferir cualquier activo. La lógica reside en
`utils/compliance.ts` y `api/rwa/rwa-validator.ts`.

## 1. Clasificación MiCA

Según el reglamento europeo **MiCA**, los tokens se clasifican en:

| Clase        | `backing`  | Descripción                                                    |
|--------------|------------|----------------------------------------------------------------|
| **EMT**      | `fiat`     | *E-Money Token* referenciado a una única moneda fiat.          |
| **ART**      | `basket`   | *Asset-Referenced Token* respaldado por una cesta de activos.  |
| **UTILITY**  | `utility`  | Token de utilidad (acceso a un bien/servicio) — Runes.         |
| **SECURITY** | `security` | Valor negociable tokenizado (RWA anclado a Ordinal).           |

## 2. KYC (Know Your Customer)

Estados del titular (`KycStatus`):

| Estado         | Significado                                  |
|----------------|----------------------------------------------|
| `NO_INICIADO`  | Sin verificación.                            |
| `PENDIENTE`    | Documentación en revisión.                   |
| `VERIFICADO`   | Identidad confirmada.                         |
| `RECHAZADO`    | Verificación denegada.                        |

## 3. AML (Anti-Money Laundering)

Nivel de riesgo de jurisdicción (`RiskLevel`): `BAJO`, `MEDIO`, `ALTO`.

**Umbrales aplicados por el validador:**

- Un activo con `backing = security` **requiere** KYC `VERIFICADO` del titular.
- Jurisdicción de riesgo `ALTO` bloquea el registro salvo KYC `VERIFICADO`.
- Valoraciones elevadas activan revisión reforzada (*Enhanced Due Diligence*).
- Todo documento legal debe aportar su **hash SHA-256** para garantizar
  integridad e inalterabilidad.

## 4. Flujo de validación

1. El endpoint `POST /api/rwa/assets` recibe el activo y sus metadatos.
2. `rwa-validator` comprueba campos obligatorios, clase MiCA, estado KYC y
   riesgo AML.
3. Si la validación falla, se devuelve `422` con la lista de errores.
4. Si es correcta, el activo se persiste en estado `PENDIENTE` y se emite el
   evento por el canal WebSocket `rwa`.

## 5. Trazabilidad

Cada alta o transferencia queda registrada en `rwa_history`, permitiendo una
auditoría completa del ciclo de vida del activo (quién, cuándo, qué txid).

---

## 6. Proceso oficial de postulación — F0 a F6

Los proyectos que solicitan tokenización en NESGESFinance atraviesan seis fases
formales antes de cualquier emisión:

| Fase | Nombre | Descripción resumida |
|---|---|---|
| **F0** | Solicitud | Título de propiedad, avalúo independiente, estados financieros, permisos/licencias y memoria técnica. |
| **F1** | Due diligence | Verificación legal, financiera y técnica; cruce por pares y registro de evidencia. |
| **F2** | SPV y Reglamento | Constitución del SPV y definición de suministro, distribución, calendario y gobernanza. |
| **F3** | Oferta bajo cumplimiento | Estructuración como *security*; Reg D 506(c) y/o Reg S según el caso; restricciones de whitelist. |
| **F4** | Emisión técnica L1 | Inscripción de Ordinals, anclaje SHA-256/OP_RETURN, multisig 3/5 y oráculo de datos. |
| **F5** | Aprobación | Revisión y firma multifirma; publicación en Launchpad. |
| **F6** | Operación continua | Snapshots trimestrales, distribuciones BTC, reportes periódicos y gobernanza del Reglamento. |

Ningún proyecto se publica antes de completar las fases F0–F5 con documentación
de emisión íntegra.

> Ver el portafolio de proyectos activos en [`docs/PROYECTOS.md`](./PROYECTOS.md).

---

## 7. Marco regulatorio aplicable

- **MiCA** (UE) — clasificación de tokens (EMT, ART, UTILITY, SECURITY).
- **Reg D 506(c)** (EE.UU.) — colocación privada con verificación de inversores
  acreditados.
- **Reg S** (EE.UU.) — oferta fuera de territorio estadounidense.
- **KYC/AML** local según jurisdicción del proyecto.

---

Copyright ®NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872 — TODOS LOS DERECHOS RESERVADOS 2025-2026
