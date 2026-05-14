# 🗺️ Roadmap de Développement — NeuroChat

Ce document trace l'évolution de NeuroChat, de son état actuel aux visions futures.

---

## 🏁 V0 : Fondations Multimodales (Livré)
Les fonctionnalités de base pour une assistance quotidienne professionnelle.

- ✅ **Flux Multimodal Live** : Audio (VAD) et Vidéo (Screen/Cam) avec Gemini.
- ✅ **Système de Mémoire Persistant** : Stockage LocalStorage et RAG (Vector Store).
- ✅ **Synthèses Hebdomadaires** : Rapports automatiques via OpenRouter.
- ✅ **Contrôle du Navigateur** : Navigation autonome et exécution de commandes web.
- ✅ **Intégration Desktop** : Application native via Electron.

---

## 🚀 V1 : Optimisation & Robustesse (< 3 mois)
Améliorations prioritaires pour stabiliser l'expérience utilisateur et simplifier le développement.

| Statut | Fonctionnalité | Description |
| :--- | :--- | :--- |
| 🚧 **En cours** | **Auto-Amélioration** | Cycle de feedback automatique pour affiner le prompt système. |
| 🚧 **En cours** | **Monitoring Régression** | Détection automatique des baisses de score sur les nouveaux prompts. |
| 📋 **Planifié** | **Migration SQLite** | Remplacer LocalStorage par une vraie DB locale pour plus de performance. |
| 📋 **Planifié** | **Gestion Multi-Comptes** | Switcher facilement entre plusieurs profils utilisateurs. |
| 📋 **Planifié** | **Tests E2E Automatisés** | Suite Playwright pour tester les capacités de navigation de l'IA. |

---

## 🔮 V2+ : Vision Long Terme
Capacités avancées pour transformer NeuroChat en véritable agent autonome.

- 💡 **Exécution de Code Locale** : Capacité pour l'IA d'écrire et d'exécuter des scripts Python/JS locaux.
- 💡 **Plugins Système** : Intégration avec Calendrier, Emails et Outils de productivité (Notion, Slack).
- 💡 **RAG Hybride** : Connexion à des sources de données externes (Drive, Dropbox).
- 💡 **UI Dynamique** : L'IA peut générer des interfaces temporaires pour visualiser des données.

---

## 📋 Backlog (Idées)
- 💡 Mode "Concentration" qui filtre les notifications.
- 💡 Génération de rapports PDF mensuels.
- 💡 Support pour les modèles locaux via Ollama (Privacy maximum).

---

> ⚠️ À compléter : Dates cibles précises pour les jalons de la V1 après la prochaine réunion technique.
