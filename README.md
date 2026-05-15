# 🧠 NeuroChat

> **Votre Copilote Desktop boosté à l'IA** — Un assistant personnel multimodal et vocal avec mémoire persistante, manipulation autonome de fichiers et moteur d'auto-évolution.

<div align="center">
  <img src="./public/header.png" alt="Bannière NeuroChat" width="100%">

  ![build](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge)
  ![version](https://img.shields.io/badge/version-2.1.0--beta-blueviolet?style=for-the-badge)
  ![license](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
  ![platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=for-the-badge)

  **[Fonctionnalités](#-fonctionnalités)** · **[Démarrage Rapide](#-démarrage-rapide)** · **[Architecture](#-architecture)** · **[Runtime Agentique](#-runtime-agentique--skills)** · **[Contribution](#-contribution)**
</div>

---

## 🌟 Pourquoi NeuroChat ?

La plupart des assistants IA vivent dans un onglet de navigateur et vous oublient dès que la page est fermée. **NeuroChat est différent.** Il s'exécute nativement sur votre bureau, se souvient de chaque conversation via une mémoire sémantique persistante (SQLite), manipule vos fichiers de manière autonome et apprend continuellement de vos retours pour s'améliorer — tout en gardant vos données 100% locales.

---

## ✨ Fonctionnalités

### 🎙️ Interaction Multimodale Vocale
Parlez naturellement avec votre assistant grâce à l'audio full-duplex propulsé par Gemini Live.

| Capacité | Description |
|:---|:---|
| **Audio Temps Réel** | Flux full-duplex via WebSocket — parlez et écoutez simultanément |
| **Détection d'Activité Vocale (VAD)** | Détection intelligente des silences et de la parole avec sensibilité configurable |
| **Traitement Audio** | Suppression du bruit, annulation d'écho et gain auto via pipeline AudioWorklet |
| **Transcription Live** | Transcription en temps réel de votre voix et de celle de l'assistant |
| **Synthèse Vocale (TTS)** | Voix naturelles avec plusieurs profils configurables (Puck, etc.) |

### 👁️ Vision Contextuelle
NeuroChat voit ce que vous voyez et comprend votre contexte visuel.
- **Partage d'écran** — Capture via `desktopCapturer` d'Electron pour une analyse d'écran en temps réel.
- **Support Multi-Caméra** — Basculez dynamiquement entre vos caméras frontale, arrière ou externe.
- **Pipeline Vidéo Optimisé** — Frames JPEG envoyées à Gemini avec un taux de rafraîchissement adaptatif.

### 🌐 Contrôle Autonome du Navigateur (v2)
Donnez des ordres vocaux pour naviguer sur le web sans aucune interaction manuelle.
- **CommandParser v2** — Analyse sémantique avec score de confiance (>0.7) et filtres pour distinguer le langage naturel des commandes réelles.
- **Séquençage Multi-Commandes** — *"Cherche les actus IA, puis scrolle vers le bas"* s'exécute comme un pipeline.
- **Contrôle Total** — Gestion des onglets, zoom, captures d'écran, presse-papier, défilement, navigation.
- **Couverture de tests 32/34** — Suite de tests de régression intégrée lancée à chaque démarrage.

### 📂 Système de Fichiers Agentique (NOUVEAU)
L'assistant manipule votre système de fichiers local via un pont IPC sécurisé.

```
Utilisateur : "Liste les fichiers dans mon dossier projet"
→ L'IA émet `list_files` → BrowserController exécute via IPC
→ Electron lit le dossier → Résultat injecté via sendClientContent()
→ L'IA répond : "J'ai trouvé 17 fichiers, dont..."
```

| Commande | Description |
|:---|:---|
| `pick_workdir` | Ouvre le sélecteur de dossier natif de l'OS |
| `list_files` | Liste le contenu du répertoire |
| `read_file <nom>` | Lit le contenu d'un fichier (jusqu'à 5 Ko) |
| `write_file <nom>` | Écrit ou crée un fichier |
| `delete_file <nom>` | Supprime un fichier ou un dossier |

- **Dossier de travail persistant** — Le dossier sélectionné est mémorisé d'une session à l'autre.
- **Résolution intelligente des chemins** — Les chemins relatifs sont auto-résolus par rapport au `currentWorkdir`.
- **IPC Bidirectionnel** — Les résultats reviennent à l'IA via `sendClientContent()` avec `turnComplete: true`.

### 🧠 Mémoire à Long Terme & RAG
NeuroChat se souvient de ce qui compte d'une session à l'autre grâce à une architecture robuste.
- **Base de données SQLite** — Stockage performant et structuré de vos données (vecteurs, sessions, profils).
- **Vector Store Local** — Embeddings sécurisés (`text-embedding-004`, 3072 dims) stockés nativement.
- **Recherche Sémantique** — Retrouvez vos conversations passées par le sens, pas seulement par mots-clés.
- **Résumés Hebdomadaires** — Synthèses auto-générées via DeepSeek v4 Flash (OpenRouter).
- **Coffre des Conversations** — Parcourez, recherchez et gérez tout votre historique.

### 🚀 NeuroLearning : Moteur d'Auto-Évolution
L'assistant qui apprend de ses erreurs et s'améliore de lui-même.
- **Feedback Implicite** — Détecte les signaux de satisfaction (répétitions, corrections, suivis).
- **Cycles d'Apprentissage** — L'analyse périodique génère des propositions d'amélioration du prompt système.
- **Surveillance de Régression** — Rollback automatique si une version du prompt est moins performante.
- **Historique des Versions** : Suivi complet de l'évolution de la personnalité et des capacités.
- **Interface Transparente** — Visualisez les améliorations appliquées et leur raisonnement.

---

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** ≥ 20.x
- **npm** ≥ 10.x
- **Clé API Gemini** — Requise pour les sessions live et les embeddings.
- **Clé API OpenRouter** — Optionnelle, pour les résumés et le failover LLM.

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/moonback/NeuroChat.git
cd NeuroChat

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditez .env avec vos clés API
```

### Lancement

```bash
# Desktop (Electron) — Recommandé
npm run electron:dev

# Web uniquement (Navigateur)
npm run dev
```

---

## 🏗 Architecture

```
src/
├── components/        # UI (Avatar, Browser, Vault, Debug, Learning)
├── hooks/             # Logique (Gemini Session, Agent Orchestration)
├── lib/               # Moteurs (CommandParser, BrowserControl, Memory, RAG)
│   ├── agent/         # Runtime Agentique (Orchestrator, Planner, Executor)
│   ├── skills/        # Compétences système codées en dur
│   └── learning/      # Système d'auto-amélioration
└── skills-md/         # Compétences dynamiques en Markdown
```

---

## 🤖 Runtime Agentique & Skills

NeuroChat utilise un runtime modulaire inspiré des architectures d'agents modernes, optimisé pour la voix en temps réel.

### Fonctionnement du Tool Loop

1. **L'utilisateur parle** : "Liste mes fichiers"
2. **L'IA répond** : émet la commande `list_files`
3. **CommandParser** : détecte l'intention et déclenche l'action système.
4. **BrowserController** : exécute l'action via le pont IPC Electron.
5. **Résultat** : injecté dans le contexte de l'IA via `sendClientContent()`.
6. **Réponse finale** : L'IA voit les données et répond vocalement : "J'ai trouvé 17 fichiers..."

### Système de Skills (Hybride)
- **Hardcoded Skills** (`src/lib/skills/`) : Actions système complexes (navigateur, fs).
- **Markdown Skills** (`src/skills-md/*.md`) : Compétences injectées via prompt. Ajoutez un fichier `.md` et il est chargé automatiquement.

---

## 📊 Métriques Clés

| Métrique | Valeur |
|:---|:---|
| Précision CommandParser | 94% (32/34 tests) |
| Dimensions Embeddings | 3072 (text-embedding-004) |
| Taille max lecture fichier | 5 000 caractères |
| Format Audio | PCM 16kHz mono |
| Persistance | SQLite (Desktop) / localStorage (Web) |

---

## 🗺️ Roadmap

- [x] Interaction vocale multimodale (Gemini Live)
- [x] Mémoire long terme avec RAG
- [x] Contrôle autonome du navigateur (v2)
- [x] Moteur d'auto-évolution (NeuroLearning)
- [x] Manipulation agentique du système de fichiers
- [x] Migration vers SQLite (Performance & Scalabilité)
- [x] Pont IPC bidirectionnel (`sendClientContent`)
- [ ] Collaboration multi-agents
- [ ] Marketplace de plugins pour skills communautaires
- [ ] Intégration du protocole MCP (Model Context Protocol)

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez notre [Guide de Contribution](CONTRIBUTING.md).

---

<div align="center">
  <sub>Fait avec ❤️ par <a href="https://github.com/moonback">moonback</a></sub>
</div>
