const path = require('path');
const Database = require('better-sqlite3');

let db;

function ensureDb(app) {
  if (db) return db;
  const dbPath = path.join(app.getPath('userData'), 'neurochat.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS vectors (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      vector BLOB NOT NULL,
      session_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      speaker TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vectors_user ON vectors(user_name);
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

module.exports = { ensureDb, getDb, closeDb };
