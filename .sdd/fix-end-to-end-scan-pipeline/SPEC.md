# Spec: Fix End-to-End Scan Pipeline

**Change**: fix-end-to-end-scan-pipeline
**Based on**: Proposal `sdd/fix-end-to-end-scan-pipeline/proposal`

## 1. Orchestrator Healthcheck — start_period 60s → 180s

### Requirements
- The `scaner-orchestrator-service` container has a `start_period: 60s` in `docker-compose.local.yml`
- Actual startup time is ~157s, causing healthcheck failures and restart loops
- Increase start_period to 180s to match real startup time

### File to Modify
`docker-compose.local.yml` line 722: `start_period: 60s` → `start_period: 180s`

### Acceptance Criteria
- [ ] Orchestrator does not restart during its ~157s startup
- [ ] Healthcheck starts passing after service fully starts
- [ ] No "unhealthy" status transitions during startup

---

## 2. Security Gate → Orchestrator Result Callback

### Current State (Broken)

The full data flow currently has three broken paths:

**Path A — Security Gate publishes to `sentinel.scan.results`:**
- Security Gate `ScanController.ReceiveScanResult` (POST `/api/scan/webhook/result`) receives results from n8n
- Publishes to `sentinel.scan.results` exchange via `RabbitMqService.PublishScanResultAsync`
- Security Gate's own `ScanResultListener` picks this up from `sentinel.scan.results` queue
- **Problem**: `ScanResultListener.ProcessScanResultAsync` tries to POST to `JavaBFF:WebhookUrl` (config key not set in docker-compose) — nothing happens
- **Problem**: Neither orchestrator status update NOR BFF notification occurs

**Path B — Orchestrator ScanListener listens for completion events:**
- Orchestrator's `RabbitMQConfig` declares queue `scan.orchestrator.events` bound to `sentinel.scan.requests` with routing keys `scan.completed.#`, `scan.failed.#`, `scan.progress.#`
- `ScanListener.handleScanEvent` processes these and updates `ScanJob` status
- **Problem**: Nobody publishes `scan.completed.*` events to `sentinel.scan.requests` — Security Gate publishes results to `sentinel.scan.results` instead

**Path C — Results Aggregator Feign client wrong path:**
- Results Aggregator's `ScanResultListener` receives from `sentinel.scan.results` queue (routing key `scan.*.completed`)
- Calls `ResultsService.processScanResult` which saves to MongoDB and calls `orchestratorClient.updateScanStatus()`
- **Problem**: `ScanOrchestratorClient` Feign client calls `PUT /api/scans/{id}/status` but orchestrator only has `PUT /api/internal/scans/{scanId}/status` in `InternalScanController`

### Requirements

#### 2.1 Security Gate `ScanResultListener.ProcessScanResultAsync` — add orchestrator callback

After the BFF webhook notification (or if webhook URL is empty/attempt fails), Security Gate must call the orchestrator's internal endpoint to mark the scan as COMPLETED.

- **Endpoint**: `POST /api/internal/scans/{scanId}/results` (already exists in `InternalScanController.submitResults`)
- **Payload**: `{ "status": "COMPLETED" }` plus any findings summary derived from `scanResult.Findings`
- **Config**: Already available as `ScannerOrchestrator:UpdateResultsEndpoint` = `/api/internal/scans/{scanId}/results` in `appsettings.json`
- **Implementation**: Direct HTTP call via `IHttpClientFactory` (same pattern already used for BFF webhook)
- **Error handling**: Log error, do NOT throw (don't NACK the RabbitMQ message for this; the result is already persisted)

#### 2.2 Results Aggregator `ScanOrchestratorClient` — fix URL path

- Change `@PutMapping("/api/scans/{id}/status")` to `@PutMapping("/api/internal/scans/{id}/status")`

#### 2.3 Orchestrator `ScanListener` — verify queue binding handles completion events

- The `RabbitMQConfig` already binds `scan.orchestrator.events` queue to `sentinel.scan.requests` with `scan.completed.#`
- No code change needed if Security Gate publishes to `sentinel.scan.requests`

**Decision**: The spec requires Security Gate to call orchestrator's HTTP endpoint directly (2.1), which is the most reliable path. The Results Aggregator fix (2.2) is restorative. The RabbitMQ event path (2.3) is verified as correct.

### Files to Modify

| File | Change |
|------|--------|
| `Sentinel.SeurityGate.Service/BackgroundServices/ScanResultListener.cs` | Add orchestrator HTTP callback after BFF webhook |
| `results-aggregator-service/src/main/java/com/sentinel/results_aggregator_service/client/ScanOrchestratorClient.java` | Fix URL path from `/api/scans` to `/api/internal/scans` |

### Acceptance Criteria

- [ ] n8n posts scan result to Security Gate → status propagates to orchestrator
- [ ] Scan transitions from RUNNING → COMPLETED (not auto-timeout)
- [ ] Orchestrator `ScanJob` has `finishedAt` set to actual completion time
- [ ] Results Aggregator receives scan result event and persists to MongoDB
- [ ] Results Aggregator updates orchestrator status successfully (no 404 on wrong path)

---

## 3. BFF Webhook Endpoint for Security Gate Results

### Current State

Security Gate's `appsettings.json` has:
```json
"JavaBFF": {
  "WebhookUrl": null
}
```

And `ScanResultListener.ProcessScanResultAsync` reads `configuration["JavaBFF:WebhookUrl"]` — but this is not set in `docker-compose.local.yml`, so the BFF notification is skipped entirely.

### Requirements

#### 3.1 Add BFF endpoint `POST /api/bff/scans/webhook`

Create a new endpoint in BFF that accepts scan result notifications from Security Gate.

- **Path**: `POST /api/bff/scans/webhook`
- **Already registered in Kong**: `/api/bff/scans` prefix covers this (existing route `bff-scans`)
- **Method**: `POST`
- **Authentication**: Internal — use a shared secret header `X-Webhook-Secret` or trust internal network
- **Request body** (JSON):

```json
{
  "scanId": "uuid",
  "status": "COMPLETED",
  "qualityGatePassed": true,
  "completedAt": "2026-06-23T15:30:00Z",
  "summary": {
    "critical": 2,
    "high": 5,
    "medium": 3,
    "low": 1,
    "total": 11
  }
}
```

- **Response**: `200 OK { "received": true }`
- **Implementation**: Add a new method in `ScanController` + `ScanService`/`ScanServiceImpl`
- **Side effects**: After receiving webhook, BFF should optionally update scan status via `OrchestratorClient` (or this can remain a Security Gate responsibility per 2.1)

#### 3.2 Set `JavaBFF:WebhookUrl` in docker-compose.local.yml

Add environment variable to `security-gate-service` in `docker-compose.local.yml`:
```yaml
JavaBFF__WebhookUrl: http://backend-for-frontend-service:8080/api/bff/scans/webhook
```

### Files to Modify/Add

| File | Change |
|------|--------|
| `backend-for-frontend-service/src/main/java/.../controller/ScanController.java` | Add `POST /webhook` endpoint |
| `backend-for-frontend-service/src/main/java/.../service/ScanService.java` | Add `processWebhookNotification()` method signature |
| `backend-for-frontend-service/src/main/java/.../service/impl/ScanServiceImpl.java` | Implement webhook processing |
| `docker-compose.local.yml` | Add `JavaBFF__WebhookUrl` to security-gate-service env |

### Acceptance Criteria

- [ ] `POST /api/bff/scans/webhook` returns 200 with valid payload
- [ ] Security Gate `ScanResultListener` successfully POSTs to BFF and logs "Notificación enviada al Java BFF"
- [ ] Scan status is updated (either via BFF or via Security Gate → orchestrator callback)

---

## 4. Results Aggregator — Real Data Flow

### Current State

- Results Aggregator `ScanResultListener` listens on `sentinel.scan.results` exchange, queue `scan.results.aggregator`, routing key `scan.*.completed`
- `ResultsService.processScanResult()` correctly saves to MongoDB and tries to update orchestrator (currently broken due to wrong path)
- `ResultsController.getScanResult(UUID scanId)` returns `ScanResult` from MongoDB
- Semgrep runner (`runner.py`) saves JSON results to shared volume `/mnt/semgrep/results/{scanId}.json`

### Requirements

#### 4.1 Ensure n8n correctly routes semgrep findings

- n8n workflow `Notify Scanner Service` node calls SAST → `http://code-quality-service:5001/api/n8n/semgrep/result-ready`
- Code Quality Service (`.NET`) processes semgrep JSON, publishes results to `sentinel.scan.results` exchange
- Verify the complete chain: semgrep-runner → Code Quality Service → Results Aggregator → MongoDB

#### 4.2 Verify semgrep-runner output consumable by Code Quality Service

- Semgrep runner produces JSON at `/mnt/semgrep/results/{scanId}.json`
- Format: standard Semgrep JSON output with `results[]` array containing `check_id`, `path`, `start.line`, `extra.severity`, `extra.message`, etc.
- Code Quality Service must read this file and convert to `ScanResult` event for publishing

#### 4.3 Results Aggregator `ScanResult` schema alignment

- MongoDB document `ScanResult` has `findings: List<Vulnerability>`
- `Vulnerability` has: `ruleId`, `severity`, `description`, `file`, `line`, `codeSnippet`, `remediation`
- Semgrep JSON `results[].extra.severity` maps to either `HIGH`, `MEDIUM`, or `LOW`
- **Risk**: severity mapping mismatch — semgrep uses `WARNING`, `ERROR` while Vulnerability expects `HIGH`/`MEDIUM`/`LOW`
- **Mitigation**: Code Quality Service must normalize severity values

### Acceptance Criteria

- [ ] Completed scan returns findings from `GET /api/bff/scans/{scanId}/results`
- [ ] Frontend vulnerability count matches semgrep findings
- [ ] Results Aggregator MongoDB has non-empty `scan_results` collection for completed scans

---

## 5. Full Service Startup

### Requirements

#### 5.1 All 13+ services start and pass healthchecks

Services in `docker-compose.local.yml`:

| # | Service | Container Name | Healthcheck | start_period |
|---|---------|---------------|-------------|-------------|
| 1 | postgres | sentinel-postgres | pg_isready | 10s |
| 2 | mongodb | sentinel-mongodb | (mongosh) | 15s |
| 3 | rabbitmq | sentinel-rabbitmq | rabbitmq-diagnostics | 20s |
| 4 | semgrep-runner | sentinel-semgrep-runner | curl :5100/health | 90s |
| 5 | n8n | sentinel-n8n | wget :5678/healthz | 30s |
| 6 | kong-db | sentinel-kong-db | pg_isready | 10s |
| 7 | kong-migration | sentinel-kong-migration-local | — (one-shot) | — |
| 8 | kong | sentinel-kong | wget :8001/status | 20s |
| 9 | konga-db | sentinel-konga-db | pg_isready | 10s |
| 10 | konga | sentinel-konga | wget :1337 | 30s |
| 11 | mailhog | sentinel-mailhog | — | — |
| 12 | auth-service | sentinel-auth-service | curl :8081/actuator/health | 60s |
| 13 | tenant-service | sentinel-tenant-service | curl :8082/actuator/health | 60s |
| 14 | project-service | sentinel-project-service | curl :8083/actuator/health | 60s |
| 15 | user-management-service | sentinel-user-management | curl :8083/actuator/health | 60s |
| 16 | billing-service | sentinel-billing | curl :8084/actuator/health | 60s |
| 17 | BFF | sentinel-bff-service | curl :8080/actuator/health | 60s |
| 18 | orchestrator | sentinel-scaner-orchestrator | curl :8086/actuator/health | **180s** (was 60s) |
| 19 | results-aggregator | sentinel-results-aggregator | curl :8087/actuator/health | 60s |
| 20 | security-gate | sentinel-security-gate | curl :5001/health | 20s |
| 21 | code-quality | sentinel-code-quality | curl :5001/health | 20s |
| 22 | vulnerability | sentinel-vulnerability | curl :5001/health | 20s |
| 23 | frontend | sentinel-front | wget :80/ | 10s |

#### 5.2 kong-migration completes before kong starts

Already correct: `kong` has `depends_on: kong-migration: condition: service_completed_successfully`

#### 5.3 All Java services connect to shared `sentinel_db`

All use `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/sentinel_db` — verified consistent.

### Acceptance Criteria

- [ ] `docker compose -f docker-compose.local.yml --env-file .env.local up -d --build` exits with code 0
- [ ] After 5 minutes, `docker compose ps` shows all 23 containers as `healthy`
- [ ] No service restarts due to healthcheck failure (check `docker compose logs <service>` for restart messages)

---

## 6. n8n Workflow Cleanup

### Current State

- git-tracked workflow files in `n8n-workflows/`: `scan-trigger-workflow.json`, `payment-success-notification.json`, `tenant-created-notification.json`, `user-registration-email.json`
- `scan-trigger-workflow.json` uses RabbitMQ trigger (queue `scan-events-queue`) not HTTP webhook
- Security Gate `HttpScanOrchestrator` calls n8n HTTP webhook URLs (`/webhook/scan-sast`, `/webhook/scan-dast`)
- **Mismatch**: n8n workflow uses RabbitMQ trigger but Security Gate expects webhook trigger

### Requirements

#### 6.1 Investigate and reconcile n8n trigger mode

- Determine if the n8n running instance has webhook-triggered workflows (stored in `n8n_data` volume) that are not in git
- If git-tracked `scan-trigger-workflow.json` is a RabbitMQ workflow but webhook workflows exist only in the volume:
  - Export webhook workflows from running n8n and add to `n8n-workflows/` for reproducibility
  - OR modify `scan-trigger-workflow.json` to be webhook-triggered instead of RabbitMQ (and remove duplicate)

#### 6.2 Remove duplicate SAST workflow if found

- Check n8n instance via API or web UI for duplicate SAST workflow names
- Remove duplicates via n8n API or manually through web UI

#### 6.3 Verify webhook endpoints match Security Gate expectations

Security Gate expects these webhook paths (from `GetN8nWebhookUrl`):

| Scan Type | Expected n8n Webhook |
|-----------|---------------------|
| SAST / FULL_SAST | `/webhook/scan-sast` |
| DAST / DAST_BASIC | `/webhook/scan-dast` |
| PORTS_SCAN | `/webhook/scan-ports` |
| SECRETS_SCAN | `/webhook/scan-secrets` |
| CONTAINER | `/webhook/scan-container` |

n8n natively routes webhook requests to active workflows with matching paths.

#### 6.4 Update n8n config in Security Gate appsettings.json for local dev

Default `appsettings.json` hardcodes production URLs:
```json
"N8n": {
  "BaseUrl": "https://n8n.laziness.crudzaso.com",
  "Webhooks": {
    "Sast": "https://n8n.laziness.crudzaso.co/webhook-test/scan-sast",
    ...
  }
}
```

Docker compose overrides this with `N8n__BaseUrl: http://n8n:5678`. This is correct for local dev — no change needed.

### Acceptance Criteria

- [ ] Running `GET http://n8n:5678/rest/workflows` returns exactly 1 SAST workflow (no duplicates)
- [ ] n8n has active webhook workflows at paths `/webhook/scan-sast` and `/webhook/scan-dast`
- [ ] Security Gate `HttpScanOrchestrator` successfully POSTs to n8n webhook and gets 200 response
- [ ] Scan starts processing (scan transitions PENDING → RUNNING with non-null `startedAt`)

---

## Summary of All Changes

| # | Area | Files Changed | Type |
|---|------|-------------|------|
| 1 | Orchestrator healthcheck | `docker-compose.local.yml` | Config (start_period 60→180s) |
| 2.1 | Security Gate orchestrator callback | `ScanResultListener.cs` | Code (HTTP call to orchestrator) |
| 2.2 | Results Aggregator Feign path | `ScanOrchestratorClient.java` | Code (fix URL path) |
| 3.1 | BFF webhook endpoint | `ScanController.java`, `ScanService.java`, `ScanServiceImpl.java` | Code (new endpoint) |
| 3.2 | Security Gate BFF webhook URL | `docker-compose.local.yml` | Config (new env var) |
| 4 | Results + semgrep data flow | Verify only | Investigation |
| 5 | Full startup verification | None | Test |
| 6 | n8n workflow cleanup | n8n workflow files | Investigation + cleanup |

## Scenarios

### Scenario A: Happy Path — Full Scan Lifecycle

1. User logs in via frontend at `localhost:3000`
2. User creates a project
3. User selects project and triggers a SAST scan
4. Frontend POSTs to `POST /api/bff/scans/request`
5. BFF forwards to orchestrator at `POST /api/scans`
6. Orchestrator creates ScanJob (PENDING), publishes to RabbitMQ `sentinel.scan.requests`
7. Orchestrator auto-progresses PENDING → RUNNING within 15s
8. Security Gate receives scan request via RabbitMQ
9. Security Gate calls n8n webhook `/webhook/scan-sast`
10. n8n triggers semgrep-runner via HTTP POST to `http://semgrep-runner:5100/scan`
11. Semgrep runner clones repo, runs semgrep, saves JSON to shared volume
12. n8n sends results to Security Gate `POST /api/scan/webhook/result`
13. Security Gate publishes to `sentinel.scan.results` exchange
14. Security Gate's `ScanResultListener` receives result
15. ScanResultListener POSTs to BFF webhook `POST /api/bff/scans/webhook` — **NEW**
16. ScanResultListener POSTs to orchestrator `POST /api/internal/scans/{scanId}/results` — **NEW**
17. Orchestrator marks ScanJob COMPLETED with finishedAt set
18. Results Aggregator receives result, saves to MongoDB
19. Frontend polls `GET /api/bff/scans/{scanId}` → status shows COMPLETED
20. Frontend calls `GET /api/bff/scans/{scanId}/results` → returns real findings

### Scenario B: n8n Unavailable

1. Steps 1-7 same as Scenario A
2. Security Gate tries to call n8n webhook
3. n8n is down → `HttpScanOrchestrator.StartScanWorkflowAsync` throws
4. Security Gate logs error, throws → RabbitMQ NACKs the request message
5. Orchestrator's `autoProgressScans` eventually auto-completes after 300s
6. **Expected**: Scan shows COMPLETED with no findings (existing fallback preserved)

### Scenario C: Security Gate Down

1. Steps 1-7 same as Scenario A
2. Orchestrator publishes to RabbitMQ but Security Gate is down
3. RabbitMQ holds the message (durable queue)
4. Security Gate comes back up, receives unprocessed message
5. **Expected**: Scan processes normally with slight delay

### Scenario D: BFF Webhook Unreachable

1. Steps 1-13 same as Scenario A
2. ScanResultListener POSTs to BFF webhook, gets connection error
3. Code logs warning (not error), continues to orchestrator callback
4. ScanResultListener POSTs to orchestrator successfully
5. **Expected**: Scan completes normally, BFF notification is optional

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| n8n has different trigger workflows in volume vs git | Medium | Export workflows from running n8n, reconcile in spec |
| Severity mapping mismatch (semgrep WARNING → HIGH/MEDIUM/LOW) | Medium | Code Quality Service must normalize; verify during implementation |
| Orchestrator OOM with 256MB limit | Low | Monitor after fix; increase to 384MB if needed |
| Internal endpoint `/api/internal/scans/{scanId}/results` requires auth header | Low | Verify `InternalScanController` has no security annotation (it's an internal endpoint) |
| Security Gate's secret redaction in logs may hide useful debug info | Low | Acceptable tradeoff for security |
