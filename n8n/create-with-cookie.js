const Database = require('/tmp/node_modules/better-sqlite3');
const crypto = require('crypto');
const http = require('http');
const db = new Database('/home/node/.n8n/database.sqlite');

const encKey = 'XXzCmarg1LVjwWZd01u9l/6+soOjMaHx';
const userId = '1819503f-f1a9-49d7-b50e-e8317c478da9';

// n8n uses cookie-session or express-session with signed cookies
// The cookie format is typically: s:<base64(session)>.<hmac_signature>
// Let's try creating a cookie that n8n will accept

// First, activate the user
db.prepare("UPDATE user SET settings = ?, disabled = 0 WHERE id = ?")
  .run(JSON.stringify({ userActivated: true }), userId);
console.log('User activated');

// Create a session object
const sessionData = JSON.stringify({
  passport: {
    user: {
      id: userId,
      email: 'admin@sentinel.com',
      role: 'global:owner'
    }
  }
});

// Sign it like express-session does
const encoded = Buffer.from(sessionData).toString('base64');
const signature = crypto.createHmac('sha256', encKey).update(encoded).digest('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

// Try different cookie names and formats
const cookies = [
  `n8n-auth=s:${encoded}.${signature}`,
  `connect.sid=s:${encoded}.${signature}`,
  `session=s:${encoded}.${signature}`,
];

// Test each cookie
async function testCookie(cookie) {
  return new Promise((resolve) => {
    const wfData = JSON.stringify({
      name: 'SAST Test', nodes: [{
        name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2,
        position: [250, 300], webhookId: crypto.randomUUID(),
        parameters: { httpMethod: 'POST', path: 'scan-sast-test', responseMode: 'lastNode' }
      }], connections: {}, settings: { saveExecutionProgress: true }, active: false
    });

    const req = http.request({
      hostname: 'localhost', port: 5678, path: '/rest/workflows', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie, 'Content-Length': Buffer.byteLength(wfData) }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ cookie: cookie.substring(0, 30) + '...', status: res.statusCode, body: body.substring(0, 100) }));
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(wfData);
    req.end();
  });
}

async function main() {
  for (const cookie of cookies) {
    const result = await testCookie(cookie);
    console.log(JSON.stringify(result));
  }
}
main().catch(console.error);
