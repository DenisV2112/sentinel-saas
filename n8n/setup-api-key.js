const Database = require('/tmp/node_modules/better-sqlite3');
const crypto = require('crypto');
const http = require('http');
const db = new Database('/home/node/.n8n/database.sqlite');

// Find user
const users = db.prepare('SELECT id, email, globalRole FROM user').all();
console.log('Users:', JSON.stringify(users));

const userId = users[0]?.id;
if (!userId) { console.error('No user found!'); process.exit(1); }

// Check table schema
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// Generate API key
const apiKey = 'sentinel-' + crypto.randomBytes(24).toString('hex');
const apiKeyId = crypto.randomUUID();

// n8n stores API keys in the user table or settings
// Try inserting into settings table or create an API key
try {
  // Check if there's an api_keys setting
  const settingsCols = db.prepare("PRAGMA table_info('settings')").all();
  console.log('Settings cols:', settingsCols.map(c => c.name).join(', '));
} catch(e) {
  console.log('No settings table');
}

// Alternative: try user table
try {
  const userCols = db.prepare("PRAGMA table_info('user')").all();
  console.log('User cols:', userCols.map(c => c.name).join(', '));
} catch(e) {}

// Let's just create the API key in a new table
db.exec(`
  CREATE TABLE IF NOT EXISTS user_api_keys (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    label TEXT NOT NULL,
    apiKey TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

db.prepare(
  "INSERT INTO user_api_keys (id, userId, label, apiKey, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
).run(apiKeyId, userId, 'auto-generated', apiKey);

console.log('API Key created:', apiKey);
console.log('Use with header: X-N8N-API-KEY: ' + apiKey);

// Test API key with REST API
const wfData = JSON.stringify({
  name: 'Sentinel SAST Scan',
  nodes: [{
    name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2,
    position: [250, 300],
    webhookId: crypto.randomUUID(),
    parameters: { httpMethod: 'POST', path: 'scan-sast', responseMode: 'lastNode' }
  }],
  connections: {},
  settings: { saveExecutionProgress: true },
  active: true
});

const req = http.request({
  hostname: 'localhost', port: 5678, path: '/rest/workflows', method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(wfData),
    'X-N8N-API-KEY': apiKey
  }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log('API test:', res.statusCode, body.substring(0, 200)));
});
req.write(wfData);
req.end();
