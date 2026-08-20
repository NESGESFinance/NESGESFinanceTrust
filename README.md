# NESGESFinanceTrust

Infraestructura técnica para consultar datos de Bitcoin, indexar Runes y Ordinals, y registrar activos del mundo real (RWA) en el ecosistema NESGESFinance.

> Versión de desarrollo: `3.4.0-dev` · Plataforma: `nesgesfinancetrust.com`

## Alcance

- Consultas de bloques indexados y datos de mempool.
- API REST y WebSocket para actualizaciones de la plataforma.
- Indexación de Runes e inscripciones Ordinals.
- Registro RWA con historial de eventos y validaciones configurables de KYC/AML.

La plataforma no sustituye la debida diligencia, el asesoramiento financiero ni la revisión legal. La existencia de un registro técnico no acredita por sí sola propiedad, valor, transferibilidad ni cumplimiento normativo de un activo.

## Arquitectura

```text
Bitcoin Core RPC o Esplora → indexadores TypeScript → MariaDB + Redis
                                              ├── API REST (/api)
                                              └── WebSocket (/ws)
Frontend estático HTML/CSS/JavaScript ←─────────────────────────────┘
```

Consulta el diseño en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) y los contratos en [docs/API.md](docs/API.md).

## Requisitos

- Node.js 20 o superior y npm 10 o superior.
- MariaDB 10.11 o MySQL 8.
- Redis 7.
- Bitcoin Core mediante JSON-RPC o un servicio Esplora compatible.

## Desarrollo local

```bash
npm ci
cp .env.example .env
# Completa las credenciales y el backend de Bitcoin en .env
npm run build
npm start
```

Para desarrollo: `npm run dev`. El backend escucha en `http://localhost:3000` y publica la API bajo `/api` por defecto. El frontend estático está en `frontend/`; configúralo con el mismo origen que el backend o define `window.NESGES_API_BASE` y `window.NESGES_WS_URL` antes de cargar `assets/js/app.js`.

## Contenedores

El repositorio incluye `backend/Dockerfile`, archivos Nginx y `docker-compose.yml` para ejecutar el conjunto localmente:

```bash
cp .env.example .env
# Cambia DATABASE_PASSWORD, credenciales y valores de producción.
docker compose up --build
```

No expongas MariaDB ni Redis a redes públicas en producción. Ajusta también `nginx/proxy.conf` para TLS y el nombre de host que corresponda a tu entorno.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run build` | Compila TypeScript en `dist/`. |
| `npm start` | Inicia el backend compilado. |
| `npm run dev` | Inicia el backend con recarga. |
| `npm run typecheck` | Comprueba tipos sin emitir archivos. |
| `npm run lint` | Ejecuta ESLint sobre el backend. |
| `npm test` | Ejecuta las pruebas Jest. |
| `npm run migrate` | Ejecuta el script de migración compilado. |

## Documentación

- [API REST y WebSocket](docs/API.md)
- [Arquitectura](docs/ARQUITECTURA.md)
- [Controles de cumplimiento](docs/COMPLIANCE.md)
- [Protocolo Runes](docs/RUNES_PROTOCOL.md)
- [Protocolo Ordinals](docs/ORDINALS_PROTOCOL.md)

Los PDF y DOCX existentes son exportaciones históricas. Los archivos Markdown son la fuente editable vigente; regenera los documentos distribuidos desde ellos antes de publicar una versión formal.

## Licencia y contacto

Copyright ® NESGESFinance Ecosystem S.A.S. BIC. & LLC. EIN: 0008086872. Todos los derechos reservados, 2025–2026.
