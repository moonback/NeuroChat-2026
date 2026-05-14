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
- **🌐 Contrôle du Navigateur** : L'assistant peut maintenant contrôler votre navigateur pour vous aider dans vos tâches web (navigation, recherche, interaction avec les pages).

### 🧠 Mémoire & Continuité
- **Mémoire Persistante** : NeuroChat se souvient des échanges précédents pour offrir des réponses contextuelles et éviter les répétitions.
- **Analyse du Temps** : Conscience de la date, de l'heure et des périodes de la journée pour une pertinence maximale.
- **Confidentialité Locale** : Toutes vos données de session et votre historique sont stockés localement dans votre navigateur (Privacy-first).

### 🌐 Contrôle du Navigateur (NOUVEAU !)
- **Navigation Vocale** : Dites simplement "Va sur Google" ou "Ouvre YouTube" et l'assistant s'en charge
- **Recherche Intelligente** : "Cherche la météo à Paris" lance automatiquement une recherche Google
- **Fenêtre Intégrée** : Naviguez dans une fenêtre élégante contrôlée par l'assistant
- **Sécurité Renforcée** : Confirmations pour les actions sensibles
- **Historique des Actions** : Suivez toutes les actions effectuées par l'assistant

👉 **[Guide Rapide du Contrôle du Navigateur](GUIDE_RAPIDE_NAVIGATEUR.md)**
📖 **[Documentation Complète](BROWSER_CONTROL.md)**

### 🔄 Auto-Amélioration Continue
- **Apprentissage Automatique** : Le système analyse automatiquement la qualité des conversations et améliore ses réponses au fil du temps.
- **Détection de Patterns** : Identification des signaux implicites (interruptions, clarifications, satisfaction) pour optimiser le comportement.
- **Versioning Intelligent** : Historique complet des améliorations avec rollback automatique en cas de régression.
- **Sécurité Garantie** : Les sections critiques (identité, confidentialité) sont protégées et ne peuvent jamais être modifiées automatiquement.

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
- `src/lib/learning/` : Système d'auto-amélioration avec analyse de performance et optimisation de prompts.
  - `feedbackCollector.ts` : Collecte automatique des signaux de qualité
  - `performanceAnalyzer.ts` : Analyse des métriques (concision, proactivité, satisfaction)
  - `promptOptimizer.ts` : Génération de propositions d'amélioration
  - `improvementValidator.ts` : Validation des contraintes de sécurité
  - `regressionDetector.ts` : Détection et rollback automatique des régressions

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

NeuroChat inclut une suite de tests rigoureuse pour garantir la stabilité de ses systèmes critiques (mémoire, prompts, apprentissage).

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

### Couverture des Tests
- ✅ **120 tests** couvrant tous les composants critiques
- ✅ Tests unitaires pour chaque module du système d'apprentissage
- ✅ Tests d'intégration pour les cycles d'amélioration complets
- ✅ Tests de propriétés (property-based testing) pour les invariants système
- ✅ Tests de sécurité pour les contraintes de protection

---

## 🔐 Sécurité & Confidentialité

- **Privacy by Design** : Aucune donnée n'est envoyée à un serveur tiers (hormis l'API Gemini). Votre historique reste sur votre machine.
- **Chiffrement Local** : Les données d'apprentissage sont chiffrées avec AES-GCM avant stockage dans le navigateur.
- **Contraintes de Sécurité** : Le système d'auto-amélioration ne peut jamais modifier les sections critiques (identité, confidentialité, contraintes TTS).
- **Audit Complet** : Tous les événements de sécurité sont journalisés et accessibles dans l'interface de transparence.

---

## 🎛️ Contrôles Utilisateur

NeuroChat vous donne un contrôle total sur le système d'apprentissage :

- **Panneau de Contrôle** : Activez/désactivez les améliorations automatiques à tout moment
- **Cycles Manuels** : Déclenchez un cycle d'apprentissage quand vous le souhaitez
- **Historique des Versions** : Consultez toutes les améliorations appliquées avec leurs métriques de performance
- **Rollback Facile** : Revenez à n'importe quelle version précédente en un clic
- **Transparence Totale** : Visualisez les événements de sécurité et les décisions du système

## 📊 Métriques de Performance

Le système d'auto-amélioration surveille en continu :

- **Concision** : Ratio de mots par rapport à la cible optimale (35-45 mots)
- **Conscience Contextuelle** : Pourcentage de réponses référençant l'historique
- **Proactivité** : Fréquence des suggestions et questions de suivi
- **Satisfaction Utilisateur** : Score basé sur les signaux implicites et explicites
- **Score Composite** : Métrique globale de qualité (0-100)

## 🗺️ Vision & Roadmap
Consultez notre [ROADMAP.md](ROADMAP.md) pour découvrir les prochaines étapes, incluant l'intégration RAG (Long Term Memory) et les outils de productivité (Agenda, Email).

## 📚 Documentation Technique

Pour une compréhension approfondie du système :

- **[ARCHITECTURE.md](ARCHITECTURE.md)** : Architecture globale de l'application
- **[MEMORY_SYSTEM.md](MEMORY_SYSTEM.md)** : Système de mémoire conversationnelle
- **[.kiro/specs/self-improving-system-prompt/](/.kiro/specs/self-improving-system-prompt/)** : Spécifications complètes du système d'auto-amélioration
  - `requirements.md` : Exigences fonctionnelles et non-fonctionnelles
  - `design.md` : Architecture et décisions de conception
  - `tasks.md` : Plan d'implémentation détaillé (✅ 100% complété)

---
*Développé pour repousser les limites de l'assistance personnelle IA.*
