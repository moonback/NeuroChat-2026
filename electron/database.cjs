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

  runMigrations(db);

  return db;
}

function runMigrations(db) {
  const migrations = [
    {
      version: 1,
      name: 'initial_schema',
      run: (db) => {
        // Schema is already created by ensureDb exec for v0/v1 base.
        // This is just to seed the migration table.
        console.log('[db] Migration v1: Initial schema verified.');
      }
    },
    {
      version: 2,
      name: 'add_vector_metadata_json',
      run: (db) => {
        // Add a column if needed in future, for now just an example of a real migration
        try {
          db.exec('ALTER TABLE vectors ADD COLUMN metadata_json TEXT;');
          console.log('[db] Migration v2: Added metadata_json to vectors.');
        } catch (e) {
          // Might already exist if interrupted
          console.warn('[db] Migration v2 warning:', e.message);
        }
      }
    }
  ];

  const currentVersionRow = db.prepare('SELECT MAX(version) as version FROM _migrations').get();
  const currentVersion = currentVersionRow?.version || 0;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`[db] Applying migration v${migration.version}: ${migration.name}...`);
      const tx = db.transaction(() => {
        migration.run(db);
        db.prepare('INSERT INTO _migrations (version, applied_at) VALUES (?, ?)').run(migration.version, Date.now());
      });
      tx();
      console.log(`[db] Migration v${migration.version} applied successfully.`);
    }
  }
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
