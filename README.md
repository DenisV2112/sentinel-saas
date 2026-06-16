# Sentinel — Multi-Service SaaS Security Scanner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-17-%23ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4-%236DB33F?logo=spring&logoColor=white)](https://spring.io/projects/spring-boot)
[![.NET](https://img.shields.io/badge/.NET-8-%23512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-%2361DAFB?logo=react&logoColor=white)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-%234169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-%2347A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3-%23FF6600?logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Kong](https://img.shields.io/badge/API_Gateway-Kong-%2300354F?logo=kong&logoColor=white)](https://konghq.com/)

**Sentinel** is a production-grade, multi-service security scanning platform built on a microservices architecture. It orchestrates SAST (Static Application Security Testing), DAST (Dynamic Application Security Testing), code quality analysis, and vulnerability scanning across your applications — all through a unified dashboard.

> Three language stacks, 12 microservices, one shared PostgreSQL database, and a React SPA frontend — all routing through Kong API Gateway.

---

## Architecture Overview

```
                          ┌─────────────────────────────┐
                          │       React SPA (React 19)   │
                          │       Vite 7 · Bulma · TS    │
                          └──────────────┬──────────────┘
                                         │ :3000
                          ┌──────────────▼──────────────┐
                          │   Kong API Gateway (:8000)   │
                          │    Konga Admin UI (:1337)    │
                          └──────────────┬──────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
     ┌────────▼────────┐       ┌────────▼────────┐       ┌────────▼────────┐
     │  Java Backend   │       │   .NET Backend   │       │   Automation   │
     │  8 services     │       │  3 services       │       │  n8n (:5678)   │
     │  Spring Boot 3.4│       │  ASP.NET Core 8   │       │  Semgrep Runner│
     │  Java 17 / Maven│       │                  │       │  (:5100)       │
     └────────┬────────┘       └────────┬────────┘       └────────┬────────┘
              │                          │                        │
              └──────────────────────────┼────────────────────────┘
                                         │
                          ┌──────────────▼──────────────┐
                          │    Message Queue (RabbitMQ)  │
                          │      PostgreSQL 15 / MongoDB │
                          └─────────────────────────────┘
```

**Data flow:** Frontend → Kong (`:8000`) → BFF (`:8080`) aggregates auth, tenant, project, billing, and scan data. Scanner services receive scan jobs via RabbitMQ from the orchestrator, process them, and publish results back. n8n workflows orchestrate automated SAST/DAST pipelines.

---

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | React 19, Vite 7, TypeScript, Bulma | SPA served by nginx, calls Kong at `:8000/api/*` |
| **Java Backend (8 services)** | Spring Boot 3.4, Java 17, Maven | Shared PostgreSQL 15 (`sentinel_db`) |
| **.NET Backend (3 services)** | .NET 8, ASP.NET Core | All listen on port 5001 internally |
| **Database** | PostgreSQL 15, MongoDB 7 | App + Kong data + BFF cache |
| **Message Broker** | RabbitMQ 3-management | Async job distribution |
| **API Gateway** | Kong (alpine) + Konga | Route management, CORS, rate limiting |
| **Automation** | n8n, Semgrep Runner | SAST/DAST workflow automation |
| **CI/CD** | GitHub Actions | Deploy to VPS via SSH |

### Frontend Dependencies

| Package | Purpose |
|---------|---------|
| `react-router-dom` | SPA routing |
| `axios` | HTTP client |
| `bulma` | CSS framework |
| `framer-motion` | Animations |
| `lucide-react` | Icons |
| `react-i18next` | Internationalization |
| `@mercadopago/sdk-react` | Payment processing |

---

## Service Inventory

### Java Microservices (Spring Boot 3.4)

| Service | Port | Path in Kong | Responsibility |
|---------|------|-------------|----------------|
| **Backend-for-Frontend (BFF)** | `:8080` | `/api/bff/*` | Aggregation layer — auth, tenants, projects, billing, scans, users, analytics |
| **Auth Service** | `:8081` | `/api/auth/*` | JWT auth, OAuth2 (Google), registration, login |
| **Tenant Service** | `:8082` | `/api/tenants/*` | Multi-tenant management, user limits |
| **Project Service** | `:8083` | `/api/projects/*` | CRUD for scanned projects |
| **Billing Service** | `:8084` | `/api/billing/*`, `/api/plans/*`, `/api/subscriptions/*` | MercadoPago integration, plan management |
| **Orchestrator Service** | `:8086` | `/api/scans/*`, `/api/orchestrator/*` | Scan job lifecycle management via RabbitMQ |
| **Results Aggregator** | `:8087` | `/api/results/*` | Aggregates scan findings, uses MongoDB for caching |
| **User Management** | `:8088` → `:8083` | `/api/users/*` | User CRUD, invitations, notifications |

### .NET Microservices (ASP.NET Core 8)

| Service | Port | Responsibility |
|---------|------|----------------|
| **Security Gate** | `:5001` | Policy enforcement, n8n workflow triggers |
| **Code Quality** | `:5002` → `:5001` | Semgrep-based SAST analysis |
| **Vulnerability** | `:5003` → `:5001` | CVE lookup, vulnerability detection |

### Infrastructure

| Service | Port | Purpose |
|---------|------|---------|
| **Kong** | `:8000` / `:8001` | API Gateway proxy + admin |
| **Konga** | `:1337` | Kong admin UI |
| **n8n** | `:5678` | Workflow automation |
| **RabbitMQ** | `:5672` / `:15672` | Message broker + management UI |
| **MailHog** | `:1025` / `:8025` | Local SMTP mock + web UI |
| **Semgrep Runner** | `:5100` | SAST scan execution engine |

---

## Features

- **🔐 Authentication & Authorization** — JWT-based auth with OAuth2 (Google) support, role-based access control
- **🏢 Multi-Tenant** — Complete tenant isolation with user limits per plan
- **📊 Scan Orchestration** — Create, schedule, and monitor security scans via RabbitMQ-driven pipeline
- **🔍 SAST Scanning** — Static code analysis via Semgrep runner, integrated with n8n workflows
- **🛡️ DAST Scanning** — Dynamic security testing for live web applications
- **⚙️ Vulnerability Assessment** — CVE matching and severity scoring
- **📈 Code Quality Analysis** — Automated code quality gates
- **💳 Billing & Plans** — MercadoPago integration with subscription tier management
- **📋 Results Aggregation** — Unified view of findings across all scan types
- **🤖 Workflow Automation** — n8n-powered automated pipelines for SAST, DAST, notifications
- **🌐 Internationalization** — react-i18next for multi-language support

---

## Quick Start

### Prerequisites

- Docker & Docker Compose (with WSL2 backend on Windows)
- Node.js 18+ (for frontend standalone development)
- .NET 8 SDK (for C# services)
- JDK 17 + Maven (for Java services)

### Local Development (Full Stack)

```bash
# Start everything
docker compose -f docker-compose.local.yml --env-file .env.local up -d --build

# Check status
docker compose -f docker-compose.local.yml ps

# View logs
docker compose -f docker-compose.local.yml logs -f

# Stop
docker compose -f docker-compose.local.yml down
```

### Frontend Standalone (Hot Reload)

```bash
cd sentinel_front
npm install
npm run dev   # starts on :5173
```

### Run Tests

```bash
# Java (all services)
cd auth-service-java && mvn test

# .NET
cd Sentinel.CodeQuality.Service && dotnet test

# Frontend (Jest 29 + @testing-library/react)
cd sentinel_front && npm test && npm run lint
```

---

## Docker Compose Files

| File | Environment | Key Characteristics |
|------|-------------|---------------------|
| `docker-compose.local.yml` | Local dev | Exposed ports, MailHog, healthchecks, `mongo:7`, JVM with reduced memory |
| `docker-compose.yml` | CI / Base | Hardcoded dev credentials, `logging: driver: "none"`, `mongo:latest` |
| `docker-compose.prod.yml` | Production | All values from env vars, no exposed infra ports, `restart: always` |

> **Important:** Always use `SPRING_PROFILES_ACTIVE=local` in Docker. The default profile has incorrect service discovery hostnames.

---

## Project Structure

```
sentinel-deployment-main/
├── API-Gateway/                    # Kong configuration (kong.yml)
├── auth-service-java/              # Java — Auth service
├── Billings/                       # Java — Billing service with MercadoPago
├── backend-for-frontend-service/   # Java — BFF aggregation layer
├── project-service/                # Java — Project management
├── results-aggregator-service/     # Java — Scan results aggregation
├── scaner-orchestrator-service/    # Java — Scan job orchestrator
├── tenant-service/                 # Java — Multi-tenant management
├── user-management-service/        # Java — User CRUD
├── sentinel_front/                 # React SPA (TypeScript, Vite, Bulma)
│   └── src/
│       ├── api/                    # API client modules
│       ├── components/             # Reusable components
│       ├── hooks/                  # Custom React hooks
│       ├── ui/components/          # UI-specific components
│       ├── ui/pages/               # Page components
│       ├── store/                  # State management
│       └── services/              # Business logic
├── Sentinel.SeurityGate.Service/   # .NET — Security gate
├── Sentinel.CodeQuality.Service/   # .NET — Code quality analysis
├── Sentinel.Vulnerability.Service/ # .NET — Vulnerability scanning
├── semgrep-runner/                 # Python — Semgrep SAST engine
├── n8n-workflows/                  # Pre-configured n8n automation workflows
├── docker-compose.local.yml        # Local development compose
├── docker-compose.yml              # Base compose (used by CI)
└── docker-compose.prod.yml         # Production compose
```

---

## Statistics

| Metric | Value |
|--------|-------|
| **Microservices** | 12 (8 Java + 3 .NET + 1 Python runner) |
| **Infrastructure services** | 9 (PostgreSQL × 2, MongoDB, RabbitMQ, Kong × 2, Konga, n8n, MailHog) |
| **Total Docker containers** | 22 |
| **Java classes** | 385 |
| **C# classes** | 73 |
| **TypeScript / React files** | 61 |
| **Dockerfiles** | 14 |
| **Java tests** | 21 |
| **Frontend tests** | 7 (Jest + @testing-library/react) |
| **Git commits** | 24 |
| **Total repository size** | ~250 MB |
| **CI/CD workflows** | 1 (GitHub Actions → VPS deploy) |

---

## CI/CD Pipeline

- **Trigger:** Push to `master` or manual `workflow_dispatch`
- **Deployment target:** VPS at `/home/samuel/sentinel-deployment` via SSH
- **Deployment strategy:** `git reset --hard origin/main` → `docker compose build --no-cache` → `up -d`
- **Health check:** Curls frontend and API after 30s wait
- **Required secrets:** `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY`
- **Production URLs:** [sentinel.crudzaso.com](https://sentinel.crudzaso.com) | [service.sentinel.crudzaso.com](https://service.sentinel.crudzaso.com)

---

## Known Gotchas

- **Directory naming quirks:** `scaner-orchestrator-service/` (not "scanner"), `Billings/` (capital B, no suffix), `Sentinel.SeurityGate.Service/` (not "Security") — baked into Docker contexts, Java packages, and CI
- **JWT secret must be identical** across all services — mismatches cause silent auth failures
- **Frontend env vars are build-time** — `VITE_API_URL` and `VITE_MERCADOPAGO_PUBLIC_KEY` are baked into the JS bundle at build time
- **All Java services share one PostgreSQL database** (`sentinel_db`) — no per-service databases
- **C# services all listen on port 5001 internally** — Docker maps 5001→5001, 5002→5001, 5003→5001
- **Service discovery is wrong in default `application.properties`** — always use `local` profile in Docker

---

## API Routes (via Kong)

| Prefix | Backend Service |
|--------|----------------|
| `/api/bff/*` | BFF (aggregates all data) |
| `/api/auth/*` | Auth Service |
| `/api/tenants/*` | Tenant Service |
| `/api/projects/*` | Project Service |
| `/api/billing/*`, `/api/plans/*`, `/api/subscriptions/*` | Billing Service |
| `/api/scans/*`, `/api/orchestrator/*` | Scan Orchestrator |
| `/api/results/*` | Results Aggregator |
| `/api/users/*` | User Management |
| `/api/security-gate/*` | .NET Security Gate |
| `/api/code-quality/*` | .NET Code Quality |
| `/api/vulnerabilities/*` | .NET Vulnerability |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/denissanchez">Denis Sanchez</a>
</p>
