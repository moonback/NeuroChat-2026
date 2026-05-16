const { ipcMain } = require('electron');
const { getDb } = require('./database.cjs');
const { assertMainOrigin } = require('./security.cjs');

const MAX_KEY_CHARS = 256;
const MAX_KV_VALUE_CHARS = 2 * 1024 * 1024;
const MAX_TEXT_CHARS = 50_000;
const MAX_VECTOR_DIMS = 4096;
const MAX_VECTOR_BATCH = 1000;
const MAX_SESSIONS_BATCH = 500;
const MAX_TURNS_PER_SESSION = 1000;
const MAX_JSON_CHARS = 2 * 1024 * 1024;
const MAX_TRACE_EVENTS = 500;

function assertPlainObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field}: objet attendu`);
  }
  return value;
}

function assertString(value, field, maxChars = MAX_TEXT_CHARS, allowEmpty = false) {
  if (typeof value !== 'string') throw new Error(`${field}: string attendu`);
  if (!allowEmpty && value.trim().length === 0) throw new Error(`${field}: valeur vide interdite`);
  if (value.length > maxChars) throw new Error(`${field}: valeur trop longue (max ${maxChars})`);
  return value;
}

function optionalString(value, field, maxChars = MAX_TEXT_CHARS) {
  if (value === undefined || value === null) return null;
  return assertString(value, field, maxChars, true);
}

function assertInteger(value, field) {
  if (!Number.isSafeInteger(value)) throw new Error(`${field}: entier sûr attendu`);
  return value;
}

function assertArray(value, field, maxLength) {
  if (!Array.isArray(value)) throw new Error(`${field}: array attendu`);
  if (value.length > maxLength) throw new Error(`${field}: trop d'éléments (max ${maxLength})`);
  return value;
}

function assertJsonBudget(value, field, maxChars = MAX_JSON_CHARS) {
  const serialized = JSON.stringify(value ?? []);
  if (serialized.length > maxChars) throw new Error(`${field}: JSON trop volumineux`);
  return serialized;
}

function sanitizeKey(key, field = 'key') {
  return assertString(key, field, MAX_KEY_CHARS);
}

function sanitizeSpeaker(value, field = 'speaker', allowed = ['user', 'assistant']) {
  if (!allowed.includes(value)) throw new Error(`${field}: valeur invalide`);
  return value;
}

function sanitizeVectorEntry(entry, field = 'vector') {
  const e = assertPlainObject(entry, field);
  const vector = assertArray(e.vector, `${field}.vector`, MAX_VECTOR_DIMS).map((n, index) => {
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${field}.vector[${index}]: nombre fini attendu`);
    return n;
  });
  return {
    id: assertString(e.id, `${field}.id`, 256),
    text: assertString(e.text, `${field}.text`, MAX_TEXT_CHARS, true),
    vector,
    sessionId: assertString(e.sessionId, `${field}.sessionId`, 256),
    userName: assertString(e.userName, `${field}.userName`, 256),
    speaker: sanitizeSpeaker(e.speaker, `${field}.speaker`),
    timestamp: assertInteger(e.timestamp, `${field}.timestamp`),
  };
}


function sanitizeMigrationVector(value, field) {
  const v = assertPlainObject(value, field);
  const meta = v.metadata && typeof v.metadata === 'object' && !Array.isArray(v.metadata) ? v.metadata : {};
  const rawVector = Array.isArray(v.vector) ? v.vector : Array.isArray(v.vector?.values) ? v.vector.values : [];
  const vector = assertArray(rawVector, `${field}.vector`, MAX_VECTOR_DIMS).map((n, index) => {
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${field}.vector[${index}]: nombre fini attendu`);
    return n;
  });
  return {
    id: assertString(v.id ?? `${Date.now()}-${field}`, `${field}.id`, 256),
    text: assertString(v.text ?? '', `${field}.text`, MAX_TEXT_CHARS, true),
    vector,
    sessionId: assertString(v.sessionId ?? meta.sessionId ?? 'unknown', `${field}.sessionId`, 256),
    userName: assertString(v.userName ?? meta.userName ?? 'unknown', `${field}.userName`, 256),
    speaker: sanitizeSpeaker(v.speaker ?? meta.speaker ?? 'assistant', `${field}.speaker`),
    timestamp: assertInteger(v.timestamp ?? meta.timestamp ?? Date.now(), `${field}.timestamp`),
  };
}

function sanitizeTurn(turn, field) {
  const t = assertPlainObject(turn, field);
  return {
    timestamp: assertInteger(t.timestamp, `${field}.timestamp`),
    speaker: sanitizeSpeaker(t.speaker, `${field}.speaker`, ['user', 'assistant', 'child', 'companion']),
    message: assertString(t.message, `${field}.message`, MAX_TEXT_CHARS, true),
  };
}

function sanitizeSession(session, field = 'session') {
  const s = assertPlainObject(session, field);
  const turns = assertArray(s.turns ?? [], `${field}.turns`, MAX_TURNS_PER_SESSION).map((turn, index) => sanitizeTurn(turn, `${field}.turns[${index}]`));
  return {
    id: assertString(s.id, `${field}.id`, 256),
    userName: assertString(s.userName, `${field}.userName`, 256),
    startTime: assertInteger(s.startTime, `${field}.startTime`),
    endTime: s.endTime === undefined || s.endTime === null ? null : assertInteger(s.endTime, `${field}.endTime`),
    topic: optionalString(s.topic, `${field}.topic`, 500),
    summary: optionalString(s.summary, `${field}.summary`, MAX_TEXT_CHARS),
    turns,
  };
}

function sanitizeProfile(profile) {
  const p = assertPlainObject(profile, 'profile');
  return {
    name: assertString(p.name, 'profile.name', 256),
    preferences: assertArray(p.preferences ?? [], 'profile.preferences', 500).map((pref, index) => assertString(pref, `profile.preferences[${index}]`, 500, true)),
    lastActive: assertInteger(p.lastActive ?? Date.now(), 'profile.lastActive'),
    totalConversations: assertInteger(p.totalConversations ?? 0, 'profile.totalConversations'),
  };
}

function sanitizeSummary(summary) {
  const s = assertPlainObject(summary, 'summary');
  return {
    weekId: assertString(s.weekId, 'summary.weekId', 128),
    dateRange: assertString(s.dateRange, 'summary.dateRange', 256),
    text: assertString(s.text, 'summary.text', MAX_TEXT_CHARS, true),
    topics: assertArray(s.topics ?? [], 'summary.topics', 200).map((topic, index) => assertString(topic, `summary.topics[${index}]`, 200, true)),
    generatedAt: assertInteger(s.generatedAt, 'summary.generatedAt'),
    sessionCount: assertInteger(s.sessionCount ?? 0, 'summary.sessionCount'),
    turnCount: assertInteger(s.turnCount ?? 0, 'summary.turnCount'),
  };
}

function sanitizeTrace(trace) {
  const t = assertPlainObject(trace, 'trace');
  const events = assertArray(t.events ?? [], 'trace.events', MAX_TRACE_EVENTS);
  return {
    id: assertString(t.id, 'trace.id', 256),
    sessionId: assertString(t.sessionId, 'trace.sessionId', 256),
    userId: assertString(t.userId, 'trace.userId', 256),
    timestamp: assertInteger(t.timestamp, 'trace.timestamp'),
    events,
  };
}

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
  ipcMain.handle('db:kv:get', (event, key) => {
    assertMainOrigin(event);
    return getDb().prepare('SELECT value FROM kv_store WHERE key = ?').get(sanitizeKey(key))?.value ?? null;
  });
  ipcMain.handle('db:kv:set', (event, key, value) => {
    assertMainOrigin(event);
    return (getDb().prepare('INSERT OR REPLACE INTO kv_store(key, value) VALUES(?, ?)').run(sanitizeKey(key), assertString(value, 'value', MAX_KV_VALUE_CHARS, true)), true);
  });
  ipcMain.handle('db:kv:delete', (event, key) => {
    assertMainOrigin(event);
    return (getDb().prepare('DELETE FROM kv_store WHERE key = ?').run(sanitizeKey(key)), true);
  });

  ipcMain.handle('db:vectors:load', (event, userName) => {
    assertMainOrigin(event);
    const safeUserName = userName === undefined || userName === null ? null : assertString(userName, 'userName', 256);
    const rows = safeUserName
      ? getDb().prepare('SELECT * FROM vectors WHERE user_name = ? ORDER BY timestamp ASC').all(safeUserName)
      : getDb().prepare('SELECT * FROM vectors ORDER BY timestamp ASC').all();
    return rows.map(fromVectorRow);
  });
  ipcMain.handle('db:vectors:add', (event, entry) => {
    assertMainOrigin(event);
    const safeEntry = sanitizeVectorEntry(entry);
    const vectorBuffer = Buffer.from(Float64Array.from(safeEntry.vector).buffer);
    getDb().prepare('INSERT OR REPLACE INTO vectors(id, text, vector, session_id, user_name, speaker, timestamp) VALUES(?, ?, ?, ?, ?, ?, ?)')
      .run(safeEntry.id, safeEntry.text, vectorBuffer, safeEntry.sessionId, safeEntry.userName, safeEntry.speaker, safeEntry.timestamp);
    return true;
  });
  ipcMain.handle('db:vectors:save', (event, entries) => {
    assertMainOrigin(event);
    const safeEntries = assertArray(entries, 'vectors', MAX_VECTOR_BATCH).map((entry, index) => sanitizeVectorEntry(entry, `vectors[${index}]`));
    const db = getDb();
    const stmt = db.prepare('INSERT OR REPLACE INTO vectors(id, text, vector, session_id, user_name, speaker, timestamp) VALUES(?, ?, ?, ?, ?, ?, ?)');
    const tx = db.transaction((data) => {
      const idsByUser = new Map();
      for (const e of data) {
        const vectorBuffer = Buffer.from(Float64Array.from(e.vector).buffer);
        stmt.run(e.id, e.text, vectorBuffer, e.sessionId, e.userName, e.speaker, e.timestamp);
        if (!idsByUser.has(e.userName)) idsByUser.set(e.userName, []);
        idsByUser.get(e.userName).push(e.id);
      }
      for (const [userName, ids] of idsByUser.entries()) {
        if (ids.length === 0) continue;
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`DELETE FROM vectors WHERE user_name = ? AND id NOT IN (${placeholders})`).run(userName, ...ids);
      }
    });
    tx(safeEntries);
    return true;
  });
  ipcMain.handle('db:vectors:clear', (event, userName) => {
    assertMainOrigin(event);
    if (userName) getDb().prepare('DELETE FROM vectors WHERE user_name = ?').run(assertString(userName, 'userName', 256));
    else getDb().prepare('DELETE FROM vectors').run();
    return true;
  });

  ipcMain.handle('db:sessions:loadAll', (event) => {
    assertMainOrigin(event);
    const sessions = getDb().prepare('SELECT * FROM sessions ORDER BY start_time ASC').all();
    const turnsStmt = getDb().prepare('SELECT timestamp, speaker, message FROM turns WHERE session_id = ? ORDER BY timestamp ASC');
    return sessions.map((s) => ({
      id: s.id, userName: s.user_name, startTime: s.start_time, endTime: s.end_time ?? undefined, topic: s.topic ?? undefined, summary: s.summary ?? undefined,
      turns: turnsStmt.all(s.id).map((t) => ({ timestamp: t.timestamp, speaker: t.speaker, message: t.message })),
    }));
  });
  ipcMain.handle('db:sessions:save', (event, sessions) => {
    assertMainOrigin(event);
    const safeSessions = assertArray(sessions, 'sessions', MAX_SESSIONS_BATCH).map((session, index) => sanitizeSession(session, `sessions[${index}]`));
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
    tx(safeSessions);
    return true;
  });
  ipcMain.handle('db:sessions:clear', (event) => {
    assertMainOrigin(event);
    return (getDb().prepare('DELETE FROM sessions').run(), getDb().prepare('DELETE FROM turns').run(), true);
  });

  ipcMain.handle('db:profiles:get', (event, userName) => {
    assertMainOrigin(event);
    const row = getDb().prepare('SELECT * FROM user_profiles WHERE name = ?').get(assertString(userName, 'userName', 256));
    if (!row) return null;
    return { name: row.name, preferences: JSON.parse(row.preferences || '[]'), lastActive: row.last_active, totalConversations: row.total_conversations };
  });
  ipcMain.handle('db:profiles:update', (event, profile) => {
    assertMainOrigin(event);
    const safeProfile = sanitizeProfile(profile);
    getDb().prepare('INSERT OR REPLACE INTO user_profiles(name, preferences, last_active, total_conversations) VALUES(?, ?, ?, ?)')
      .run(safeProfile.name, JSON.stringify(safeProfile.preferences), safeProfile.lastActive, safeProfile.totalConversations);
    return true;
  });

  ipcMain.handle('db:learning:load', (event, userId) => {
    assertMainOrigin(event);
    return getDb().prepare('SELECT encrypted_data FROM learning_data WHERE user_id = ?').get(assertString(userId, 'userId', 256))?.encrypted_data ?? null;
  });
  ipcMain.handle('db:learning:save', (event, userId, encryptedData, lastUpdated) => {
    assertMainOrigin(event);
    return (getDb().prepare('INSERT OR REPLACE INTO learning_data(user_id, encrypted_data, last_updated) VALUES(?, ?, ?)').run(assertString(userId, 'userId', 256), assertString(encryptedData, 'encryptedData', MAX_JSON_CHARS, true), assertInteger(lastUpdated, 'lastUpdated')), true);
  });
  ipcMain.handle('db:learning:clear', (event, userId) => {
    assertMainOrigin(event);
    return (getDb().prepare('DELETE FROM learning_data WHERE user_id = ?').run(assertString(userId, 'userId', 256)), true);
  });

  ipcMain.handle('db:summaries:load', (event) => {
    assertMainOrigin(event);
    return getDb().prepare('SELECT * FROM weekly_summaries ORDER BY generated_at ASC').all().map((r) => ({ 
    weekId: r.week_id, 
    dateRange: r.date_range, 
    text: r.text, 
    topics: JSON.parse(r.topics || '[]'),
    generatedAt: r.generated_at,
    sessionCount: r.session_count,
    turnCount: r.turn_count
    }));
  });
  ipcMain.handle('db:summaries:save', (event, summary) => {
    assertMainOrigin(event);
    const safeSummary = sanitizeSummary(summary);
    return (getDb().prepare('INSERT OR REPLACE INTO weekly_summaries(week_id, date_range, text, topics, generated_at, session_count, turn_count) VALUES(?, ?, ?, ?, ?, ?, ?)').run(safeSummary.weekId, safeSummary.dateRange, safeSummary.text, JSON.stringify(safeSummary.topics), safeSummary.generatedAt, safeSummary.sessionCount, safeSummary.turnCount), true);
  });
  ipcMain.handle('db:summaries:clear', (event) => {
    assertMainOrigin(event);
    return (getDb().prepare('DELETE FROM weekly_summaries').run(), true);
  });

  ipcMain.handle('db:traces:save', (event, trace) => {
    assertMainOrigin(event);
    const safeTrace = sanitizeTrace(trace);
    return (getDb().prepare('INSERT OR REPLACE INTO agent_traces(id, session_id, user_id, timestamp, events) VALUES(?, ?, ?, ?, ?)').run(safeTrace.id, safeTrace.sessionId, safeTrace.userId, safeTrace.timestamp, assertJsonBudget(safeTrace.events, 'trace.events')), true);
  });
  ipcMain.handle('db:traces:load', (event) => {
    assertMainOrigin(event);
    return getDb().prepare('SELECT * FROM agent_traces ORDER BY timestamp DESC LIMIT 200').all().map((r) => ({ 
    id: r.id, 
    sessionId: r.session_id, 
    userId: r.user_id, 
    timestamp: r.timestamp, 
    events: JSON.parse(r.events || '[]') 
    }));
  });
  ipcMain.handle('db:traces:clear', (event) => {
    assertMainOrigin(event);
    return (getDb().prepare('DELETE FROM agent_traces').run(), true);
  });
  ipcMain.handle('db:migrate', (event, payload) => {
    assertMainOrigin(event);
    const safePayload = assertPlainObject(payload || {}, 'migration');
    const db = getDb();
    const tx = db.transaction((data) => {
      if (Array.isArray(data.vectors)) {
        const vectors = assertArray(data.vectors, 'migration.vectors', MAX_VECTOR_BATCH).map((v, index) => sanitizeMigrationVector(v, `migration.vectors[${index}]`));
        const addVector = db.prepare('INSERT OR REPLACE INTO vectors(id, text, vector, session_id, user_name, speaker, timestamp) VALUES(?, ?, ?, ?, ?, ?, ?)');
        for (const v of vectors) {
          addVector.run(v.id, v.text, Buffer.from(Float64Array.from(v.vector).buffer), v.sessionId, v.userName, v.speaker, v.timestamp);
        }
      }
      if (Array.isArray(data.sessions)) {
        const sessions = assertArray(data.sessions, 'migration.sessions', MAX_SESSIONS_BATCH).map((s, index) => sanitizeSession(s, `migration.sessions[${index}]`));
        const upsertSession = db.prepare('INSERT OR REPLACE INTO sessions(id, user_name, start_time, end_time, topic, summary) VALUES(?, ?, ?, ?, ?, ?)');
        const clearTurns = db.prepare('DELETE FROM turns WHERE session_id = ?');
        const insertTurn = db.prepare('INSERT INTO turns(session_id, timestamp, speaker, message) VALUES(?, ?, ?, ?)');
        for (const s of sessions) {
          upsertSession.run(s.id, s.userName, s.startTime, s.endTime ?? null, s.topic ?? null, s.summary ?? null);
          clearTurns.run(s.id);
          for (const t of s.turns || []) insertTurn.run(s.id, t.timestamp, t.speaker, t.message);
        }
      }
      if (data.profiles && typeof data.profiles === 'object' && !Array.isArray(data.profiles)) {
        const upsertProfile = db.prepare('INSERT OR REPLACE INTO user_profiles(name, preferences, last_active, total_conversations) VALUES(?, ?, ?, ?)');
        for (const [name, profile] of Object.entries(data.profiles).slice(0, MAX_SESSIONS_BATCH)) {
          const safeProfile = sanitizeProfile({ ...assertPlainObject(profile, `migration.profiles.${name}`), name });
          upsertProfile.run(safeProfile.name, JSON.stringify(safeProfile.preferences), safeProfile.lastActive, safeProfile.totalConversations);
        }
      }
      if (Array.isArray(data.summaries)) {
        const summaries = assertArray(data.summaries, 'migration.summaries', 200).map((summary, index) => sanitizeSummary(summary, `migration.summaries[${index}]`));
        const upsertSummary = db.prepare('INSERT OR REPLACE INTO weekly_summaries(week_id, date_range, text, topics, generated_at, session_count, turn_count) VALUES(?, ?, ?, ?, ?, ?, ?)');
        for (const sm of summaries) upsertSummary.run(sm.weekId, sm.dateRange, sm.text, JSON.stringify(sm.topics), sm.generatedAt, sm.sessionCount, sm.turnCount);
      }
      if (Array.isArray(data.traces)) {
        const traces = assertArray(data.traces, 'migration.traces', 200).map((trace, index) => sanitizeTrace(trace, `migration.traces[${index}]`));
        const upsertTrace = db.prepare('INSERT OR REPLACE INTO agent_traces(id, session_id, user_id, timestamp, events) VALUES(?, ?, ?, ?, ?)');
        for (const tr of traces) upsertTrace.run(tr.id, tr.sessionId, tr.userId, tr.timestamp, assertJsonBudget(tr.events, 'migration.trace.events'));
      }
      if (data.kv && typeof data.kv === 'object' && !Array.isArray(data.kv)) {
        const upsertKv = db.prepare('INSERT OR REPLACE INTO kv_store(key, value) VALUES(?, ?)');
        for (const [k, v] of Object.entries(data.kv).slice(0, 1000)) upsertKv.run(sanitizeKey(k, 'migration.kv.key'), assertString(String(v), 'migration.kv.value', MAX_KV_VALUE_CHARS, true));
      }
      db.prepare('INSERT OR REPLACE INTO kv_store(key, value) VALUES(?, ?)').run('migration_v1_done', 'true');
    });
    tx(safePayload);
    return true;
  });
}

module.exports = { registerDbIpcHandlers };
