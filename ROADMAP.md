# 🗺️ ROADMAP - NeuroChat AI

**Vision** : Devenir l'assistant personnel IA de référence, capable d'accompagner l'utilisateur dans sa productivité, sa gestion de l'information et son bien-être quotidien via une interface vocale naturelle et intelligente.

---

## 📍 État Actuel (v0.2 - Professional Foundation)

### ✅ Fonctionnalités Implémentées
- ✅ **Interface temps réel** : React 19 + Motion avec animations fluides.
- ✅ **Gemini Live API** : Intégration WebSocket pour une conversation sans latence.
- ✅ **Avatar Nova** : Assistant proactif avec animations réactives au flux audio.
- ✅ **Mémoire Conversationnelle** : Système de stockage local (localStorage) avec gestion du contexte.
- ✅ **Prompt Dynamique** : Système de personnalité proactif optimisé pour la synthèse vocale (TTS).
- ✅ **Suite de Tests** : Couverture des systèmes critiques (Vitest).

### 🔴 Limitations Actuelles
- ❌ Clé API exposée côté client (Backend Proxy requis).
- ❌ Mémoire limitée au stockage local (Pas de synchronisation cloud).
- ❌ Pas d'accès aux outils externes (Agenda, Email, Web Search).
- ❌ Un seul assistant disponible (Nova).

---

## 🎯 Phase 1 : Consolidation & Sécurité (v0.3)
**Objectif** : Sécuriser l'architecture et améliorer la fiabilité.

### 🔒 Sécurité & Backend
- [ ] **Backend Proxy (Supabase Edge Functions)** : Masquer la clé API et gérer les sessions.
- [ ] **Authentification Utilisateur** : Permettre de retrouver son assistant sur différents navigateurs.
- [ ] **Rate Limiting** : Protection contre l'abus de l'API.

### 🐛 Stabilité
- [ ] Amélioration de la gestion des erreurs réseau (Reconnexion automatique intelligente).
- [ ] Optimisation de la capture audio (Réduction du bruit ambiant).
- [ ] Augmentation de la couverture de tests (E2E avec Playwright).

---

## 🚀 Phase 2 : Outils de Productivité (v0.4)
**Objectif** : Faire de NeuroChat un assistant capable d'agir.

### 🛠️ Tool Use (Function Calling)
- [ ] **Gestion du Temps** : Création automatique de rappels et de timers.
- [ ] **Intégration Calendrier** : Lecture et ajout d'événements (Google Calendar / Outlook).
- [ ] **Recherche Web** : Capacité à chercher des informations fraîches en temps réel.

### 🧠 Mémoire Long Terme
- [ ] **Vector Database (RAG)** : Stockage et recherche sémantique dans l'historique complet.
- [ ] **Synthèse Hebdomadaire** : Capacité de l'IA à résumer les actions de la semaine.

---

## 📱 Phase 3 : Mobilité & Multimodalité (v0.5)
**Objectif** : Être partout et tout voir.

### 📱 Applications Natives
- [ ] **NeuroChat Mobile** : Application iOS/Android via Capacitor ou React Native.
- [ ] **NeuroChat Desktop** : Version macOS/Windows/Linux (Electron) avec raccourcis clavier globaux.

### 👁️ Vision & Documents
- [ ] **Analyse Multimodale** : Utiliser la caméra pour analyser des documents, des écrans ou des objets.
- [ ] **Gestion de fichiers** : Lecture et résumé de PDF/Documents via l'interface vocale.

---

## 🌍 Phase 4 : Écosystème & Collaboration (v1.0)
**Objectif** : Un assistant ouvert et personnalisable.

### 🤝 Intégrations
- [ ] **NeuroChat API** : Permettre à d'autres applications de dialoguer avec votre assistant.
- [ ] **Home Automation** : Contrôle de la domotique (Home Assistant, Philips Hue).

### 🎨 Personnalisation Avancée
- [ ] **Créateur d'Avatar** : Personnalisation visuelle complète de l'assistant.
- [ ] **Voice Cloning** : Possibilité de choisir ou de créer des timbres de voix uniques.

---

## 📊 Métriques de Succès
- **Latence Perçue** : < 300ms pour un ressenti "humain".
- **Taux de Succès des Tâches** : > 90% sur les commandes de productivité.
- **Rétention Utilisateur** : Faire de NeuroChat un outil utilisé quotidiennement.

---

**Dernière mise à jour** : 2026-05-13  
**Maintenu par** : Équipe NeuroChat AI  
**Contact** : [À définir]

---

*Cette roadmap est un document vivant, ajusté selon les retours utilisateurs et les évolutions technologiques.* 🚀
