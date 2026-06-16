const http = require('http');
const crypto = require('crypto');

function post(path, data) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost', port: 5678, path: path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b.substring(0, 300) }));
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(body);
    req.end();
  });
}

async function createSASTWorkflow() {
  const wh = crypto.randomUUID();
  const sr = crypto.randomUUID();
  const nf = crypto.randomUUID();

  const sast = {
    name: 'Sentinel SAST Scan',
    nodes: [
      {
        id: wh, name: 'Webhook SAST', type: 'n8n-nodes-base.webhook', typeVersion: 2,
        position: [250, 300],
        webhookId: crypto.randomUUID(),
        parameters: { httpMethod: 'POST', path: 'scan-sast', responseMode: 'lastNode' }
      },
      {
        id: sr, name: 'Call Semgrep Runner', type: 'n8n-nodes-base.httpRequest', typeVersion: 4,
        position: [650, 300],
        parameters: {
          method: 'POST',
          url: 'http://semgrep-runner:5100/scan',
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'scanId', value: '={{ $json.scanId }}' },
              { name: 'repoUrl', value: '={{ $json.repository.url }}' },
              { name: 'branch', value: '={{ $json.repository.branch }}' },
              { name: 'token', value: '={{ $json.repository.token }}' }
            ]
          }
        }
      },
      {
        id: nf, name: 'Notify CodeQuality', type: 'n8n-nodes-base.httpRequest', typeVersion: 4,
        position: [1050, 300],
        parameters: {
          method: 'POST',
          url: 'http://code-quality-service:5001/api/n8n/semgrep/result-ready',
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'scanId', value: '={{ $json.scanId }}' },
              { name: 'filePath', value: '={{ $json.filePath }}' }
            ]
          }
        }
      }
    ],
    connections: {
      [wh]: { main: [[{ node: sr, type: 'main', index: 0 }]] },
      [sr]: { main: [[{ node: nf, type: 'main', index: 0 }]] }
    },
    settings: { saveExecutionProgress: true },
    active: true
  };

  return post('/rest/workflows', sast);
}

async function createDASTWorkflow() {
  const wh = crypto.randomUUID();
  const sc = crypto.randomUUID();
  const sv = crypto.randomUUID();
  const nf = crypto.randomUUID();

  const dast = {
    name: 'Sentinel DAST Scan',
    nodes: [
      {
        id: wh, name: 'Webhook DAST', type: 'n8n-nodes-base.webhook', typeVersion: 2,
        position: [250, 300],
        webhookId: crypto.randomUUID(),
        parameters: { httpMethod: 'POST', path: 'scan-dast', responseMode: 'lastNode' }
      },
      {
        id: sc, name: 'HTTP Security Scan', type: 'n8n-nodes-base.httpRequest', typeVersion: 4,
        position: [650, 300],
        parameters: {
          method: 'GET',
          url: '={{ $json.target.url }}',
          sendHeaders: true,
          headerParameters: {
            parameters: [
              { name: 'User-Agent', value: 'Sentinel-DAST/1.0' }
            ]
          },
          options: {
            redirect: { redirect: { followRedirects: true } }
          }
        }
      },
      {
        id: sv, name: 'Save & Analyze', type: 'n8n-nodes-base.code', typeVersion: 2,
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
            '  if (!headers[h] && !headers[h.toLowerCase()]) {',
            '    findings.push({ title: desc, severity: sev, type: "MISSING_HEADER" });',
            '  }',
            '}',
            'const server = headers["server"] || headers["Server"];',
            'if (server && server.length > 3) {',
            '  findings.push({ title: "Server: " + server, severity: "LOW", type: "INFO_DISCLOSURE" });',
            '}',
            'return {',
            '  scanId: $input.first().json.scanId || "unknown",',
            '  targetUrl: $input.first().json.target ? $input.first().json.target.url : "",',
            '  findings: findings,',
            '  totalFindings: findings.length,',
            '  highCount: findings.filter(f => f.severity === "HIGH").length,',
            '  mediumCount: findings.filter(f => f.severity === "MEDIUM").length,',
            '  lowCount: findings.filter(f => f.severity === "LOW").length',
            '};'
          ].join('\n')
        }
      },
      {
        id: nf, name: 'Notify Vulnerability', type: 'n8n-nodes-base.httpRequest', typeVersion: 4,
        position: [1450, 300],
        parameters: {
          method: 'POST',
          url: 'http://vulnerability-service:5001/api/v1/n8n/vulnerability-ready',
          sendBody: true,
          bodyParameters: {
            parameters: [
              { name: 'scanId', value: '={{ $json.scanId }}' },
              { name: 'filePath', value: '=/mnt/vulnerability/results/{{ $json.scanId }}.json' },
              { name: 'tool', value: 'ZAP' },
              { name: 'projectName', value: '={{ $json.targetUrl }}' }
            ]
          }
        }
      }
    ],
    connections: {
      [wh]: { main: [[{ node: sc, type: 'main', index: 0 }]] },
      [sc]: { main: [[{ node: sv, type: 'main', index: 0 }]] },
      [sv]: { main: [[{ node: nf, type: 'main', index: 0 }]] }
    },
    settings: { saveExecutionProgress: true },
    active: true
  };

  return post('/rest/workflows', dast);
}

async function main() {
  console.log('Creating n8n workflows...\n');
  const r1 = await createSASTWorkflow();
  console.log('SAST:', JSON.stringify(r1));
  const r2 = await createDASTWorkflow();
  console.log('DAST:', JSON.stringify(r2));
  console.log('\nDone!');
}
main().catch(e => console.error('FATAL:', e));
