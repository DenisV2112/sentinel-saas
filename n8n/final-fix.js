const Database = require('/tmp/node_modules/better-sqlite3');
const db = new Database('/home/node/.n8n/database.sqlite');

// Set activeVersionId = versionId for all active workflows
db.prepare("UPDATE workflow_entity SET activeVersionId = versionId WHERE active = 1").run();
console.log('ActiveVersionId fixed');

// Verify
const wfs = db.prepare("SELECT name, active, activeVersionId, versionId FROM workflow_entity").all();
console.log(JSON.stringify(wfs, null, 2));

db.close();
