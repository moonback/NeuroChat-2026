# 🤝 Guide de Contribution — NeuroChat

Merci de l'intérêt que vous portez à NeuroChat ! Ce document définit les standards et le workflow pour contribuer au projet.

---

## 🛠 Prérequis

- **Node.js 20+** et **npm 10+**.
- Connaissance de **React (Hooks/Context)** et **TypeScript**.
- Un environnement de développement capable de faire tourner **Electron**.

---

## 🔄 Workflow Git

### 🌿 Branches
- `main` : Branche stable, toujours prête pour la production.
- `develop` : Branche d'intégration pour les nouvelles fonctionnalités.
- `feature/[nom]` : Pour le développement de nouvelles fonctionnalités.
- `fix/[nom]` : Pour les corrections de bugs.

### 💬 Commits
Nous suivons la convention **Conventional Commits** :
- `feat: ...` : Nouvelle fonctionnalité.
- `fix: ...` : Correction de bug.
- `docs: ...` : Mise à jour de la documentation.
- `refactor: ...` : Modification du code sans changement de comportement.
- `test: ...` : Ajout ou modification de tests.

---

## 🎨 Standards de Code

- **TypeScript** : Typage strict obligatoire (`noImplicitAny`).
- **Composants** : Utilisation de composants fonctionnels et de Hooks. Favorisez la composition.
- **Styling** : Utilisez les utilitaires **Tailwind CSS 4**. Évitez le CSS inline ou les modules CSS sauf nécessité absolue.
- **Logs** : Utilisez les préfixes de logs établis (ex: `[AudioService]`, `[VectorStore]`) pour faciliter le débogage.

---

## 🧪 Tests

Avant de soumettre une Pull Request, assurez-vous que les tests passent :

```bash
# Lancer tous les tests
npm run test

# Lancer les tests avec l'interface UI
npm run test:ui
```

---

## 📝 Processus de Review

1. Créez une branche depuis `develop`.
2. Implémentez vos changements et ajoutez des tests si nécessaire.
3. Assurez-vous que le linting et les types passent (`npm run lint`).
4. Ouvrez une Pull Request vers `develop`.
5. Attendez la validation d'au moins un mainteneur avant le merge.

---

## 📜 Code de Conduite

Soyez respectueux, constructif et professionnel dans toutes vos interactions liées au projet. Harcèlement et comportements inappropriés ne seront pas tolérés.

---

> ⚠️ À compléter : Lien vers le canal Discord ou Slack de la communauté si disponible.
