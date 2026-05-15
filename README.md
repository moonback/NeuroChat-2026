# 🧠 NeuroChat

NeuroChat est un assistant personnel professionnel multimodal qui vit sur votre bureau. Il combine la puissance de l'IA générative (vision, voix, contrôle du navigateur) avec un système de mémoire à long terme persistant et un moteur d'auto-amélioration continue. Conçu pour booster la productivité quotidienne, il transforme chaque interaction en une étape vers une assistance plus personnalisée.

---

<div style="display: flex; margin: auto; justify-content: center; align-items: center; flex-direction: column;">
    <img src="./public/header.png" alt="Logo NeuroChat" width="auto">
</div>

## 🚀 Badges

![build](https://img.shields.io/badge/build-passing-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)
![version](https://img.shields.io/badge/version-2.0.0--beta-orange)
![platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

---

## 🛠 Stack Technique

| Technologie | Rôle | Version |
| :--- | :--- | :--- |
| **React** | Framework Frontend | 19.0.1 |
| **Vite** | Build Tool & Dev Server | 6.2.3 |
| **Electron** | Environnement Desktop | 35.0.0 |
| **TypeScript** | Langage | 5.8.2 |
| **Tailwind CSS** | Styling | 4.1.14 |
| **Google Gemini** | Modèles Multimodaux (Live, Vision, Audio) | v1beta |
| **OpenRouter** | Service LLM de secours / Synthèses (DeepSeek v4 Flash) | API |
| **Vitest** | Framework de Tests | 4.1.6 |

---

## ✨ Fonctionnalités Ultra-Détaillées

### 👁️ Vision Multimodale Contextuelle
NeuroChat ne se contente pas de discuter ; il voit votre environnement de travail pour mieux vous aider.
- **Partage d'écran en temps réel** : Capture intelligente via `desktopCapturer` d'Electron permettant à l'IA d'analyser vos documents, codes ou présentations.
- **Gestion Multicaméra** : Sélecteur dynamique permettant de basculer entre la caméra frontale, arrière ou des périphériques externes.
- **Analyse de Flux Vidéo** : Envoi de frames JPEG optimisées au modèle Gemini pour une compréhension visuelle fluide et à faible latence.

### 🎙️ Pipeline Audio Haute Performance
Une interaction naturelle grâce à un traitement sonore de niveau professionnel.
- **Flux Bidirectionnel (Full Duplex)** : Parlez et écoutez en même temps avec une latence minimale.
- **VAD (Voice Activity Detection)** : Détection intelligente du silence et de la parole pour éviter les interruptions inutiles.
- **Réduction de Bruit & Écho** : Traitement audio avancé pour une clarté optimale même dans des environnements bruyants.
- **Synthèse Vocale (TTS)** : Retour vocal naturel pour une expérience mains-libres complète.

### 🌐 Contrôle Autonome du Navigateur (v2)
L'assistant dispose d'un moteur de contrôle de précision pour agir sur le web.
- **CommandParser v2** : Analyse sémantique avancée avec scoring de confiance (>0.7) et lookaheads négatifs pour distinguer l'intention réelle de la simple discussion.
- **Support Multi-commandes** : Capacité d'exécuter des séquences complexes (ex: "Ouvre Google, cherche X, puis scrolle en bas") en une seule itération.
- **Interactions Étendues** : Gestion des onglets (ouvrir/fermer/suivant), contrôle du zoom, capture d'écran, et gestion du presse-papier (copier/coller).
- **Navigation Sémantique** : Résolution intelligente des sélecteurs via analyse du DOM par l'IA.

### 🧠 Mémoire Long-Terme & RAG (Retrieval Augmented Generation)
NeuroChat se souvient de tout ce qui est important pour vous.
- **Vector Store Local** : Stockage sécurisé des embeddings (`gemini-embedding-001`) directement sur votre machine.
- **Recherche Sémantique** : Recherche par "sens" plutôt que par mots-clés simples.
- **Synthèses Automatiques** : Utilisation de modèles Flash (DeepSeek v4) via OpenRouter pour générer des résumés de sessions à faible coût.

### 🚀 NeuroLearning : Système d'Auto-Évolution
Le premier assistant qui apprend de ses erreurs et s'améliore tout seul.
- **Collecte de Feedback** : Analyse discrète des réactions de l'utilisateur pour évaluer la qualité des réponses.
- **Cycle d'Apprentissage (Learning Cycle)** : Analyse périodique de l'historique pour générer des propositions d'amélioration du prompt système.
- **Monitoring de Régression** : Surveillance constante des performances après chaque mise à jour. Si une version est moins efficace, le système effectue un **Rollback automatique**.
- **Historique des Versions** : Suivi complet de l'évolution de la personnalité et des capacités de l'IA.
- **Visualisation Transparente** : Retrouvez la liste exacte des améliorations appliquées et leurs justifications (le "pourquoi") directement dans l'onglet *Apprentissage* du Coffre des Conversations.

### 🔒 Privacy & Desktop Native
- **100% Local Data** : Vos conversations, préférences et vecteurs ne quittent jamais votre machine (stockage LocalStorage/Electron).
- **Intégration OS** : Accès direct aux capacités du système sans les limitations des navigateurs standards.

---

## 📋 Prérequis

- **Node.js** : v20.x ou supérieure
- **npm** : v10.x ou supérieure
- **Clé API Gemini** : Requise pour le flux multimodal live et les embeddings.
- **Clé API OpenRouter** : Optionnelle mais recommandée pour les synthèses et le failover.

---

## ⚙️ Installation

1. **Cloner le repository** :
   ```bash
   git clone https://github.com/moonback/NeuroChat.git
   cd NeuroChat
   ```

2. **Installer les dépendances** :
   ```bash
   npm install
   ```

3. **Configurer l'environnement** :
   ```bash
   cp .env.example .env
   # Éditez le fichier .env avec vos clés API
   ```

---

## 📂 Configuration

Les variables suivantes doivent être définies dans votre fichier `.env` :

| Variable | Description | Exemple | Obligatoire |
| :--- | :--- | :--- | :--- |
| `VITE_GEMINI_API_KEY` | Clé pour Google Gemini Multimodal | `AIzaSy...` | Oui |
| `VITE_OPENROUTER_API_KEY` | Clé pour OpenRouter (Synthèses) | `sk-or-...` | Optionnel |

---

## 🚀 Lancement

### Mode Développement
```bash
# Pour le Web (Navigateur standard)
npm run dev

# Pour Desktop (Electron)
npm run electron:dev
```

### Mode Production
```bash
# Build pour le Web
npm run build

# Build pour Desktop
npm run build:electron
```

### 📦 Création de l'Exécutable (.exe)
```bash
# Packager l'application en un installeur Windows (.exe)
# Le fichier généré se trouvera dans le dossier dist-electron/
npm run package
```

---

## 🏗 Structure du Projet

```text
NeuroChat/
├── electron/              # Main process et config Electron
├── src/
│   ├── components/        # Composants UI (React)
│   ├── hooks/             # Logique réutilisable (Hooks)
│   ├── lib/               # Services, AI, et Logique métier
│   │   ├── learning/      # Système d'auto-amélioration
│   │   ├── browserControl # Contrôle du navigateur
│   │   └── ...
│   ├── test/              # Tests unitaires et d'intégration
│   └── main.tsx           # Point d'entrée React
└── vite.config.ts         # Configuration de build
```

---

## 🤖 Agent Runtime & Skills (Phase 3)

NeuroChat utilise un runtime agentique modulaire inspiré des architectures de type Claude/OpenAI Agents, optimisé pour la latence et la fiabilité.

### Système de Skills Hybride
1. **Hardcoded Skills** (`src/lib/skills/`) : Actions complexes nécessitant un accès système (navigateur, fichiers, OS).
2. **Markdown Skills** (`src/skills-md/`) : Définitions de compétences injectées dynamiquement dans le prompt système via un moteur de globbing. Permet d'étendre les capacités de l'agent sans modifier le code source.

### Architecture du Runtime

```text
src/lib/agent/
├── types.ts               # Contrats AgentStep, events, run options
├── orchestrator.ts        # Boucle plan → tool → observation → réponse
├── planner.ts             # Construction du prompt de planification
├── parser.ts              # Validation/parse des steps modèle
├── executor.ts            # Exécution des tool calls via SkillRegistry
├── modelGateway.ts        # Gemini/OpenRouter + fallback + tool-calling natif
├── createAgentRuntime.ts  # Wiring runtime par défaut
├── service.ts             # Service singleton d'exécution agent
└── traceStore.ts          # Persistance locale des traces agent

src/lib/skills/
├── types.ts               # Contrats SkillDefinition/permissions/schema
├── registry.ts            # Enregistrement, recherche, exécution, cooldown
├── policies.ts            # Authorizer + confirmation runtime
├── policyStore.ts         # Persistance config policy
├── browser/               # Skills navigateur
├── memory/                # Skills mémoire
├── desktop/               # Skills desktop
└── ai/                    # Skills IA utilitaires
```

### Capacités agentiques disponibles
- **Modèle de Confiance** : Validation des intentions via lookbehinds/lookaheads pour éliminer les faux positifs.
- **Tool-calling natif provider**: exécution prioritaire via `completeStepWithTools(...)`.
- **Fallback multi-provider**: chaîne de gateways (Gemini puis OpenRouter par défaut).
- **Observabilité**: Historique persistant de chaque étape de réflexion de l'agent.

### Skills par défaut
- `open_website`, `extract_page` : Navigation web.
- `pick_workdir`, `list_files`, `read_file`, `write_file` : Système de fichiers local.
- `save_memory_note`, `retrieve_context` : Mémoire persistante.
- `summarize_text`, `get_desktop_info` : Système & IA.

Tu peux ajouter des skills de prompt en Markdown dans `src/skills-md/*.md` (chargées automatiquement dans le system prompt).

### Intégration UI

- `useAIConversation` expose:
  - `runAgentTask(...)`
  - `processUserText(...)`
  - `shouldAutoRunAgent(...)`
- Le mode live déclenche automatiquement l’agent sur certaines intentions, puis injecte la réponse dans le flux UI/audio.
- Le `DebugPanel` permet:
  - inspection des traces agent
  - filtres user/session
  - replay chronologique event-by-event
  - édition/sauvegarde de la policy runtime

### Commandes de test & Qualité
- **Parser Unit Tests** : Suite de tests intégrée couvrant plus de 30 cas limites.
- **Vite Test Runner** : Lancement automatique des tests en mode développement.

```bash
# Lancer les tests de l'orchestrateur et des skills
npm run test -- src/test/agent.* src/test/skills.*
```

---

## 🤝 Contribuer

Nous accueillons les contributions avec plaisir ! Veuillez consulter notre [GUIDE DE CONTRIBUTION](file:///c:/Users/Mayss/Documents/GitHub/NeuroChat/CONTRIBUTING.md) pour plus de détails sur le workflow et les standards de code.

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier `LICENSE` pour plus d'informations.

---

> ⚠️ À compléter : Ajouter un fichier `LICENSE` à la racine du projet.
