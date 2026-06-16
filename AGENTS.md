# Sentinel — Agent Instructions

## Architecture

Multi-service SaaS security scanner. Three language stacks share a Docker network (`sentinel-network`), communicate via RabbitMQ + direct HTTP, and all route through Kong API Gateway.

| Stack | Directory | Framework | Notes |
|-------|-----------|-----------|-------|
| Java (8 services) | `auth-service-java`, `tenant-service`, `project-service`, `user-management-service`, `Billings`, `backend-for-frontend-service`, `scaner-orchestrator-service`, `results-aggregator-service` | Spring Boot 3.4, Java 17, Maven | All share one PostgreSQL DB (`sentinel_db`) |
| .NET (3 services) | `Sentinel.SeurityGate.Service`, `Sentinel.CodeQuality.Service`, `Sentinel.Vulnerability.Service` | .NET 8, ASP.NET Core | All listen on port 5001 internally |
| Frontend | `sentinel_front` | React 19, Vite 7, Bulma, TypeScript | SPA served by nginx, calls Kong at `:8000/api/*` |

**Infrastructure:** PostgreSQL 15 (app + Kong), MongoDB 7, RabbitMQ 3-management, Kong API Gateway, Konga, n8n, MailHog (local only).

**Data flow:** Frontend → Kong (`:8000`) → BFF (`:8080`) aggregates auth, tenant, project, billing. Scanner services receive scan jobs via RabbitMQ from orchestrator, publish results back.

## Directory Naming Bugs (IMPORTANT)

These typos are baked into Docker build contexts, Java package names, and CI. Do NOT "fix" them without renaming everywhere:

- **`scaner-orchestrator-service/`** — typo: "scaner" not "scanner". Java package is `com.sentinel.scaner_orchestrator_service`.
- **`Billings/`** — inconsistent: capital B, plural, no `-service` suffix. All other Java services follow `xxx-service`.
- **`Sentinel.SeurityGate.Service/`** — typo: "Seurity" not "Security". This is the directory on disk.

## Commands

```bash
# Local dev (all services)
docker compose -f docker-compose.local.yml --env-file .env.local up -d --build
# Or: ./start-local.sh (WSL/Git Bash)

# Stop local
docker compose -f docker-compose.local.yml down

# Frontend standalone (hot-reload, port 5173)
cd sentinel_front && npm install && npm run dev

# Single Java service test
cd auth-service-java && mvn test
cd auth-service-java && mvn test -Dtest=SomeTestClass   # single class

# Single .NET service test
cd Sentinel.CodeQuality.Service && dotnet test

# Frontend test (Jest 29 + @testing-library/react)
cd sentinel_front && npm test

# Frontend lint
cd sentinel_front && npm run lint
```

Frontend uses Jest 29 + @testing-library/react with custom Vite transformer (`jest.transformer.cjs`). 2 test files: `App.test.tsx`, `useDashboard.test.tsx`. No E2E tests exist anywhere.

## Port Map

| Service | External | Internal | Gotcha |
|---------|----------|----------|--------|
| Frontend | 3000 | 80 | nginx in container |
| Kong proxy | 8000 | 8000 | Main API entrypoint |
| Kong admin | 8001 | 8001 | |
| Konga | 1337 | 1337 | Kong admin UI |
| BFF | 8080 | 8080 | |
| Auth | 8081 | 8081 | |
| Tenant | 8082 | 8082 | |
| Project | 8083 | 8083 | |
| Billing | 8084 | 8084 | |
| Orchestrator | 8086 | 8086 | |
| Results Aggregator | 8087 | 8087 | Also uses MongoDB |
| User Management | 8088 | 8083 | **App listens on 8083, mapped to 8088** |
| Security Gate | 5001 | 5001 | |
| Code Quality | 5002 | 5001 | Internal always 5001 |
| Vulnerability | 5003 | 5001 | Internal always 5001 |
| RabbitMQ mgmt | 15672 | 15672 | |
| n8n | 5678 | 5678 | |
| MailHog UI | 8025 | 8025 | Local dev only |

## Kong Routing

All frontend API calls hit `http://localhost:8000/api/*`. Kong routes to services by path prefix:

- `/api/bff/*` → BFF (aggregates auth, tenant, project, billing, scans, users, notifications, analytics)
- `/api/auth/*` → Auth Service
- `/api/tenants/*` → Tenant Service
- `/api/projects/*` → Project Service
- `/api/billing/*`, `/api/plans/*`, `/api/subscriptions/*`, `/api/payments-history/*` → Billing Service
- `/api/scans/*`, `/api/orchestrator/*` → Scan Orchestrator
- `/api/results/*` → Results Aggregator
- `/api/users/*` → User Management
- `/api/security-gate/*` → .NET Security Gate
- `/api/code-quality/*` → .NET Code Quality
- `/api/vulnerabilities/*` → .NET Vulnerability

Config file: `API-Gateway/kong.yml`. Kong CORS origins include `localhost:3000`, `localhost:3001`, `localhost:5173`, `localhost:5174`, `localhost:8000`.

## Critical Gotchas

### Service discovery is WRONG in default `application.properties`

The `local` profile has correct Docker container names. The default profile has **wrong** hostnames:

| Service | Default (WRONG) | Local profile (CORRECT) |
|---------|-----------------|-------------------------|
| Tenant | `http://sentinel-tenant-service:8082` | `http://tenant-service:8082` |
| User Mgmt | `http://sentinel-user-management:8085` | `http://user-management-service:8083` |

Always run with `SPRING_PROFILES_ACTIVE=local` in Docker. The default properties reference wrong container names AND a wrong port for user-management.

### All Java services share one database

Every Java service connects to `sentinel_db` on the same PostgreSQL instance. There are no per-service databases. Results Aggregator and BFF also connect to MongoDB for caching.

### JWT_SECRET must be identical everywhere

Hardcoded in local compose files (`X9q2N8ZCnO3Tj48p1Fk6B2V0x8Teq9gHBV0SX1e2p6U=`). Must be set via env var in production. If services have mismatched secrets, auth tokens will be rejected silently.

### Production CI uses base `docker-compose.yml`

The deploy workflow uses:
```yaml
docker-compose -f docker-compose.yml --env-file .env.production build --no-cache
docker-compose -f docker-compose.yml --env-file .env.production up -d
```

**NOT** `docker-compose.prod.yml`. The base compose has:
- Hardcoded dev credentials (`sentinel123`)
- `logging: driver: "none"` — production logs are discarded
- `mongo:latest` (unpinned, different from local's `mongo:7`)

`docker-compose.prod.yml` exists with proper env var substitution, `restart: always`, and no exposed infra ports — but it's not used by CI.

### Frontend env vars are build-time, not runtime

`VITE_API_URL` and `VITE_MERCADOPAGO_PUBLIC_KEY` are Docker build args baked into the JS bundle at build time. Changing them requires `docker compose build --no-cache`. They are NOT runtime environment variables.

### BFF has duplicate service URL env vars

In `docker-compose.local.yml`, BFF defines both `APP_SERVICES_AUTH-URL` (kebab) and `SERVICES_AUTH_URL` (underscore) for the same service. The Spring Boot property resolver handles both, but this is confusing if you need to add or change a service URL.

### Other gotchas

- **C# services**: All three listen on port `5001` internally. Docker maps 5001→5001, 5002→5001, 5003→5001. The `ASPNETCORE_URLS` env var is `http://+:5001`.
- **Kong migration**: One-shot container (`kong migrations bootstrap`) must complete before Kong starts.
- **`ddl-auto=update`** in local Docker compose — schema is auto-created. In production, use `validate` or migrations.
- **`docker-compose.yml.new`** at root — stale/draft file, ignore.
- **`add_logging_limits.py`** and **`add-logging.ps1`** — one-off scripts, not part of workflow.

## Frontend Structure

```
sentinel_front/src/
├── api/           # API client modules (axios.ts, auth.api.ts, etc.)
├── assets/        # Static assets (icons/, images/, styles/)
├── components/    # Reusable components (aliased as @components)
├── hooks/         # Custom React hooks (aliased as @hooks)
├── ui/
│   ├── components/ # UI-specific components (aliased as @components)
│   └── pages/     # Page components (aliased as @pages)
├── constants/     # App constants
├── helpers/       # Utility helpers
├── i18n/          # Internationalization (react-i18next)
├── store/         # State management
├── services/      # Business logic services
├── theme/         # Theme configuration
├── utils/         # General utilities
├── types/         # TypeScript type definitions
├── App.tsx
└── main.tsx
```

**Path aliases** are used extensively — defined in both `tsconfig.json` and `vite.config.js`:
`@`, `@assets`, `@icons`, `@images`, `@styles`, `@components`, `@pages`, `@constants`, `@helpers`, `@hooks`, `@i18n`, `@locales`, `@router`, `@services`, `@store`, `@theme`, `@utils`.

**Note:** `vite.config.js` is `.js`, NOT `.ts`. ESLint config only targets `.js`/`.jsx` files — `.ts`/`.tsx` are not linted.

## Compose Files

| File | Purpose | Key diffs |
|------|---------|-----------|
| `docker-compose.local.yml` | Local dev | Exposed ports, MailHog, healthchecks, `--env-file .env.local`, `mongo:7`, Java `-Xms64m -Xmx128m` |
| `docker-compose.yml` | Base / CI | Hardcoded dev creds, `logging: driver: "none"`, `mongo:latest`, Java `-Xms128m -Xmx256m` |
| `docker-compose.prod.yml` | Production proper | All values from env vars, no exposed infra ports, `restart: always`, `mongo:7` — **NOT USED BY CI** |

## CI/CD

- **Trigger:** push to `main` or manual `workflow_dispatch`
- **Deploys to VPS** at `/home/samuel/sentinel-deployment` via SSH
- **Workflow:** `git reset --hard origin/main` → `docker-compose build --no-cache` → `up -d`
- **Required secrets:** `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY`
- **Health check:** curls frontend and API after 30s wait
- **Production URLs:** Frontend `https://sentinel.crudzaso.com`, API `https://service.sentinel.crudzaso.com`

## Spring Profiles

| Profile | When | Key differences |
|---------|------|-----------------|
| `local` | `docker-compose.local.yml` | Correct container names, MailHog, `ddl-auto=validate`, lazy init, smaller Hikari pool |
| `docker` | Base `docker-compose.yml` | Hardcoded default props, wrong service discovery names |
| `prod` | Production | Should use env vars for all secrets, `ddl-auto` likely needs migration strategy |

Never run with the `docker` profile or no profile in Docker — service discovery URLs will be wrong.