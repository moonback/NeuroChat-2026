# NeuroChat AI 🎙️🧠

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Gemini-Live_API-orange.svg)](https://ai.google.dev/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest-yellow.svg)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **NeuroChat AI** est un assistant personnel intelligent de nouvelle génération. Conçu pour la productivité et l'accompagnement quotidien, il combine une interface vocale ultra-réactive avec une mémoire conversationnelle persistante pour une expérience fluide et personnalisée.

---

## 🌟 L'Expérience NeuroChat

L'application transforme l'interaction avec l'IA en une conversation naturelle et sans friction. Grâce à l'intégration de **Gemini Live API**, NeuroChat offre une latence ultra-faible permettant une véritable interaction fluide, sans bouton "Push-to-talk".

### 🎭 Assistant Intelligent
- **Nova** 🛰️ : Votre assistant principal, proactif et polyvalent. Spécialisé dans l'organisation, la productivité et la gestion du temps.
- **Personnalité Adaptative** : Le ton et le style de réponse s'adaptent dynamiquement à l'heure de la journée et au contexte de vos échanges.

### 🧠 Mémoire & Continuité
- **Mémoire Persistante** : NeuroChat se souvient des échanges précédents pour offrir des réponses contextuelles et éviter les répétitions.
- **Analyse du Temps** : Conscience de la date, de l'heure et des périodes de la journée pour une pertinence maximale.
- **Confidentialité Locale** : Toutes vos données de session et votre historique sont stockés localement dans votre navigateur (Privacy-first).

---

## 🛠️ Excellence Technique

### Stack Moderne
- **Core** : React 19 + TypeScript (Typage strict pour une robustesse maximale).
- **Style** : Tailwind CSS v4 + Motion (Animations 60fps fluides).
- **IA** : Google GenAI SDK (Multimodal Live API) avec streaming PCM 16-bit bidirectionnel.
- **Tests** : Suite complète de tests unitaires avec **Vitest**.

### Structure du Code
- `src/lib/AudioRecorder.ts` : Capture audio haute performance via AudioWorklet.
- `src/lib/conversationMemory.ts` : Gestionnaire de contexte et de persistance locale.
- `src/lib/systemPrompt.ts` : Moteur de génération de prompt dynamique.

---

## 🚀 Installation & Développement

1. **Clonage & Installation**
   ```bash
   git clone https://github.com/votre-username/NeuroChat.git
   npm install
   ```

2. **Configuration**
   Créez un fichier `.env` à la racine :
   ```env
   VITE_GEMINI_API_KEY=votre_cle_gemini_ici
   ```

3. **Lancement**
   ```bash
   npm run dev
   ```

---

## 🧪 Tests

NeuroChat inclut une suite de tests rigoureuse pour garantir la stabilité de ses systèmes critiques (mémoire, prompts).

- **Lancer tous les tests** :
  ```bash
  npm test
  ```
- **Mode Watch (développement)** :
  ```bash
  npm run test:watch
  ```
- **Interface UI Vitest** :
  ```bash
  npm run test:ui
  ```

---

- **Privacy by Design** : Aucune donnée n'est envoyée à un serveur tiers (hormis l'API Gemini). Votre historique reste sur votre machine.

---

## 🗺️ Vision & Roadmap
Consultez notre [ROADMAP.md](ROADMAP.md) pour découvrir les prochaines étapes, incluant l'intégration RAG (Long Term Memory) et les outils de productivité (Agenda, Email).

---
*Développé pour repousser les limites de l'assistance personnelle IA.*
