const Database = require('/tmp/node_modules/better-sqlite3');
const db = new Database('/home/node/.n8n/database.sqlite');

const wfs = db.prepare("SELECT id, name, active, activeVersionId, versionId FROM workflow_entity").all();
console.log('Workflows:', JSON.stringify(wfs, null, 2));

// Also check webhook_entity
const whs = db.prepare("SELECT * FROM webhook_entity").all();
console.log('Webhooks:', JSON.stringify(whs, null, 2));

db.close();
