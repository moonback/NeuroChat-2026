# NeuroChat AI 🎙️🧠

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-35-47848F.svg)](https://electronjs.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Gemini-Live_API-orange.svg)](https://ai.google.dev/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest-yellow.svg)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **NeuroChat AI** est un assistant personnel intelligent de nouvelle génération. Conçu pour la productivité et l'accompagnement quotidien, il combine une interface vocale ultra-réactive avec une mémoire conversationnelle persistante et un **contrôle du navigateur** pour une expérience fluide et personnalisée.

---

## 🌟 L'Expérience NeuroChat

L'application transforme l'interaction avec l'IA en une conversation naturelle et sans friction. Grâce à l'intégration de **Gemini Live API** et **Electron**, NeuroChat offre une latence ultra-faible permettant une véritable interaction fluide, sans bouton "Push-to-talk".

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

## 🌐 Contrôle du Navigateur

NeuroChat peut maintenant contrôler votre navigateur pour vous assister dans vos tâches web !

### Fonctionnalités
- **Navigation vocale** : "Va sur Google", "Ouvre YouTube"
- **Recherche intelligente** : "Cherche la météo à Paris"
- **Interaction avec les pages** : Clic, saisie, défilement
- **Fenêtre intégrée** : Navigation dans une interface élégante
- **Sécurité renforcée** : Confirmations pour les actions sensibles

### Utilisation Rapide
1. **Activez le contrôle** : Cliquez sur le bouton en haut à droite
2. **Parlez naturellement** : "Ouvre YouTube" ou "Cherche des recettes"
3. **Confirmez si nécessaire** : Autorisez les actions sensibles
4. **Naviguez librement** : Utilisez la fenêtre intégrée

### Guides Détaillés
- 📖 **[Guide Rapide](GUIDE_RAPIDE_NAVIGATEUR.md)** : Démarrage en 2 minutes
- 📚 **[Documentation Complète](BROWSER_CONTROL.md)** : Toutes les fonctionnalités

### 🔄 Auto-Amélioration Continue
- **Apprentissage Automatique** : Le système analyse automatiquement la qualité des conversations et améliore ses réponses au fil du temps.
- **Détection de Patterns** : Identification des signaux implicites (interruptions, clarifications, satisfaction) pour optimiser le comportement.
- **Versioning Intelligent** : Historique complet des améliorations avec rollback automatique en cas de régression.
- **Sécurité Garantie** : Les sections critiques (identité, confidentialité) sont protégées et ne peuvent jamais être modifiées automatiquement.

---

## 🛠️ Excellence Technique

### Stack Moderne
- **Core** : React 19 + TypeScript (Typage strict pour une robustesse maximale)
- **Desktop** : Electron 35 (Application native multiplateforme)
- **Style** : Tailwind CSS v4 + Motion (Animations 60fps fluides)
- **IA** : Google GenAI SDK (Multimodal Live API) avec streaming PCM 16-bit bidirectionnel
- **Tests** : Suite complète de tests unitaires avec **Vitest**

### Fonctionnalités Avancées
- **🌐 Contrôle du Navigateur** : L'assistant peut naviguer sur le web, effectuer des recherches et interagir avec les pages
- **🎨 Avatar Premium** : Robot avatar cinématographique avec animations 60fps et effets visuels avancés
- **🔧 Panneau de Débogage** : Logs en temps réel pour diagnostiquer et optimiser les performances
- **🔒 Sécurité Renforcée** : Confirmations pour les actions sensibles, chiffrement local des données

### Structure du Code
- `src/lib/AudioRecorder.ts` : Capture audio haute performance via AudioWorklet
- `src/lib/conversationMemory.ts` : Gestionnaire de contexte et de persistance locale
- `src/lib/systemPrompt.ts` : Moteur de génération de prompt dynamique
- `src/lib/browserControl.ts` : Système de contrôle du navigateur avec sécurité intégrée
- `src/components/avatars/` : Système d'avatar modulaire avec animations premium
- `src/lib/learning/` : Système d'auto-amélioration avec analyse de performance et optimisation de prompts
  - `feedbackCollector.ts` : Collecte automatique des signaux de qualité
  - `performanceAnalyzer.ts` : Analyse des métriques (concision, proactivité, satisfaction)
  - `promptOptimizer.ts` : Génération de propositions d'amélioration
  - `improvementValidator.ts` : Validation des contraintes de sécurité
  - `regressionDetector.ts` : Détection et rollback automatique des régressions

---

## 🚀 Installation & Développement

### Prérequis
- **Node.js** 18+ 
- **npm** ou **yarn**
- **Clé API Gemini** ([Obtenir ici](https://ai.google.dev/))

### Installation Rapide

1. **Clonage & Installation**
   ```bash
   git clone https://github.com/votre-username/NeuroChat.git
   cd NeuroChat
   npm install
   ```

2. **Configuration**
   Créez un fichier `.env` à la racine :
   ```env
   VITE_GEMINI_API_KEY=votre_cle_gemini_ici
   ```

### Modes de Lancement

#### 🌐 Mode Web (Navigateur)
```bash
# Développement
npm run dev

# Production
npm run build
npm run preview
```

#### 🖥️ Mode Desktop (Electron)
```bash
# Développement avec rechargement automatique
npm run electron:dev

# Build et lancement
npm run electron:start
```

### Avantages du Mode Desktop
- **Permissions étendues** : Accès complet au système de fichiers
- **Contrôle du navigateur amélioré** : Intégration native avec le système
- **Performance optimisée** : Pas de limitations du navigateur
- **Notifications système** : Alertes natives du système d'exploitation
- **Raccourcis clavier globaux** : Activation rapide depuis n'importe où

---

## 🔧 Scripts Disponibles

### Développement
```bash
# Mode web avec rechargement automatique
npm run dev

# Mode Electron avec rechargement automatique
npm run electron:dev

# Tests en mode watch
npm run test:watch

# Interface UI pour les tests
npm run test:ui
```

### Production
```bash
# Build pour le web
npm run build

# Build pour Electron
npm run build:electron

# Lancement Electron en production
npm run electron:start

# Aperçu du build web
npm run preview
```

### Tests & Qualité
```bash
# Lancer tous les tests
npm test

# Tests avec couverture
npm run test:coverage

# Vérification TypeScript
npm run lint

# Nettoyage des builds
npm run clean
```

## 🧪 Tests & Qualité

NeuroChat inclut une suite de tests rigoureuse pour garantir la stabilité de ses systèmes critiques (mémoire, prompts, apprentissage, contrôle du navigateur).

### Couverture des Tests
- ✅ **150+ tests** couvrant tous les composants critiques
- ✅ Tests unitaires pour chaque module du système d'apprentissage
- ✅ Tests d'intégration pour les cycles d'amélioration complets
- ✅ Tests de propriétés (property-based testing) pour les invariants système
- ✅ Tests de sécurité pour les contraintes de protection
- ✅ Tests du système de contrôle du navigateur
- ✅ Tests des composants d'avatar premium

### Outils de Débogage
- **Panneau de débogage intégré** : Logs en temps réel avec filtrage
- **Tests de patterns** : Validation des commandes de contrôle du navigateur
- **Métriques de performance** : Suivi des performances en temps réel
- **Historique des actions** : Traçabilité complète des opérations

---

## 🔐 Sécurité & Confidentialité

- **Privacy by Design** : Aucune donnée n'est envoyée à un serveur tiers (hormis l'API Gemini). Votre historique reste sur votre machine
- **Chiffrement Local** : Les données d'apprentissage sont chiffrées avec AES-GCM avant stockage dans le navigateur
- **Contrôle du Navigateur Sécurisé** : Confirmations obligatoires pour les actions sensibles (navigation, soumission de formulaires)
- **Contraintes de Sécurité** : Le système d'auto-amélioration ne peut jamais modifier les sections critiques (identité, confidentialité, contraintes TTS)
- **Audit Complet** : Tous les événements de sécurité sont journalisés et accessibles dans l'interface de transparence
- **Mode Electron Sécurisé** : Isolation des processus et permissions limitées

---

## 🎛️ Contrôles Utilisateur

NeuroChat vous donne un contrôle total sur tous les systèmes :

### Système d'Apprentissage
- **Panneau de Contrôle** : Activez/désactivez les améliorations automatiques à tout moment
- **Cycles Manuels** : Déclenchez un cycle d'apprentissage quand vous le souhaitez
- **Historique des Versions** : Consultez toutes les améliorations appliquées avec leurs métriques de performance
- **Rollback Facile** : Revenez à n'importe quelle version précédente en un clic
- **Transparence Totale** : Visualisez les événements de sécurité et les décisions du système

### Contrôle du Navigateur
- **Activation/Désactivation** : Contrôle total sur les capacités web
- **Confirmations Granulaires** : Autorisez ou refusez chaque action sensible
- **Historique des Actions** : Suivez toutes les opérations effectuées
- **Panneau de Débogage** : Logs détaillés pour diagnostiquer les problèmes

### Interface & Avatar
- **Personnalisation de l'Avatar** : Choix entre différents styles et animations
- **Modes d'Affichage** : Web responsive ou application desktop native
- **Thèmes Visuels** : Adaptation automatique selon l'heure et le contexte

## 📊 Métriques de Performance

Le système surveille en continu plusieurs aspects :

### Système d'Apprentissage
- **Concision** : Ratio de mots par rapport à la cible optimale (35-45 mots)
- **Conscience Contextuelle** : Pourcentage de réponses référençant l'historique
- **Proactivité** : Fréquence des suggestions et questions de suivi
- **Satisfaction Utilisateur** : Score basé sur les signaux implicites et explicites
- **Score Composite** : Métrique globale de qualité (0-100)

### Contrôle du Navigateur
- **Taux de Détection** : Pourcentage de commandes correctement identifiées
- **Temps de Réponse** : Latence entre commande et exécution
- **Taux de Succès** : Pourcentage d'actions réussies
- **Sécurité** : Nombre de confirmations et d'actions bloquées

### Performance Technique
- **Rendu Avatar** : 60fps constant avec optimisations React
- **Mémoire** : Utilisation RAM et stockage local
- **Audio** : Latence microphone et qualité de transcription

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
