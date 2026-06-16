const Database = require('/tmp/node_modules/better-sqlite3');
const db = new Database('/home/node/.n8n/database.sqlite');

// Fix SAST workflow: add timeout to HTTP Request node (300s for Semgrep)
const sastWf = db.prepare("SELECT nodes FROM workflow_entity WHERE name = 'Sentinel SAST Scan'").get();
if (sastWf) {
  const nodes = JSON.parse(sastWf.nodes);
  for (const node of nodes) {
    if (node.name === 'Call Semgrep Runner') {
      node.parameters.options = node.parameters.options || {};
      node.parameters.options.timeout = 300000; // 5 min timeout for Semgrep scans
    }
  }
  db.prepare("UPDATE workflow_entity SET nodes = ? WHERE name = 'Sentinel SAST Scan'").run(JSON.stringify(nodes));
  console.log('SAST timeout updated');
}

// Fix DAST workflow: replace Code node with Function node (JS, no Python needed)
const dastWf = db.prepare("SELECT id, nodes, connections FROM workflow_entity WHERE name = 'Sentinel DAST Scan'").get();
if (dastWf) {
  let nodes = JSON.parse(dastWf.nodes);
  const connections = JSON.parse(dastWf.connections);
  
  // Find and replace the Code node
  const codeNode = nodes.find(n => n.name === 'Analyze Security');
  const httpNode = nodes.find(n => n.name === 'HTTP Security Scan');
  const notifyNode = nodes.find(n => n.name === 'Notify Vulnerability');
  
  if (codeNode) {
    // Change to a Function node (runs JS in the JS task runner, no Python needed)
    codeNode.type = 'n8n-nodes-base.function';
    codeNode.typeVersion = 1;
    codeNode.parameters = {
      functionCode: [
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
        '  json: {',
        '    scanId: $input.first().json.scanId || "unknown",',
        '    targetUrl: $input.first().json.target ? $input.first().json.target.url : "",',
        '    findings: findings,',
        '    totalFindings: findings.length,',
        '    highCount: findings.filter(function(f) { return f.severity === "HIGH"; }).length,',
        '    mediumCount: findings.filter(function(f) { return f.severity === "MEDIUM"; }).length,',
        '    lowCount: findings.filter(function(f) { return f.severity === "LOW"; }).length',
        '  }',
        '};'
      ].join('\n')
    };
    console.log('DAST Code node replaced with Function node');
  }

  // Add timeout to HTTP scan node
  if (httpNode) {
    httpNode.parameters.options = httpNode.parameters.options || {};
    httpNode.parameters.options.timeout = 30000; // 30s timeout for HTTP scan
  }

  db.prepare("UPDATE workflow_entity SET nodes = ? WHERE id = ?").run(JSON.stringify(nodes), dastWf.id);
  console.log('DAST workflow updated');
}

db.close();
console.log('Done - restart n8n to apply');
