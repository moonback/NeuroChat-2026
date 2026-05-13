# Guide de Contribution 🤝

Merci de l'intérêt que vous portez au projet **KidsVoice AI** ! Que vous souhaitiez corriger un bug, ajouter des animations à l'avatar ou améliorer l'architecture vers un backend persistant, nous sommes heureux de votre aide.

## Avant de contribuer

1. **Vérifier les "Issues" existantes** sur GitHub.
2. Si vous proposez une fonctionnalité majeure, il est préférable d'**ouvrir une issue de discussion** avant d'investir des heures dans le code.

## Workflow de développement

1. **Faites un "Fork"** du projet sur votre propre compte GitHub.
2. **Clonez** votre fork localement :
   ```bash
   git clone https://github.com/votre-compte/kidsvoice-ai.git
   cd kidsvoice-ai
   ```
3. **Créez une branche dédiée** pour votre nouvelle fonctionnalité ou correction :
   ```bash
   git checkout -b feat/avatar-personnalise
   ```
   *(Conventions : `feat/...`, `fix/...`, `docs/...`, `refactor/...`)*
4. Lancez le serveur de développement localement et testez vos modifications (`npm run dev`).

## Normes de Code (Code Style)

Afin d'assurer la cohérence du projet :

- **TypeScript** : Respectez l'usage de TypeScript. Pas de `any` sauf situation bloquante. Documentez les interfaces complexes.
- **Prettier & ESLint** : Avant tout commit, assurez-vous que votre éditeur formate le code correctement, et n'hésitez pas à lancer `npm run lint`.
- **CSS / Tailwind** : Préférez utiliser les classes utilitaires de Tailwind CSS `className="..."` plutôt que du style en ligne statique. Gardez le style en ligne uniquement pour des variables CSS dynamiques gérées par JavaScript (ex: positions x/y).
- **Hooks React** : Gardez les dépendances des hooks (`useEffect`, `useCallback`) à jour pour éviter des bugs de fermeture lexicale.

## Ajouter une modification au Git

Rédigez des messages de commit clairs et conventionnels (Connaissez *Conventional Commits*) :

- `feat(ui): add new fox avatar character`
- `fix(audio): handle buffer underrun in AudioPlayer`
- `style: reformat App.tsx with prettier`
- `docs: update ROADMAP.md with new step`

Lancez ensuite votre Pull Request :

```bash
git add .
git commit -m "feat(module): description claire"
git push origin feat/votre-branche
```

## Review et Pull Request (PR)

- Créez une **Pull Request** de votre branche vers le dépôt cible.
- Fournissez un résumé clair des changements apportés.
- Si vous avez ajouté des éléments visuels complexes, n'hésitez pas à **inclure une capture d'écran** ou un petit GIF.
- Restez ouverts aux commentaires et aux refactoring demandés ! 💖
