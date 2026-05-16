# 🧠 NeuroChat

> **Votre Compagnon de Vie qui Voit et Ressent** — Un ami IA multimodal, proactif et empathique avec mémoire SQLite persistante, analyse émotionnelle et design premium.

<div align="center">
  <img src="./public/header2.png" alt="Bannière NeuroChat" width="100%">

  ![build](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge)
  ![version](https://img.shields.io/badge/version-2.4.0--companion-blueviolet?style=for-the-badge)
  ![license](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
  ![platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=for-the-badge)
  ![vitest](https://img.shields.io/badge/vitest-running-yellow?style=for-the-badge)
  ![tests](https://img.shields.io/badge/tests-142-brightgreen?style=for-the-badge)
  
  **[Fonctionnalités](#-fonctionnalités) · [Démarrage Rapide](#-démarrage-rapide) · [Architecture](#-architecture) · [Runtime Agentique](#-runtime-agentique--skills) · [Contribution](#-contribution)**
</div>

---

## 🌟 Pourquoi NeuroChat ?

La plupart des assistants IA sont des outils passifs qui attendent vos ordres. **NeuroChat est un compagnon de vie.** 

Il s'exécute silencieusement sur votre bureau, perçoit votre environnement via votre caméra, ressent votre état émotionnel par votre voix, et adapte son comportement à votre rythme biologique (matin, focus, détente, repos). Grâce à sa mémoire SQLite à long terme et son auto-apprentissage, il devient une extension de vous-même, capable d'anticiper vos besoins et de vous soutenir moralement et techniquement.

---

## ✨ Fonctionnalités Clés

### 🎭 Intelligence Émotionnelle & Empathie Visuelle
NeuroChat ne se contente pas d'écouter les mots, il perçoit l'âme de l'interaction.
- **EmotionEngine™** : Analyse en temps réel du RMS audio et de la cadence pour inférer votre énergie.
- **Vision Empathique** : Détection des micro-expressions et de la posture pour ajuster son ton.
- **Avatar Réactif** : Un avatar 3D/SVG qui réagit physiquement à votre présence (regard, inclinaison).

### 🕰️ Rituels de Vie & Proactivité (v2.4)
L'IA synchronisée sur votre horloge biologique et vos habitudes.
- **Cycle Circadien** : Adaptation dynamique du style de réponse (énergique le matin, apaisant le soir).
- **Silence Intelligent** : En mode "Focus", NeuroChat observe mais n'intervient que si vous semblez bloqué ou fatigué.
- **Journal de Bord Automatique** : Résumé quotidien des accomplissements et de l'humeur.

### 🧠 Mémoire Cognitive & Recherche Sémantique
- **Voute de Conversation (Vault)** : Interface premium pour explorer vos souvenirs et les apprentissages de l'IA.
- **Database Inspector** : Outil intégré pour visualiser et gérer vos données locales en toute transparence.
- **Vector Store SQLite** : Recherche sémantique instantanée sur des milliers de sessions passées.

### 👁️ Vision Contextuelle Avancée
- **Double Flux** : Analyse simultanée de votre caméra et de votre écran.
- **Détection de Changement Smart** : Évite les hallucinations en n'analysant que les changements visuels significatifs (>15%).
- **Analyse de Documents** : Capacité à lire et comprendre des documents physiques présentés à la caméra.

---

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** ≥ 20.x
- **Clé API Gemini** — Le moteur multimodal de NeuroChat.
- **Clé API OpenRouter** — Optionnelle, pour le failover et les modèles spécialisés.

### Installation & Lancement

```bash
# Clonez le dépôt
git clone https://github.com/moonback/NeuroChat.git
cd NeuroChat

# Installez les dépendances
npm install

# Configurez votre environnement
cp .env.example .env

# Lancez l'expérience
npm run electron:dev
```

---

## 🏗 Architecture & Système

NeuroChat repose sur une architecture de **Runtime Agentique** pilotée par des compétences en Markdown :

- **Supervisor Agent** : Coordonne les tâches complexes et délègue aux agents spécialisés.
- **Dynamic Skill Activation** : L'IA ne charge que les compétences nécessaires (Fichiers, Web, Analyse) pour économiser les ressources.
- **Bridge IPC Sécurisé** : Communication fluide entre l'interface React et le système Electron.

---

## 🗺️ Roadmap Prioritaire

- [x] **v2.3** : Migration SQLite & EmotionEngine.
- [x] **v2.4** : Database Inspector & Optimisation de la Vision.
- [ ] **v3.0** : Intégration domotique (Home Assistant) & Coaching Postural.
- [ ] **v3.5** : Synchronisation mobile E2EE (Compagnon de poche).

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez notre [Guide de Contribution](CONTRIBUTING.md).

---

<div align="center">
  <sub>Fait avec ❤️ par <a href="https://github.com/moonback">moonback</a></sub>
</div>
