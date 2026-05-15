import type { MigrationPayload } from './storageBackend';
import { getStorageBackend } from './index';

const LEGACY_KEYS = [
  'neurochat_v2_vectors',
  'neurochat_v2_memory',
  'neurochat_v2_user_profile',
  'neurochat_learning_turn_counts',
  'neurochat_v2_weekly_summaries',
  'neurochat_v2_summary_cooldown',
  'neurochat_agent_traces',
  'neurochat_skill_policy_v2',
  'neurochat_security_events',
  'NeuroChat-avatar',
  'neurochat-user-name',
  'NeuroChat-child-name',
  'neurochat_workdir',
  'neurochat_encryption_key',
];

function readLegacyLearningData(storage: Storage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith('neurochat_learning_')) continue;
    const value = storage.getItem(key);
    if (value) out[key] = value;
  }
  return out;
}

export async function runOneShotStorageMigration(): Promise<void> {
  if (!window.neurochatElectron?.db) return;

  const backend = getStorageBackend();
  const done = await backend.getItem('migration_v1_done');
  if (done === 'true') return;

  const vectorsRaw = window.localStorage.getItem('neurochat_v2_vectors');
  const sessionsRaw = window.localStorage.getItem('neurochat_v2_memory');
  const profilesRaw = window.localStorage.getItem('neurochat_v2_user_profile');
  const summariesRaw = window.localStorage.getItem('neurochat_v2_weekly_summaries');
  const tracesRaw = window.localStorage.getItem('neurochat_agent_traces');

  const hasData = Boolean(vectorsRaw || sessionsRaw || profilesRaw || summariesRaw || tracesRaw || window.localStorage.getItem('neurochat_workdir'));
  if (!hasData) {
    await backend.setItem('migration_v1_done', 'true');
    return;
  }

  const safeParse = <T>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  };

  const payload: MigrationPayload = {
    vectors: safeParse<unknown[]>(vectorsRaw, []),
    sessions: safeParse<any[]>(sessionsRaw, []) as any,
    profiles: safeParse<Record<string, any>>(profilesRaw, {}) as any,
    summaries: safeParse<any[]>(summariesRaw, []) as any,
    traces: safeParse<any[]>(tracesRaw, []) as any,
    kv: {
      neurochat_workdir: window.localStorage.getItem('neurochat_workdir') ?? '',
      neurochat_skill_policy_v2: window.localStorage.getItem('neurochat_skill_policy_v2') ?? '',
      neurochat_security_events: window.localStorage.getItem('neurochat_security_events') ?? '',
      'NeuroChat-avatar': window.localStorage.getItem('NeuroChat-avatar') ?? '',
      'neurochat-user-name': window.localStorage.getItem('neurochat-user-name') ?? '',
      'NeuroChat-child-name': window.localStorage.getItem('NeuroChat-child-name') ?? '',
      neurochat_v2_summary_cooldown: window.localStorage.getItem('neurochat_v2_summary_cooldown') ?? '',
      neurochat_learning_turn_counts: window.localStorage.getItem('neurochat_learning_turn_counts') ?? '',
      neurochat_encryption_key: window.localStorage.getItem('neurochat_encryption_key') ?? '',
      ...readLegacyLearningData(window.localStorage),
    },
  };

  await backend.migrate(payload);

  LEGACY_KEYS.forEach((k) => window.localStorage.removeItem(k));
  Object.keys(readLegacyLearningData(window.localStorage)).forEach((k) => window.localStorage.removeItem(k));
}
