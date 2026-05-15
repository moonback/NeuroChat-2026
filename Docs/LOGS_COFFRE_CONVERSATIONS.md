# 📋 Logs du Coffre des Conversations

Ce document décrit tous les logs ajoutés pour suivre le fonctionnement du système de mémoire des conversations (Coffre des Conversations).

## 🎯 Objectif

Les logs permettent de suivre en temps réel :
- Le chargement et la sauvegarde des sessions
- La création et la sélection des sessions
- Les statistiques de mémoire
- Les opérations sur les profils utilisateurs
- Les interactions avec l'interface utilisateur

## 📍 Emplacements des Logs

### 1. **src/lib/conversationMemory.ts** - Logique de base

#### Chargement des sessions
```
[ConversationMemory] 📂 Chargement des sessions depuis le stockage...
[ConversationMemory] ℹ️ Aucune session trouvée dans le stockage
[ConversationMemory] ✅ X session(s) chargée(s)
[ConversationMemory] ❌ Échec du chargement de la mémoire: [erreur]
```

#### Sauvegarde des sessions
```
[ConversationMemory] 💾 Sauvegarde de X session(s)...
[ConversationMemory] ⚠️ Limitation à 50 sessions (X supprimée(s))
[ConversationMemory] ✅ Sessions sauvegardées avec succès
[ConversationMemory] ❌ Échec de la sauvegarde de la mémoire: [erreur]
```

#### Gestion des sessions
```
[ConversationMemory] 🔍 Recherche de session active pour: [userName]
[ConversationMemory] ✅ Session active trouvée: [sessionId] (X tours)
[ConversationMemory] 🆕 Nouvelle session créée: [sessionId]
```

#### Ajout de tours de conversation
```
[ConversationMemory] 💬 Ajout d'un tour: [speaker] (X caractères)
[ConversationMemory] 📍 Index de session: X
[ConversationMemory] ➕ Ajout du tour à la session existante: [sessionId]
[ConversationMemory] 🏷️ Sujet défini: [topic]
[ConversationMemory] 📊 Total tours dans la session: X
[ConversationMemory] 🆕 Ajout d'une nouvelle session: [sessionId]
[ConversationMemory] 📊 Total sessions: X
```

#### Profils utilisateurs
```
[ConversationMemory] 👤 Chargement du profil pour: [userName]
[ConversationMemory] ✅ Profil trouvé: X conversation(s)
[ConversationMemory] ℹ️ Création d'un nouveau profil pour: [userName]
[ConversationMemory] ⚠️ Erreur lors du chargement du profil: [erreur]
[ConversationMemory] 📝 Mise à jour du profil: [userName]
[ConversationMemory] ✅ Profil mis à jour avec succès
[ConversationMemory] ❌ Échec de la mise à jour du profil: [erreur]
```

#### Statistiques
```
[ConversationMemory] 📊 Calcul des statistiques pour: [userName]
[ConversationMemory] ✅ Stats: X sessions, Y tours
```

#### Effacement
```
[ConversationMemory] 🗑️ Effacement de tout l'historique des conversations...
[ConversationMemory] ✅ Historique effacé avec succès
```

---

### 2. **src/hooks/useConversationMemory.ts** - Hook React

#### Initialisation et bienvenue
```
[useConversationMemory] 👋 Soumission du nom d'utilisateur: [name]
[useConversationMemory] ✅ Modal de bienvenue fermée
```

#### Calcul des données
```
[useConversationMemory] 📊 Calcul des données de mémoire...
[useConversationMemory] ⚠️ Pas de nom d'utilisateur, données nulles
[useConversationMemory] ✅ Données calculées: X sessions
```

#### Sélection de session
```
[useConversationMemory] 🔍 Recherche de la session sélectionnée: [sessionId]
[useConversationMemory] ℹ️ Aucune session sélectionnée
[useConversationMemory] ✅ Session trouvée: [topic] (X tours)
[useConversationMemory] ⚠️ Session non trouvée
```

#### Effacement de la mémoire
```
[useConversationMemory] 🗑️ Demande d'effacement de la mémoire
[useConversationMemory] ✅ Confirmation reçue, effacement en cours...
[useConversationMemory] 🔄 Rechargement de la page...
[useConversationMemory] ❌ Effacement annulé par l'utilisateur
```

---

### 3. **src/components/ConversationVault.tsx** - Interface utilisateur

#### Rendu du composant
```
[ConversationVault] 🏛️ Rendu du Coffre - isOpen: [true/false], userName: [name]
[ConversationVault] ❌ Coffre fermé, pas de rendu
[ConversationVault] 📊 Données de mémoire: [objet]
[ConversationVault] 📚 X synthèse(s) hebdomadaire(s) chargée(s)
[ConversationVault] 📅 X semaine(s) avec des sessions
```

#### Navigation entre onglets
```
[ConversationVault] 🔄 Changement d'onglet vers: sessions
[ConversationVault] 🔄 Changement d'onglet vers: weekly
[ConversationVault] 🔄 Changement d'onglet vers: learning
```

#### Sélection de session
```
[ConversationVault] 🎯 Sélection de la session: [sessionId]
```

#### Génération de synthèses hebdomadaires
```
[ConversationVault] 📅 Génération de la synthèse hebdomadaire pour: [weekId]
[ConversationVault] 📊 X session(s) trouvée(s) pour [userName]
[ConversationVault] ✅ Synthèse générée avec succès
[ConversationVault] ⚠️ Aucune synthèse générée
[ConversationVault] ❌ Échec de la génération hebdomadaire: [erreur]
[ConversationVault] 🏁 Génération terminée
```

---

## 🔍 Comment utiliser les logs

### Dans la console du navigateur

1. **Ouvrir la console** : `F12` ou `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)

2. **Filtrer les logs** :
   - Tous les logs du Coffre : `[ConversationMemory]` ou `[ConversationVault]` ou `[useConversationMemory]`
   - Logs d'erreur uniquement : Cliquer sur "Errors" dans la console
   - Logs spécifiques : Utiliser le filtre de recherche

3. **Scénarios de débogage** :

   **Problème : Les sessions ne se sauvegardent pas**
   ```
   Chercher : [ConversationMemory] 💾 Sauvegarde
   Vérifier : Présence de ✅ ou ❌
   ```

   **Problème : Une session n'apparaît pas dans la liste**
   ```
   Chercher : [ConversationMemory] 📂 Chargement
   Vérifier : Nombre de sessions chargées
   ```

   **Problème : La sélection de session ne fonctionne pas**
   ```
   Chercher : [ConversationVault] 🎯 Sélection
   Vérifier : L'ID de session sélectionné
   ```

   **Problème : Les synthèses hebdomadaires ne se génèrent pas**
   ```
   Chercher : [ConversationVault] 📅 Génération
   Vérifier : Erreurs ou avertissements
   ```

---

## 📊 Exemple de flux complet

Voici un exemple de logs lors d'une utilisation normale :

```
[ConversationMemory] 📂 Chargement des sessions depuis le stockage...
[ConversationMemory] ✅ 5 session(s) chargée(s)
[useConversationMemory] 📊 Calcul des données de mémoire...
[ConversationMemory] 📊 Calcul des statistiques pour: Alice
[ConversationMemory] ✅ Stats: 5 sessions, 42 tours
[useConversationMemory] ✅ Données calculées: 5 sessions
[ConversationVault] 🏛️ Rendu du Coffre - isOpen: true, userName: Alice
[ConversationVault] 📚 2 synthèse(s) hebdomadaire(s) chargée(s)
[ConversationVault] 📊 Données de mémoire: [Object]
[ConversationVault] 📅 2 semaine(s) avec des sessions
[ConversationVault] 🎯 Sélection de la session: session_1234567890_abc123
[useConversationMemory] 🔍 Recherche de la session sélectionnée: session_1234567890_abc123
[useConversationMemory] ✅ Session trouvée: Discussion sur React (8 tours)
```

---

## 🎨 Légende des émojis

| Émoji | Signification |
|-------|---------------|
| 📂 | Chargement de données |
| 💾 | Sauvegarde de données |
| ✅ | Opération réussie |
| ❌ | Erreur |
| ⚠️ | Avertissement |
| ℹ️ | Information |
| 🔍 | Recherche |
| 🆕 | Création |
| ➕ | Ajout |
| 💬 | Message/Tour de conversation |
| 📊 | Statistiques |
| 👤 | Profil utilisateur |
| 📝 | Mise à jour |
| 🗑️ | Suppression |
| 🏛️ | Interface du Coffre |
| 🎯 | Sélection |
| 🔄 | Changement/Rechargement |
| 📅 | Synthèse hebdomadaire |
| 🏷️ | Sujet/Tag |
| 🏁 | Fin d'opération |
| 👋 | Bienvenue |
| 📚 | Collection/Liste |

---

## 🛠️ Maintenance

Pour ajouter de nouveaux logs :

1. **Utiliser le préfixe approprié** : `[ConversationMemory]`, `[ConversationVault]`, ou `[useConversationMemory]`
2. **Choisir un émoji pertinent** (voir légende ci-dessus)
3. **Être descriptif** : Inclure les informations contextuelles importantes
4. **Utiliser console.log** pour les informations normales
5. **Utiliser console.error** pour les erreurs
6. **Utiliser console.warn** pour les avertissements (si nécessaire)

### Exemple de bon log :
```typescript
console.log(`[ConversationMemory] ✅ Session active trouvée: ${sessionId} (${turns.length} tours)`);
```

### Exemple de mauvais log :
```typescript
console.log("found session"); // ❌ Pas de préfixe, pas d'émoji, pas de contexte
```

---

## 📝 Notes

- Les logs sont actifs en développement ET en production
- Pour désactiver les logs en production, envisager d'utiliser une variable d'environnement
- Les logs n'affectent pas les performances de manière significative
- Tous les logs sont en français pour correspondre à l'interface utilisateur
