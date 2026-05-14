# 🧠 NeuroChat

NeuroChat est un assistant personnel professionnel multimodal qui vit sur votre bureau. Il combine la puissance de l'IA générative (vision, voix, contrôle du navigateur) avec un système de mémoire à long terme persistant et un moteur d'auto-amélioration continue. Conçu pour booster la productivité quotidienne, il transforme chaque interaction en une étape vers une assistance plus personnalisée.

---

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
| **OpenRouter** | Service LLM de secours / Synthèses | API |
| **Vitest** | Framework de Tests | 4.1.6 |

---

## ✨ Fonctionnalités Principales

### 👤 Pour l'Utilisateur
- **Vision Multimodale** : Partage d'écran en temps réel et capture caméra pour une assistance visuelle contextuelle.
- **Voix Temps Réel** : Interaction vocale fluide (STT/TTS) avec détection d'activité vocale (VAD) et réduction de bruit.
- **Contrôle du Navigateur** : L'assistant peut naviguer sur le web, rechercher des informations et interagir avec les pages pour vous.
- **Mémoire Sémantique (RAG)** : Recherche intelligente dans tout l'historique de vos conversations passées.
- **Synthèses Hebdomadaires** : Rapports automatiques sur vos activités, progrès et thèmes récurrents.

### 💻 Pour le Développeur / Administrateur
- **Système d'Auto-Amélioration** : Cycle d'apprentissage automatique qui optimise le prompt système basé sur les feedbacks utilisateurs.
- **Monitoring de Régression** : Détection automatique des baisses de performance après une mise à jour de prompt, avec rollback sécurisé.
- **Coffre de Conversations** : Interface de gestion et d'exploration de la mémoire persistante (LocalStorage chiffré).
- **Architecture Modulaire** : Services isolés pour l'audio, la vidéo, le navigateur et l'IA.

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

## 🤝 Contribuer

Nous accueillons les contributions avec plaisir ! Veuillez consulter notre [GUIDE DE CONTRIBUTION](file:///c:/Users/Mayss/Documents/GitHub/NeuroChat/CONTRIBUTING.md) pour plus de détails sur le workflow et les standards de code.

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier `LICENSE` pour plus d'informations.

---

> ⚠️ À compléter : Ajouter un fichier `LICENSE` à la racine du projet.
