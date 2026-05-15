const { ipcMain } = require('electron');
const { getDb } = require('./database.cjs');

function fromVectorRow(row) {
  return {
    id: row.id,
    text: row.text,
    vector: Array.from(new Float64Array(row.vector.buffer, row.vector.byteOffset, row.vector.byteLength / 8)),
    sessionId: row.session_id,
    userName: row.user_name,
    speaker: row.speaker,
    timestamp: row.timestamp,
  };
}

function registerDbIpcHandlers() {
  ipcMain.handle('db:kv:get', (_event, key) => getDb().prepare('SELECT value FROM kv_store WHERE key = ?').get(key)?.value ?? null);
  ipcMain.handle('db:kv:set', (_event, key, value) => (getDb().prepare('INSERT OR REPLACE INTO kv_store(key, value) VALUES(?, ?)').run(key, value), true));
  ipcMain.handle('db:kv:delete', (_event, key) => (getDb().prepare('DELETE FROM kv_store WHERE key = ?').run(key), true));

  ipcMain.handle('db:vectors:load', (_event, userName) => {
    const rows = userName
      ? getDb().prepare('SELECT * FROM vectors WHERE user_name = ? ORDER BY timestamp ASC').all(userName)
      : getDb().prepare('SELECT * FROM vectors ORDER BY timestamp ASC').all();
    return rows.map(fromVectorRow);
  });
  ipcMain.handle('db:vectors:add', (_event, entry) => {
    const vectorBuffer = Buffer.from(Float64Array.from(entry.vector).buffer);
    getDb().prepare('INSERT OR REPLACE INTO vectors(id, text, vector, session_id, user_name, speaker, timestamp) VALUES(?, ?, ?, ?, ?, ?, ?)')
      .run(entry.id, entry.text, vectorBuffer, entry.sessionId, entry.userName, entry.speaker, entry.timestamp);
    return true;
  });
  ipcMain.handle('db:vectors:clear', (_event, userName) => {
    if (userName) getDb().prepare('DELETE FROM vectors WHERE user_name = ?').run(userName);
    else getDb().prepare('DELETE FROM vectors').run();
    return true;
  });

  ipcMain.handle('db:sessions:loadAll', () => {
    const sessions = getDb().prepare('SELECT * FROM sessions ORDER BY start_time ASC').all();
    const turnsStmt = getDb().prepare('SELECT timestamp, speaker, message FROM turns WHERE session_id = ? ORDER BY timestamp ASC');
    return sessions.map((s) => ({
      id: s.id, userName: s.user_name, startTime: s.start_time, endTime: s.end_time ?? undefined, topic: s.topic ?? undefined, summary: s.summary ?? undefined,
      turns: turnsStmt.all(s.id).map((t) => ({ timestamp: t.timestamp, speaker: t.speaker, message: t.message })),
    }));
  });
  ipcMain.handle('db:sessions:save', (_event, sessions) => {
    const db = getDb();
    const upsertSession = db.prepare('INSERT OR REPLACE INTO sessions(id, user_name, start_time, end_time, topic, summary) VALUES(?, ?, ?, ?, ?, ?)');
    const clearTurns = db.prepare('DELETE FROM turns WHERE session_id = ?');
    const insertTurn = db.prepare('INSERT INTO turns(session_id, timestamp, speaker, message) VALUES(?, ?, ?, ?)');
    const tx = db.transaction((payload) => {
      for (const s of payload) {
        upsertSession.run(s.id, s.userName, s.startTime, s.endTime ?? null, s.topic ?? null, s.summary ?? null);
        clearTurns.run(s.id);
        for (const t of s.turns || []) insertTurn.run(s.id, t.timestamp, t.speaker, t.message);
      }
    });
    tx(sessions);
    return true;
  });
  ipcMain.handle('db:sessions:clear', () => (getDb().prepare('DELETE FROM sessions').run(), getDb().prepare('DELETE FROM turns').run(), true));

  ipcMain.handle('db:profiles:get', (_event, userName) => {
    const row = getDb().prepare('SELECT * FROM user_profiles WHERE name = ?').get(userName);
    if (!row) return null;
    return { name: row.name, preferences: JSON.parse(row.preferences || '[]'), lastActive: row.last_active, totalConversations: row.total_conversations };
  });
  ipcMain.handle('db:profiles:update', (_event, profile) => {
    getDb().prepare('INSERT OR REPLACE INTO user_profiles(name, preferences, last_active, total_conversations) VALUES(?, ?, ?, ?)')
      .run(profile.name, JSON.stringify(profile.preferences || []), profile.lastActive, profile.totalConversations || 0);
    return true;
  });

  ipcMain.handle('db:learning:load', (_event, userId) => getDb().prepare('SELECT encrypted_data FROM learning_data WHERE user_id = ?').get(userId)?.encrypted_data ?? null);
  ipcMain.handle('db:learning:save', (_event, userId, encryptedData, lastUpdated) => (getDb().prepare('INSERT OR REPLACE INTO learning_data(user_id, encrypted_data, last_updated) VALUES(?, ?, ?)').run(userId, encryptedData, lastUpdated), true));
  ipcMain.handle('db:learning:clear', (_event, userId) => (getDb().prepare('DELETE FROM learning_data WHERE user_id = ?').run(userId), true));

  ipcMain.handle('db:summaries:load', () => getDb().prepare('SELECT * FROM weekly_summaries ORDER BY generated_at ASC').all().map((r) => ({ 
    weekId: r.week_id, 
    dateRange: r.date_range, 
    text: r.text, 
    topics: JSON.parse(r.topics || '[]'),
    generatedAt: r.generated_at,
    sessionCount: r.session_count,
    turnCount: r.turn_count
  })));
  ipcMain.handle('db:summaries:save', (_event, summary) => (getDb().prepare('INSERT OR REPLACE INTO weekly_summaries(week_id, date_range, text, topics, generated_at, session_count, turn_count) VALUES(?, ?, ?, ?, ?, ?, ?)').run(summary.weekId, summary.dateRange, summary.text, JSON.stringify(summary.topics || []), summary.generatedAt, summary.sessionCount || 0, summary.turnCount || 0), true));
  ipcMain.handle('db:summaries:clear', () => (getDb().prepare('DELETE FROM weekly_summaries').run(), true));

  ipcMain.handle('db:traces:save', (_event, trace) => (getDb().prepare('INSERT OR REPLACE INTO agent_traces(id, session_id, user_id, timestamp, events) VALUES(?, ?, ?, ?, ?)').run(trace.id, trace.sessionId, trace.userId, trace.timestamp, JSON.stringify(trace.events || [])), true));
  ipcMain.handle('db:traces:load', () => getDb().prepare('SELECT * FROM agent_traces ORDER BY timestamp DESC LIMIT 200').all().map((r) => ({ 
    id: r.id, 
    sessionId: r.session_id, 
    userId: r.user_id, 
    timestamp: r.timestamp, 
    events: JSON.parse(r.events || '[]') 
  })));
  ipcMain.handle('db:traces:clear', () => (getDb().prepare('DELETE FROM agent_traces').run(), true));
}

  ipcMain.handle('db:migrate', (_event, payload) => {
    const db = getDb();
    const tx = db.transaction((data) => {
      if (Array.isArray(data.vectors)) {
        const addVector = db.prepare('INSERT OR REPLACE INTO vectors(id, text, vector, session_id, user_name, speaker, timestamp) VALUES(?, ?, ?, ?, ?, ?, ?)');
        for (const v of data.vectors) {
          const vectorData = Array.isArray(v.vector) ? v.vector : v.vector?.values ?? [];
          const meta = v.metadata || {};
          addVector.run(v.id, v.text || '', Buffer.from(Float64Array.from(vectorData).buffer), v.sessionId || meta.sessionId || 'unknown', v.userName || meta.userName || 'unknown', v.speaker || meta.speaker || 'assistant', v.timestamp || meta.timestamp || Date.now());
        }
      }
      if (Array.isArray(data.sessions)) {
        const upsertSession = db.prepare('INSERT OR REPLACE INTO sessions(id, user_name, start_time, end_time, topic, summary) VALUES(?, ?, ?, ?, ?, ?)');
        const clearTurns = db.prepare('DELETE FROM turns WHERE session_id = ?');
        const insertTurn = db.prepare('INSERT INTO turns(session_id, timestamp, speaker, message) VALUES(?, ?, ?, ?)');
        for (const s of data.sessions) {
          upsertSession.run(s.id, s.userName, s.startTime, s.endTime ?? null, s.topic ?? null, s.summary ?? null);
          clearTurns.run(s.id);
          for (const t of s.turns || []) insertTurn.run(s.id, t.timestamp, t.speaker, t.message);
        }
      }
      if (data.profiles && typeof data.profiles === 'object') {
        const upsertProfile = db.prepare('INSERT OR REPLACE INTO user_profiles(name, preferences, last_active, total_conversations) VALUES(?, ?, ?, ?)');
        for (const [name, profile] of Object.entries(data.profiles)) upsertProfile.run(name, JSON.stringify(profile.preferences || []), profile.lastActive || Date.now(), profile.totalConversations || 0);
      }
      if (Array.isArray(data.summaries)) {
        const upsertSummary = db.prepare('INSERT OR REPLACE INTO weekly_summaries(week_id, date_range, text, topics, generated_at, session_count, turn_count) VALUES(?, ?, ?, ?, ?, ?, ?)');
        for (const sm of data.summaries) upsertSummary.run(sm.weekId, sm.dateRange, sm.text, JSON.stringify(sm.topics || []), sm.generatedAt, sm.sessionCount || 0, sm.turnCount || 0);
      }
      if (Array.isArray(data.traces)) {
        const upsertTrace = db.prepare('INSERT OR REPLACE INTO agent_traces(id, session_id, user_id, timestamp, events) VALUES(?, ?, ?, ?, ?)');
        for (const tr of data.traces) upsertTrace.run(tr.id, tr.sessionId, tr.userId, tr.timestamp, JSON.stringify(tr.events || []));
      }
      if (data.kv && typeof data.kv === 'object') {
        const upsertKv = db.prepare('INSERT OR REPLACE INTO kv_store(key, value) VALUES(?, ?)');
        for (const [k, v] of Object.entries(data.kv)) upsertKv.run(k, String(v));
      }
      db.prepare('INSERT OR REPLACE INTO kv_store(key, value) VALUES(?, ?)').run('migration_v1_done', 'true');
    });
    tx(payload || {});
    return true;
  });

module.exports = { registerDbIpcHandlers };
