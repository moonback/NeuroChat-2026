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

function readLegacyLearningData(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('neurochat_learning_')) continue;
    const value = localStorage.getItem(key);
    if (value) out[key] = value;
  }
  return out;
}

export async function runOneShotStorageMigration(): Promise<void> {
  if (!window.neurochatElectron?.db) return;

  const backend = getStorageBackend();
  const done = await backend.getItem('migration_v1_done');
  if (done === 'true') return;

  const vectorsRaw = localStorage.getItem('neurochat_v2_vectors');
  const sessionsRaw = localStorage.getItem('neurochat_v2_memory');
  const profilesRaw = localStorage.getItem('neurochat_v2_user_profile');
  const summariesRaw = localStorage.getItem('neurochat_v2_weekly_summaries');
  const tracesRaw = localStorage.getItem('neurochat_agent_traces');

  const hasData = Boolean(vectorsRaw || sessionsRaw || profilesRaw || summariesRaw || tracesRaw || localStorage.getItem('neurochat_workdir'));
  if (!hasData) {
    await backend.setItem('migration_v1_done', 'true');
    return;
  }

  await backend.migrate({
    vectors: vectorsRaw ? JSON.parse(vectorsRaw) : [],
    sessions: sessionsRaw ? JSON.parse(sessionsRaw) : [],
    profiles: profilesRaw ? JSON.parse(profilesRaw) : {},
    summaries: summariesRaw ? JSON.parse(summariesRaw) : [],
    traces: tracesRaw ? JSON.parse(tracesRaw) : [],
    kv: {
      neurochat_workdir: localStorage.getItem('neurochat_workdir') ?? '',
      neurochat_skill_policy_v2: localStorage.getItem('neurochat_skill_policy_v2') ?? '',
      neurochat_security_events: localStorage.getItem('neurochat_security_events') ?? '',
      'NeuroChat-avatar': localStorage.getItem('NeuroChat-avatar') ?? '',
      'neurochat-user-name': localStorage.getItem('neurochat-user-name') ?? '',
      'NeuroChat-child-name': localStorage.getItem('NeuroChat-child-name') ?? '',
      neurochat_v2_summary_cooldown: localStorage.getItem('neurochat_v2_summary_cooldown') ?? '',
      neurochat_learning_turn_counts: localStorage.getItem('neurochat_learning_turn_counts') ?? '',
      neurochat_encryption_key: localStorage.getItem('neurochat_encryption_key') ?? '',
      ...readLegacyLearningData(),
    },
  });

  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  Object.keys(readLegacyLearningData()).forEach((k) => localStorage.removeItem(k));
}
