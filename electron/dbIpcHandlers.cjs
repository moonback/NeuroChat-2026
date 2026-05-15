const { ipcMain } = require('electron');
const { getDb } = require('./database.cjs');

function registerDbIpcHandlers() {
  ipcMain.handle('db:kv:get', (_event, key) => {
    const row = getDb().prepare('SELECT value FROM kv_store WHERE key = ?').get(key);
    return row?.value ?? null;
  });

  ipcMain.handle('db:kv:set', (_event, key, value) => {
    getDb().prepare('INSERT OR REPLACE INTO kv_store(key, value) VALUES(?, ?)').run(key, value);
    return true;
  });

  ipcMain.handle('db:kv:delete', (_event, key) => {
    getDb().prepare('DELETE FROM kv_store WHERE key = ?').run(key);
    return true;
  });

  ipcMain.handle('db:vectors:load', (_event, userName) => {
    const stmt = userName
      ? getDb().prepare('SELECT * FROM vectors WHERE user_name = ? ORDER BY timestamp ASC')
      : getDb().prepare('SELECT * FROM vectors ORDER BY timestamp ASC');
    return stmt.all(userName).map((row) => ({
      ...row,
      vector: Array.from(new Float64Array(row.vector.buffer, row.vector.byteOffset, row.vector.byteLength / 8)),
    }));
  });

  ipcMain.handle('db:vectors:add', (_event, entry) => {
    const vectorBuffer = Buffer.from(Float64Array.from(entry.vector).buffer);
    getDb()
      .prepare('INSERT OR REPLACE INTO vectors(id, text, vector, session_id, user_name, speaker, timestamp) VALUES(?, ?, ?, ?, ?, ?, ?)')
      .run(entry.id, entry.text, vectorBuffer, entry.sessionId, entry.userName, entry.speaker, entry.timestamp);
    return true;
  });

  ipcMain.handle('db:vectors:clear', (_event, userName) => {
    if (userName) getDb().prepare('DELETE FROM vectors WHERE user_name = ?').run(userName);
    else getDb().prepare('DELETE FROM vectors').run();
    return true;
  });
}

module.exports = { registerDbIpcHandlers };
