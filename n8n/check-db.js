const Database = require('/tmp/node_modules/better-sqlite3');
const crypto = require('crypto');
const http = require('http');
const db = new Database('/home/node/.n8n/database.sqlite');

// Check user table
try {
  const cols = db.prepare("PRAGMA table_info('user')").all();
  console.log('User columns:', JSON.stringify(cols.map(c => c.name)));
  
  const users = db.prepare('SELECT * FROM user').all();
  console.log('Users:', JSON.stringify(users).substring(0, 500));
} catch(e) {
  console.error('Error:', e.message);
  // Try different table names
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('All tables:', tables.map(t => t.name));
}
