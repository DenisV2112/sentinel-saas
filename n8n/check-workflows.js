const Database = require('/tmp/node_modules/better-sqlite3');
const db = new Database('/home/node/.n8n/database.sqlite');

const webhooks = db.prepare('SELECT workflowId, webhookPath, method, node, webhookId FROM webhook_entity').all();
console.log('Webhooks:', JSON.stringify(webhooks, null, 2));

const workflows = db.prepare('SELECT id, name, active FROM workflow_entity').all();
console.log('Workflows:', JSON.stringify(workflows, null, 2));
