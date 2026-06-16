const Database = require('/tmp/node_modules/better-sqlite3');
const crypto = require('crypto');
const db = new Database('/home/node/.n8n/database.sqlite');

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// Check workflow table
for (const table of tables.map(t => t.name)) {
  try {
    const cols = db.prepare(`PRAGMA table_info('${table}')`).all();
    console.log(`\n${table}:`, cols.map(c => c.name).join(', '));
  } catch(e) {}
}

// Check for any existing data
try {
  const cnt = db.prepare("SELECT COUNT(*) as c FROM workflow_entity").get();
  console.log('\nExisting workflows:', cnt.c);
} catch(e) {}
