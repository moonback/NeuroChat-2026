# Suivi d'implémentation des corrections NeuroChat

Ce fichier suit les corrections issues de l'audit CTO. Les priorités sont classées selon l'impact sécurité, stabilité, performance et qualité produit.

## Légende

- **P0** : bloquant / critique avant usage réel.
- **P1** : important pour stabiliser la version desktop.
- **P2** : amélioration structurante.
- **Statut** : `À faire`, `En cours`, `Fait`, `Partiel`.

## Corrections P0

| ID | Correction | Domaine | Statut | Notes |
|---|---|---|---|---|
| P0-001 | Corriger l'injection de mémoire async dans le system prompt | IA / mémoire | Fait | `buildSystemPromptAsync` charge la mémoire avant injection et le builder sync n'injecte plus de Promise. |
| P0-002 | Corriger le typecheck cassé dans les tests learning | Qualité | Fait | Le test utilise désormais le contrat complet `FeedbackSignal` avec `content`. |
| P0-003 | Corriger le timing force-send camera/screen | Performance / vision | Fait | Timestamp d'envoi séparé du timestamp de traitement pour caméra et écran. |
| P0-004 | Ajouter une première barrière IPC filesystem | Sécurité | Fait | Les opérations FS sont limitées aux dossiers de travail explicitement sélectionnés, avec validation type/longueur/null-byte, limites de taille et blocage mutations racine/système. |
| P0-005 | Supprimer le stripping global CSP / X-Frame-Options | Sécurité | Fait | Le stripping global est désactivé par défaut et seulement accessible via flag env explicitement dangereux. |
| P0-006 | Sortir les clés API du renderer | Sécurité | Partiel | OpenRouter Desktop passe par IPC main process avec `OPENROUTER_API_KEY`; Gemini Live reste à sortir du renderer. |
| P0-007 | Ajouter limites de taille sur lecture fichiers | Sécurité / stabilité | Fait | Lecture limitée à 2 MiB et écriture limitée à 1 MiB côté main process. |
| P0-008 | Éviter les sauvegardes destructives du vector store SQLite | Mémoire / données | Fait | `saveVectors` upsert puis prune uniquement les IDs absents pour les utilisateurs touchés; clear user passe par `clearVectors(userName)`. |

## Corrections P1

| ID | Correction | Domaine | Statut | Notes |
|---|---|---|---|---|
| P1-001 | Découper `App.tsx` en contrôleurs runtime | Architecture | Fait | `RuntimeProvider`, `VisionController` et `SessionController` isolent état runtime, vision et orchestration de session. |
| P1-002 | Worker embeddings Transformers | Fait | Le backend `@xenova/transformers` est chargé dynamiquement dans un Web Worker dédié au premier embedding. |
| P1-003 | Code splitting des panels lourds | Performance | Fait | Panels lourds en `React.lazy` et découpage Vite manuel des vendors React/Motion/Lucide/GenAI/Transformers/ONNX pour réduire le chunk principal. |
| P1-004 | Permission center utilisateur | Sécurité / UX | Fait | Onglet Permissions avec scopes par ressource/niveau, expiration temporelle et denylist de skills. |
| P1-005 | Remplacer `window.confirm` par confirmation auditée | Sécurité / UX | Fait | Les confirmations de skills sensibles utilisent une modale dédiée avec badge de risque, focus par défaut sur le refus, contexte tronqué et journalisation acceptation/refus sans persister le contexte brut. |
| P1-006 | Journal d'audit local | Sécurité | Fait | Journal JSONL local `security-audit.jsonl` pour autorisations workspace, opérations FS sensibles et appels OpenRouter, sans contenu ni chemins bruts. |
| P1-007 | Memory timeline éditable | UX / IA | Fait | Les sessions et messages du coffre peuvent être modifiés ou oubliés avec resynchronisation vectorielle. |

## Corrections P2

| ID | Correction | Domaine | Statut | Notes |
|---|---|---|---|---|
| P2-001 | State machine agent durable | Agentique | À faire | Reprise de tâches, budgets, cancellations. |
| P2-002 | Tool dry-run / rollback | Agentique / sécurité | À faire | Preview avant exécution sensible. |
| P2-003 | Intégration MCP sandboxée | Agentique | À faire | Allowlist + policy. |
| P2-004 | Provider local Ollama | Souveraineté IA | À faire | Mode offline/local-first. |
| P2-005 | OCR / screen semantic layer | Multimodal | À faire | Perception structurée de l'écran. |

## Journal d'implémentation

### 2026-05-16

- Création du fichier de suivi des corrections.
- P0-001 terminé : ajout de `buildSystemPromptAsync` et migration des sessions Gemini/OpenRouter + learning runner.
- P0-002 terminé : correction du contrat `FeedbackSignal` dans le test learning.
- P0-003 terminé : correction du force-send caméra/écran via `lastFrameSentTime`.
- P0-004 / P0-007 terminés : IPC FS désormais limité aux dossiers explicitement sélectionnés via le dialogue natif, avec validations de chemin, limites de taille et blocage des mutations système.
- P0-005 terminé : retrait du stripping global CSP/X-Frame-Options par défaut, désormais uniquement derrière `NEUROCHAT_ALLOW_UNSAFE_FRAME_HEADER_STRIPPING=true`.
- P0-008 terminé : sauvegarde vectorielle SQLite convertie en upsert + prune ciblé, et suppression utilisateur déléguée à `clearVectors(userName)`.
- Correction complémentaire : résolution cross-platform des chemins relatifs dans le BrowserController pour éviter les chemins Windows-only (`\\`) sur Linux/macOS.
- P0-006 partiel : appels OpenRouter Desktop déplacés derrière IPC Electron (`ai:openrouter:*`) avec clé lue côté main process; fallback web `VITE_OPENROUTER_API_KEY` conservé uniquement pour usage navigateur.
- P1-001 terminé : extraction de l’état runtime partagé dans `RuntimeProvider`, du cycle caméra/écran dans `VisionController` et de l’orchestration conversation/audio/actions dans `SessionController`.
- P1-003 terminé : code-splitting des panels lourds (`ConversationVault`, `DatabaseInspector`, `DebugPanel`, `AgentChat`) via `React.lazy` et rendu conditionnel pour les panels à la demande.
- P1-002 terminé : `@xenova/transformers` est retiré du thread principal et chargé dynamiquement dans `embeddingWorker.ts`; le vector store communique avec le worker par messages corrélés.
- P1-006 terminé : ajout d’un audit local JSONL (`security-audit.jsonl`) pour les autorisations de workspace, opérations FS sensibles et appels OpenRouter, avec hash de chemin au lieu de chemins bruts.
- Optimisation bundle : ajout de `manualChunks` Vite pour séparer React, Motion, Lucide, GenAI, Transformers et ONNX du chunk applicatif principal.
- P1-005 terminé : remplacement de `window.confirm` dans le handler de confirmation des skills par une modale contrôlée avec badge de risque, focus par défaut sur le refus, contexte tronqué, focus restauré et journalisation acceptation/refus sans persister le contexte brut.
- P1-004 terminé : ajout d’un centre de permissions dans le coffre avec durée d’expiration, droits scoped par ressource/niveau et denylist de skills.
- P1-007 terminé : timeline mémoire éditable avec modification/suppression de messages, oubli de sessions et resynchronisation des vecteurs utilisateur.
