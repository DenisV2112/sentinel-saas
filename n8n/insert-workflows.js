const Database = require('/tmp/node_modules/better-sqlite3');
const crypto = require('crypto');
const db = new Database('/home/node/.n8n/database.sqlite');

const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

// Get or create project
let project = db.prepare("SELECT id FROM project WHERE type = 'personal' LIMIT 1").get();
if (!project) {
  project = { id: crypto.randomUUID() };
  db.prepare("INSERT INTO project (id, name, type, createdAt, updatedAt) VALUES (?, 'Sentinel', 'personal', ?, ?)")
    .run(project.id, now, now);
}
console.log('Project:', project.id);

// Get user
const user = db.prepare("SELECT id FROM user LIMIT 1").get();
console.log('User:', user.id);

// ============================================================
// SAST WORKFLOW
// ============================================================
const sastId = crypto.randomUUID();
const sastWhId = crypto.randomUUID();
const sastSrId = crypto.randomUUID();
const sastNfId = crypto.randomUUID();
const sastWebhookId = crypto.randomUUID();
const sastVersionId = crypto.randomUUID();

const sastNodes = [
  {
    id: sastWhId, name: 'Webhook SAST', type: 'n8n-nodes-base.webhook', typeVersion: 2,
    position: [250, 300],
    parameters: { httpMethod: 'POST', path: 'scan-sast', responseMode: 'lastNode', options: {} },
    webhookId: sastWebhookId
  },
  {
    id: sastSrId, name: 'Call Semgrep Runner', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
    position: [650, 300],
    parameters: {
      method: 'POST',
      url: 'http://semgrep-runner:5100/scan',
      sendBody: true,
      bodyParameters: { parameters: [
        { name: 'scanId', value: '={{ $json.scanId }}' },
        { name: 'repoUrl', value: '={{ $json.repository.url }}' },
        { name: 'branch', value: '={{ $json.repository.branch }}' },
        { name: 'token', value: '={{ $json.repository.token }}' }
      ]},
      options: {}
    }
  },
  {
    id: sastNfId, name: 'Notify CodeQuality', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
    position: [1050, 300],
    parameters: {
      method: 'POST',
      url: 'http://code-quality-service:5001/api/n8n/semgrep/result-ready',
      sendBody: true,
      bodyParameters: { parameters: [
        { name: 'scanId', value: '={{ $json.scanId }}' },
        { name: 'filePath', value: '={{ $json.filePath }}' }
      ]},
      options: {}
    }
  }
];

const sastConnections = {
  [sastWhId]: { main: [[{ node: sastSrId, type: 'main', index: 0 }]] },
  [sastSrId]: { main: [[{ node: sastNfId, type: 'main', index: 0 }]] }
};

db.prepare(`INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, staticData, versionId, triggerCount, meta, createdAt, updatedAt, versionCounter)
  VALUES (?, ?, 1, ?, ?, '{"saveExecutionProgress":true}', '{}', ?, 0, '{}', ?, ?, 1)`)
  .run(sastId, 'Sentinel SAST Scan', JSON.stringify(sastNodes), JSON.stringify(sastConnections), sastVersionId, now, now);

// Webhook registration
db.prepare("INSERT INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength) VALUES (?, 'scan-sast', 'POST', ?, ?, 9)")
  .run(sastId, sastWhId, sastWebhookId);

// Link to project
db.prepare("INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt) VALUES (?, ?, 'workflow:owner', ?, ?)")
  .run(sastId, project.id, now, now);

// Workflow history
db.prepare(`INSERT INTO workflow_history (versionId, workflowId, authors, createdAt, updatedAt, nodes, connections, name, autosaved)
  VALUES (?, ?, '[{"id":"' || ? || '"}]', ?, ?, ?, ?, 'Sentinel SAST Scan', 0)`)
  .run(sastVersionId, sastId, user.id, now, now, JSON.stringify(sastNodes), JSON.stringify(sastConnections));

console.log('SAST workflow created:', sastId);

// ============================================================
// DAST WORKFLOW
// ============================================================
const dastId = crypto.randomUUID();
const dastWhId = crypto.randomUUID();
const dastScId = crypto.randomUUID();
const dastSvId = crypto.randomUUID();
const dastNfId = crypto.randomUUID();
const dastWebhookId = crypto.randomUUID();
const dastVersionId = crypto.randomUUID();

const dastNodes = [
  {
    id: dastWhId, name: 'Webhook DAST', type: 'n8n-nodes-base.webhook', typeVersion: 2,
    position: [250, 300],
    parameters: { httpMethod: 'POST', path: 'scan-dast', responseMode: 'lastNode', options: {} },
    webhookId: dastWebhookId
  },
  {
    id: dastScId, name: 'HTTP Security Scan', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
    position: [650, 300],
    parameters: {
      method: 'GET',
      url: '={{ $json.target.url }}',
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: 'Sentinel-DAST/1.0' }
      ]},
      options: { redirect: { redirect: { followRedirects: true } } }
    }
  },
  {
    id: dastSvId, name: 'Analyze Security', type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [1050, 300],
    parameters: {
      jsCode: [
        'const headers = $input.first().json.headers || {};',
        'const findings = [];',
        'const checks = [',
        '  ["strict-transport-security","HIGH","Missing HSTS header"],',
        '  ["content-security-policy","HIGH","Missing CSP header"],',
        '  ["x-content-type-options","MEDIUM","Missing X-Content-Type-Options"],',
        '  ["x-frame-options","MEDIUM","Missing X-Frame-Options"],',
        '  ["referrer-policy","LOW","Missing Referrer-Policy"]',
        '];',
        'for (const [h, sev, desc] of checks) {',
        '  if (!headers[h] && !headers[h.toLowerCase()]) findings.push({ title: desc, severity: sev, type: "MISSING_HEADER" });',
        '}',
        'const server = headers["server"] || headers["Server"];',
        'if (server && server.length > 3) findings.push({ title: "Server: " + server, severity: "LOW", type: "INFO_DISCLOSURE" });',
        'return { scanId: $input.first().json.scanId || "unknown", targetUrl: $input.first().json.target ? $input.first().json.target.url : "", findings: findings, totalFindings: findings.length, highCount: findings.filter(function(f) { return f.severity === "HIGH"; }).length, mediumCount: findings.filter(function(f) { return f.severity === "MEDIUM"; }).length, lowCount: findings.filter(function(f) { return f.severity === "LOW"; }).length };'
      ].join('\n')
    }
  },
  {
    id: dastNfId, name: 'Notify Vulnerability', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
    position: [1450, 300],
    parameters: {
      method: 'POST',
      url: 'http://vulnerability-service:5001/api/v1/n8n/vulnerability-ready',
      sendBody: true,
      bodyParameters: { parameters: [
        { name: 'scanId', value: '={{ $json.scanId }}' },
        { name: 'filePath', value: '=/mnt/vulnerability/results/{{ $json.scanId }}.json' },
        { name: 'tool', value: 'ZAP' },
        { name: 'projectName', value: '={{ $json.targetUrl }}' }
      ]},
      options: {}
    }
  }
];

const dastConnections = {
  [dastWhId]: { main: [[{ node: dastScId, type: 'main', index: 0 }]] },
  [dastScId]: { main: [[{ node: dastSvId, type: 'main', index: 0 }]] },
  [dastSvId]: { main: [[{ node: dastNfId, type: 'main', index: 0 }]] }
};

db.prepare(`INSERT INTO workflow_entity (id, name, active, nodes, connections, settings, staticData, versionId, triggerCount, meta, createdAt, updatedAt, versionCounter)
  VALUES (?, ?, 1, ?, ?, '{"saveExecutionProgress":true}', '{}', ?, 0, '{}', ?, ?, 1)`)
  .run(dastId, 'Sentinel DAST Scan', JSON.stringify(dastNodes), JSON.stringify(dastConnections), dastVersionId, now, now);

db.prepare("INSERT INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength) VALUES (?, 'scan-dast', 'POST', ?, ?, 9)")
  .run(dastId, dastWhId, dastWebhookId);

db.prepare("INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt) VALUES (?, ?, 'workflow:owner', ?, ?)")
  .run(dastId, project.id, now, now);

db.prepare(`INSERT INTO workflow_history (versionId, workflowId, authors, createdAt, updatedAt, nodes, connections, name, autosaved)
  VALUES (?, ?, '[{"id":"' || ? || '"}]', ?, ?, ?, ?, 'Sentinel DAST Scan', 0)`)
  .run(dastVersionId, dastId, user.id, now, now, JSON.stringify(dastNodes), JSON.stringify(dastConnections));

console.log('DAST workflow created:', dastId);
console.log('\n=== Workflows created successfully! ===');
console.log('Restart n8n for changes to take effect.');

// Set user as activated
db.prepare("UPDATE user SET settings = ? WHERE id = ?").run(JSON.stringify({ userActivated: true }), user.id);
console.log('User activated');

db.close();
