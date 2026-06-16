const D = require('/tmp/node_modules/better-sqlite3');
const db = new D('/home/node/.n8n/database.sqlite');
const execs = db.prepare("SELECT id, workflowId, status, startedAt, stoppedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 5").all();
console.log('Executions:', JSON.stringify(execs, null, 2));
db.close();
