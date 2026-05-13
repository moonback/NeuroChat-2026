# KidsVoice AI 🎙️✨

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Gemini-Live_API-orange.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **KidsVoice AI** n'est pas qu'un simple chatbot. C'est un compagnon magique, animé et réactif, conçu pour éveiller la curiosité des enfants à travers une interaction vocale naturelle et immersive.

---

## 🌟 L'Expérience Magique

L'application transforme l'IA en un ami imaginaire tangible. Grâce à l'intégration de **Gemini Live API**, KidsVoice offre une latence ultra-faible permettant une véritable conversation fluide, sans interruption manuelle.

### 🎭 Compagnons Uniques
Choisissez parmi une sélection d'avatars animés, chacun possédant sa propre personnalité et son univers visuel :
- **Robot Cool** 🤖 : High-tech, logique et fasciné par les gadgets.
- **Maysson le Renard** 🦊 : Malin, protecteur et amoureux de la nature.
- **Leanna la Fée** 🧚 : Douce, chantante et experte en poussière d'étoiles.
- **Drago le Dragon** 🐲 : Courageux, drôle et amateur de trésors cachés.
- **Mistigri l'Espace** 🐱 : Un chat cosmique explorateur de galaxies lointaines.

### 🔊 Réactivité Sonore Dynamique
Le moteur d'animation est couplé au flux audio en temps réel. Les avatars ne font pas que parler ; ils **réagissent** au volume de la voix de l'enfant (pupilles qui se dilatent, ailes qui battent plus vite, halo lumineux qui pulse).

### 👤 Personnalisation Locale
- **Mémoire du prénom** : L'IA s'adresse directement à l'enfant pour une relation plus intime.
- **Persistance** : Les préférences d'avatar et le prénom sont sauvegardés localement (Privacy by design).

---

## 🛠️ Excellence Technique

### Stack Moderne
- **Core** : React 19 + TypeScript (Typage strict pour une robustesse maximale).
- **Style** : Tailwind CSS v4 + Motion (Animations 60fps optimisées).
- **Moteur IA** : Google GenAI SDK avec streaming PCM 16-bit bidirectionnel.
- **Architecture Mobile-Ready** : Logique audio abstraite via des interfaces (`IAudioRecorder`, `IAudioPlayer`) facilitant le portage vers React Native.

### Structure du Code
- `src/lib/AudioService.ts` : Couche d'abstraction pour le multi-plateforme.
- `src/components/avatars/` : Système modulaire d'avatars SVG animés.
- `src/lib/systemPrompt.ts` : Générateur dynamique de personnalité injectant le contexte utilisateur.

---

## 🚀 Installation Rapide

1. **Clonage & Installation**
   ```bash
   git clone https://github.com/votre-username/kidsvoice-ai.git
   npm install
   ```

2. **Configuration**
   Créez un fichier `.env` à la racine :
   ```env
   VITE_GEMINI_API_KEY=votre_cle_gemini_ici
   ```

3. **Décollage**
   ```bash
   npm run dev
   ```

---

## 🛡️ Sécurité & Confidentialité

- **Zéro Stockage Serveur** : Toutes les données de personnalisation restent dans le navigateur de l'utilisateur.
- **Filtres de Sécurité** : Le prompt système est rigoureusement conçu pour éviter les sujets sensibles et protéger l'innocence de l'enfant.
- **Pas d'infos privées** : L'IA est instruite pour ne jamais demander de données sensibles (adresse, nom de famille).

---

## 🗺️ Vision & Futur
Consultez notre [ROADMAP.md](ROADMAP.md) pour découvrir les prochaines étapes, incluant l'intégration de la vision (Gemini Multimodal) et le déploiement sur les stores mobiles.

---
*Développé avec ❤️ pour la prochaine génération d'explorateurs.*
