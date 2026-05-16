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
      speaker TEXT CHECK(speaker IN ('user','assistant')) NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vectors_user ON vectors(user_name);
    CREATE INDEX IF NOT EXISTS idx_vectors_session ON vectors(session_id);

    CREATE TABLE IF NOT EXISTS project_vectors (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      content TEXT NOT NULL,
      vector BLOB NOT NULL,
      mtime INTEGER NOT NULL,
      workdir TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_project_vectors_path ON project_vectors(path);
    CREATE INDEX IF NOT EXISTS idx_project_vectors_workdir ON project_vectors(workdir);


    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      topic TEXT,
      summary TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_name);

    CREATE TABLE IF NOT EXISTS turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      timestamp INTEGER NOT NULL,
      speaker TEXT NOT NULL,
      message TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);

    CREATE TABLE IF NOT EXISTS user_profiles (
      name TEXT PRIMARY KEY,
      preferences TEXT DEFAULT '[]',
      last_active INTEGER NOT NULL,
      total_conversations INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS learning_data (
      user_id TEXT PRIMARY KEY,
      encrypted_data TEXT NOT NULL,
      last_updated INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_summaries (
      week_id TEXT PRIMARY KEY,
      date_range TEXT NOT NULL,
      text TEXT NOT NULL,
      topics TEXT DEFAULT '[]',
      generated_at INTEGER NOT NULL,
      session_count INTEGER DEFAULT 0,
      turn_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS agent_traces (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      events TEXT NOT NULL
    );

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
