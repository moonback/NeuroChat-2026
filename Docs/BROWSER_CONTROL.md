# 🌐 Système de Contrôle du Navigateur

NeuroChat peut maintenant contrôler votre navigateur pour vous aider dans vos tâches web ! Votre assistant peut naviguer sur des sites, cliquer sur des éléments, remplir des formulaires et bien plus encore.

## 🚀 Fonctionnalités

### Actions Disponibles

1. **Navigation**
   - Ouvrir des sites web
   - Retour/Avant dans l'historique
   - Recharger la page

2. **Interaction**
   - Cliquer sur des boutons et liens
   - Saisir du texte dans des champs
   - Remplir des formulaires
   - Soumettre des formulaires

3. **Lecture**
   - Extraire le contenu d'une page
   - Lire les titres et liens
   - Analyser les formulaires disponibles

4. **Navigation**
   - Défiler la page (haut/bas)
   - Aller en haut/bas de page

## 🎯 Comment l'utiliser

### Activation

1. Cliquez sur le bouton **"Contrôle inactif"** en haut à droite
2. Le bouton devient vert : **"Contrôle actif"**
3. Votre assistant peut maintenant contrôler le navigateur !

### Exemples de Commandes Vocales

#### Navigation
```
"Va sur Google"
"Ouvre YouTube"
"Navigue vers wikipedia.org"
"Retour en arrière"
"Page suivante"
"Recharge la page"
```

#### Recherche
```
"Cherche la météo à Paris"
"Trouve des recettes de gâteau au chocolat"
"Recherche les actualités du jour"
```

#### Interaction
```
"Clique sur le bouton connexion"
"Clique sur le premier lien"
"Descends un peu"
"Monte en haut de la page"
```

#### Lecture
```
"Lis-moi ce qui est écrit sur cette page"
"Quels sont les titres de cette page ?"
"Extrais le contenu de la page"
```

#### Saisie de texte
```
"Écris 'bonjour' dans le champ recherche"
"Tape 'Paris' dans la barre de recherche"
"Saisis mon email dans le formulaire"
```

## 🔒 Sécurité

### Confirmations Requises

Certaines actions sensibles nécessitent votre confirmation :

- ✅ **Navigation vers un nouveau site** - Une fenêtre de confirmation apparaît
- ✅ **Soumission de formulaires** - Vous devez autoriser l'action
- ❌ **Lecture de contenu** - Pas de confirmation nécessaire
- ❌ **Défilement** - Pas de confirmation nécessaire

### Fenêtre de Confirmation

Quand l'assistant veut effectuer une action sensible :

1. Une fenêtre modale apparaît
2. Elle affiche l'action demandée
3. Vous pouvez **Autoriser** ou **Refuser**
4. L'action n'est exécutée que si vous l'autorisez

### Bonnes Pratiques

- ✅ Vérifiez toujours l'URL avant d'autoriser une navigation
- ✅ Lisez attentivement les actions proposées
- ✅ N'autorisez que les actions que vous comprenez
- ❌ Ne laissez pas l'assistant soumettre des formulaires sans vérification
- ❌ Ne partagez pas d'informations sensibles (mots de passe, cartes bancaires)

## 🎨 Interface Utilisateur

### Indicateurs Visuels

1. **Bouton de contrôle** (haut droite)
   - 🔴 Rouge/Gris : Contrôle désactivé
   - 🟢 Vert : Contrôle activé

2. **Action en cours** (sous le bouton)
   - Affiche l'action actuellement exécutée
   - Animation de pulsation pendant l'exécution

3. **Historique des actions** (bas droite)
   - Liste des 20 dernières actions
   - Icônes pour chaque type d'action
   - Défilement automatique

### Panneau d'Historique

L'historique affiche :
- 📝 Type d'action (icône + nom)
- 📄 Description de l'action
- ⏱️ Ordre chronologique (plus récent en haut)

## 🛠️ Architecture Technique

### Composants Principaux

```
src/
├── lib/
│   ├── browserControl.ts       # Contrôleur principal
│   ├── commandParser.ts        # Détection de commandes
│   └── systemPrompt.ts         # Instructions pour l'IA
├── hooks/
│   └── useBrowserControl.ts    # Hook React
└── components/
    └── BrowserControlPanel.tsx # Interface utilisateur
```

### Flux de Données

```
1. Utilisateur parle → Gemini transcrit
2. Assistant répond avec une commande
3. commandParser détecte la commande
4. BrowserController exécute l'action
5. Confirmation si nécessaire
6. Résultat affiché à l'utilisateur
```

### API du Contrôleur

```typescript
// Exécuter une action
const result = await executeAction({
  type: "navigate",
  params: { url: "https://google.com" },
  requiresConfirmation: true
});

// Parser une commande naturelle
const action = parseNaturalLanguageCommand("va sur google.com");

// Obtenir le contexte de la page
const context = await getPageContext();
```

## 📚 Exemples d'Utilisation

### Scénario 1 : Recherche Web

```
Utilisateur : "Cherche la météo à Paris"
Assistant : "D'accord, je vais sur Google pour chercher ça."
→ Action : navigate vers google.com
→ Confirmation demandée
→ Utilisateur autorise
→ Google s'ouvre dans un nouvel onglet
```

### Scénario 2 : Navigation Simple

```
Utilisateur : "Ouvre YouTube"
Assistant : "Je t'ouvre YouTube tout de suite."
→ Action : navigate vers youtube.com
→ Confirmation demandée
→ Utilisateur autorise
→ YouTube s'ouvre
```

### Scénario 3 : Lecture de Contenu

```
Utilisateur : "Lis-moi cette page"
Assistant : "Je regarde ça..."
→ Action : extract (pas de confirmation)
→ Contenu extrait
Assistant : "Cette page parle de [résumé du contenu]"
```

### Scénario 4 : Interaction Complexe

```
Utilisateur : "Va sur Google et cherche des recettes"
Assistant : "Je vais sur Google."
→ Action 1 : navigate vers google.com
→ Confirmation → Autorisée
Assistant : "Maintenant je cherche des recettes."
→ Action 2 : click sur le champ de recherche
→ Action 3 : type "recettes"
→ Pas de confirmation nécessaire
```

## 🔧 Configuration Avancée

### Personnaliser les Patterns de Commandes

Éditez `src/lib/commandParser.ts` pour ajouter vos propres patterns :

```typescript
{
  regex: /ma commande personnalisée/gi,
  type: "mon_action" as const,
  extract: (match) => ({ /* params */ }),
}
```

### Ajouter de Nouvelles Actions

1. Ajoutez le type dans `BrowserAction`
2. Implémentez la méthode dans `BrowserController`
3. Ajoutez le pattern dans `commandParser.ts`
4. Mettez à jour l'UI dans `BrowserControlPanel.tsx`

### Modifier les Confirmations

Dans `browserControl.ts`, ajustez `requiresConfirmation` :

```typescript
const action: BrowserAction = {
  type: "mon_action",
  requiresConfirmation: true, // ou false
};
```

## 🐛 Dépannage

### Le contrôle ne fonctionne pas

1. ✅ Vérifiez que le contrôle est activé (bouton vert)
2. ✅ Vérifiez la console pour les erreurs
3. ✅ Assurez-vous que la commande est bien formulée
4. ✅ Rechargez la page si nécessaire

### Les commandes ne sont pas détectées

1. ✅ Parlez clairement et distinctement
2. ✅ Utilisez les formulations suggérées
3. ✅ Vérifiez que le microphone fonctionne
4. ✅ Consultez les logs dans la console (F12)

### Les popups sont bloqués

1. ✅ Autorisez les popups pour ce site
2. ✅ Vérifiez les paramètres de votre navigateur
3. ✅ Essayez avec un autre navigateur

### L'action échoue

1. ✅ Vérifiez que l'élément existe sur la page
2. ✅ Assurez-vous que le sélecteur est correct
3. ✅ Consultez les messages d'erreur
4. ✅ Réessayez avec une formulation différente

## 🚧 Limitations Actuelles

- ❌ Pas de support pour les iframes
- ❌ Pas de gestion des onglets multiples
- ❌ Pas de capture d'écran (nécessite html2canvas)
- ❌ Limité aux actions sur la page actuelle
- ❌ Pas de support pour les éléments dynamiques (AJAX)

## 🔮 Fonctionnalités Futures

- [ ] Support des iframes
- [ ] Gestion multi-onglets
- [ ] Capture d'écran avec html2canvas
- [ ] Attente d'éléments dynamiques
- [ ] Macros et scripts personnalisés
- [ ] Export/Import de séquences d'actions
- [ ] Mode "apprentissage" pour enregistrer des actions
- [ ] Support des extensions de navigateur

## 📖 Ressources

- [Documentation React](https://react.dev)
- [API Gemini](https://ai.google.dev/gemini-api/docs)
- [MDN Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)

## 🤝 Contribution

Pour contribuer au système de contrôle du navigateur :

1. Fork le projet
2. Créez une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Committez vos changements (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Push vers la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvrez une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

---

**Note** : Le contrôle du navigateur est une fonctionnalité puissante. Utilisez-la de manière responsable et sécurisée ! 🔒
