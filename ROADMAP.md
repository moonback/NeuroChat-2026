# 🗺️ ROADMAP - NeuroChat AI

**Vision** : Créer un assistant vocal magique et sécurisé pour les enfants, déployable sur web et mobile, avec une expérience immersive et éducative.

---

## 📍 État Actuel (MVP - v0.1)

### ✅ Fonctionnalités Implémentées
- ✅ Interface React moderne avec animations fluides (Motion)
- ✅ Intégration Gemini Live API (conversation vocale temps réel)
- ✅ Avatar Robot Cool avec animations réactives au son
- ✅ Système de personnalisation (prénom de l'enfant)
- ✅ Modal de bienvenue (prénom + âge)
- ✅ Limites d'utilisation (30 min/jour, mode nuit 20h-7h)
- ✅ Stockage local (localStorage) pour préférences
- ✅ Architecture audio modulaire (AudioRecorder, AudioPlayer)
- ✅ Prompt système adaptatif selon l'avatar
- ✅ **Système de mémoire conversationnelle** (stockage des conversations, contexte persistant)

### 🔴 Limitations Actuelles
- ❌ Clé API exposée côté client (risque de sécurité)
- ❌ Un seul avatar disponible (Robot Cool)
- ❌ Pas de backend propre (dépendance 100% Gemini)
- ❌ Pas de tableau de bord parent
- ❌ Pas d'application mobile native
- ❌ Pas de système de modération avancé
- ❌ Pas de support multilingue
- ⚠️ Mémoire conversationnelle limitée (localStorage uniquement, pas de synchronisation cloud)

---

## 🎯 Phase 1 : Sécurisation & Stabilisation (v0.2)
**Objectif** : Rendre l'application production-ready et sécurisée  
**Durée estimée** : 2-3 semaines

### 🔒 Sécurité
- [ ] **Backend Proxy** : Créer un serveur Node.js/Express pour masquer la clé API
  - Endpoint `/api/start-session` pour initialiser Gemini
  - Gestion des tokens JWT pour authentification
  - Rate limiting par IP/utilisateur
- [ ] **Variables d'environnement** : Sécuriser toutes les clés sensibles
- [ ] **HTTPS obligatoire** : Configuration SSL/TLS
- [ ] **Content Security Policy** : Headers de sécurité

### 🐛 Corrections & Optimisations
- [ ] Corriger les types TypeScript (warnings actuels)
- [ ] Gérer les erreurs réseau (reconnexion automatique)
- [ ] Optimiser la gestion mémoire (cleanup des AudioContext)
- [ ] Ajouter des tests unitaires (Vitest)
- [ ] Améliorer l'accessibilité (ARIA labels, navigation clavier)

### 📊 Monitoring
- [ ] Intégrer Google Analytics ou Plausible
- [ ] Logger les erreurs (Sentry)
- [ ] Métriques de performance (Web Vitals)

---

## 🎨 Phase 2 : Enrichissement de l'Expérience (v0.3)
**Objectif** : Ajouter les avatars manquants et améliorer l'UX  
**Durée estimée** : 3-4 semaines

### 🎭 Avatars Multiples
- [ ] **Maysson le Renard** 🦊
  - Design SVG animé
  - Personnalité : malin, protecteur, nature
  - Couleurs : orange, vert forêt
- [ ] **Leanna la Fée** 🧚
  - Design SVG avec ailes animées
  - Personnalité : douce, chantante, magique
  - Couleurs : rose, violet, doré
- [ ] **Drago le Dragon** 🐲
  - Design SVG avec flammes
  - Personnalité : courageux, drôle, aventurier
  - Couleurs : rouge, orange, jaune
- [ ] **Mistigri l'Espace** 🐱
  - Design SVG cosmique
  - Personnalité : explorateur, curieux
  - Couleurs : bleu nuit, violet, cyan

### 🎨 Interface Améliorée
- [ ] Sélecteur d'avatar visuel (carrousel)
- [ ] Animations de transition entre avatars
- [ ] Thèmes visuels adaptatifs (jour/nuit)
- [ ] Indicateur de niveau audio visuel
- [ ] Feedback haptique (mobile)

### 🎵 Audio Amélioré
- [ ] Effets sonores (bips, transitions)
- [ ] Musique d'ambiance douce (optionnelle)
- [ ] Contrôle du volume
- [ ] Support des écouteurs Bluetooth

---

## 👨‍👩‍👧 Phase 3 : Espace Parents (v0.4)
**Objectif** : Donner aux parents le contrôle et la visibilité  
**Durée estimée** : 4-5 semaines

### 🗄️ Backend & Base de Données
- [ ] **Intégration Supabase**
  - Authentification parents (email/password, OAuth)
  - Tables : `profiles`, `children`, `sessions`, `transcripts`
  - Row Level Security (RLS)
- [ ] **API REST**
  - CRUD enfants
  - Historique des sessions
  - Paramètres de contrôle parental

### 📊 Tableau de Bord Parent
- [ ] **Vue d'ensemble**
  - Temps d'utilisation quotidien/hebdomadaire
  - Graphiques d'activité
  - Dernières conversations (résumés)
- [ ] **Gestion des profils enfants**
  - Ajouter/modifier/supprimer des enfants
  - Personnaliser les limites par enfant
  - Choisir l'avatar par défaut
- [ ] **Paramètres de sécurité**
  - Ajuster les horaires autorisés
  - Définir les limites de temps
  - Activer/désactiver certains sujets
  - Mots-clés à filtrer

### 🔐 Contrôle Parental Avancé
- [ ] Code PIN pour accéder aux paramètres
- [ ] Notifications par email (résumés hebdomadaires)
- [ ] Mode "Pause" d'urgence
- [ ] Historique des conversations (opt-in, RGPD compliant)

---

## 📱 Phase 4 : Application Mobile (v1.0)
**Objectif** : Déployer sur iOS et Android  
**Durée estimée** : 6-8 semaines

### 🔧 Migration Technique
- [ ] **React Native** ou **Capacitor**
  - Évaluer les deux options
  - Migrer les composants existants
  - Adapter l'architecture audio (native modules)
- [ ] **Permissions natives**
  - Microphone
  - Notifications push
  - Stockage local

### 📦 Déploiement
- [ ] **App Store (iOS)**
  - Compte développeur Apple
  - Conformité App Store Guidelines
  - Processus de review
- [ ] **Google Play (Android)**
  - Compte développeur Google
  - Conformité Play Store Policies
  - Classification par âge (PEGI 3+)

### 🎯 Fonctionnalités Mobiles
- [ ] Mode hors ligne (conversations limitées)
- [ ] Widgets (temps restant, accès rapide)
- [ ] Notifications intelligentes
- [ ] Optimisation batterie

---

## 🚀 Phase 5 : Fonctionnalités Avancées (v1.5)
**Objectif** : Différenciation et valeur ajoutée  
**Durée estimée** : 8-10 semaines

### 🎓 Contenu Éducatif
- [ ] **Modes thématiques**
  - Mode "Devoirs" (aide aux maths, lecture)
  - Mode "Histoires" (contes interactifs)
  - Mode "Sciences" (expériences, découvertes)
  - Mode "Langues" (apprentissage anglais, espagnol)
- [ ] **Progression gamifiée**
  - Badges et récompenses
  - Défis quotidiens
  - Système de points

### 👁️ Vision Multimodale
- [ ] **Gemini Vision** (si disponible)
  - Montrer des dessins à l'IA
  - Reconnaissance d'objets
  - Aide aux devoirs visuels
- [ ] **Génération d'images**
  - Illustrer les histoires
  - Créer des coloriages personnalisés

### 🌍 Internationalisation
- [ ] Support multilingue (EN, ES, DE, IT)
- [ ] Voix adaptées par langue
- [ ] Traduction automatique des prompts

### 🤝 Social & Partage
- [ ] Partage de dessins/créations
- [ ] Communauté modérée (parents)
- [ ] Défis entre amis (avec accord parental)

---

## 💰 Phase 6 : Monétisation & Croissance (v2.0)
**Objectif** : Modèle économique durable  
**Durée estimée** : Continu

### 💳 Modèle Freemium
- [ ] **Version Gratuite**
  - 1 enfant
  - 1 avatar
  - 15 min/jour
  - Publicités non intrusives (opt-in)
- [ ] **Version Premium** (4,99€/mois)
  - 5 enfants
  - Tous les avatars
  - 60 min/jour
  - Modes éducatifs avancés
  - Historique des conversations
  - Support prioritaire
- [ ] **Version Famille** (9,99€/mois)
  - Enfants illimités
  - Temps illimité
  - Contenu exclusif
  - Tableau de bord avancé

### 📈 Marketing & Acquisition
- [ ] Landing page optimisée SEO
- [ ] Blog (conseils parentalité numérique)
- [ ] Partenariats écoles/bibliothèques
- [ ] Programme d'affiliation
- [ ] Présence réseaux sociaux (TikTok, Instagram)

### 🔬 R&D Continue
- [ ] A/B testing des fonctionnalités
- [ ] Feedback utilisateurs (NPS)
- [ ] Veille technologique (nouveaux modèles IA)
- [ ] Conformité RGPD/COPPA

---

## 🛡️ Considérations Légales & Éthiques

### 📜 Conformité Réglementaire
- [ ] **RGPD** (Europe)
  - Consentement parental explicite
  - Droit à l'oubli
  - Portabilité des données
- [ ] **COPPA** (USA)
  - Pas de collecte de données <13 ans sans accord parental
- [ ] **Mentions légales**
  - CGU/CGV
  - Politique de confidentialité
  - Cookies

### 🧠 Éthique IA
- [ ] Transparence sur l'utilisation de l'IA
- [ ] Modération des contenus sensibles
- [ ] Prévention de l'addiction (limites strictes)
- [ ] Pas de manipulation émotionnelle
- [ ] Audit régulier des prompts système

---

## 📊 Métriques de Succès

### KPIs Techniques
- Latence audio < 500ms
- Taux d'erreur < 1%
- Disponibilité > 99,5%
- Score Lighthouse > 90

### KPIs Business
- 10 000 utilisateurs actifs (6 mois)
- Taux de conversion freemium > 5%
- NPS > 50
- Taux de rétention J30 > 40%

### KPIs Impact
- Satisfaction parents > 4,5/5
- Temps d'écran "qualitatif" vs passif
- Retours positifs sur l'apprentissage

---

## 🎯 Prochaines Actions Immédiates

### Cette Semaine
1. ✅ Créer le modal de bienvenue (prénom + âge) - **FAIT**
2. 🔄 Corriger les warnings TypeScript
3. 🔄 Créer un backend proxy simple (Express)
4. 🔄 Déployer une version de test (Vercel/Netlify)

### Ce Mois
1. Implémenter les 4 avatars manquants
2. Ajouter le sélecteur d'avatar
3. Créer la documentation utilisateur
4. Premiers tests utilisateurs (5-10 familles)

### Ce Trimestre
1. Intégration Supabase complète
2. Tableau de bord parent v1
3. Soumission App Store/Play Store
4. Lancement beta publique

---

## 🤝 Contributions & Ressources

### Équipe Idéale
- 1 Développeur Full-Stack (React/Node)
- 1 Designer UI/UX (spécialisé enfants)
- 1 Expert IA/Prompt Engineering
- 1 Responsable Produit/Marketing
- 1 Conseiller Pédagogique

### Budget Estimé (MVP → v1.0)
- Développement : 40-60k€
- Design : 10-15k€
- Infrastructure (Supabase, Gemini API) : 500-1000€/mois
- Légal : 5-10k€
- Marketing : 10-20k€

---

**Dernière mise à jour** : 2026-05-13  
**Maintenu par** : Équipe NeuroChat AI  
**Contact** : [À définir]

---

*Cette roadmap est un document vivant, ajusté selon les retours utilisateurs et les évolutions technologiques.* 🚀
