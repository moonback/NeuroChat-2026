# 🧠 Système de Mémoire Conversationnelle

## Vue d'ensemble

Le système de mémoire permet au compagnon AI de se souvenir des conversations précédentes avec chaque enfant, créant ainsi une expérience plus personnelle et cohérente.

## Fonctionnalités

### 1. **Stockage des Conversations**
- Chaque conversation est stockée localement dans le navigateur (localStorage)
- Les conversations sont organisées par sessions quotidiennes
- Chaque session contient jusqu'à 20 tours de conversation (10 échanges)

### 2. **Contexte Persistant**
- Le système injecte automatiquement le contexte des conversations passées dans le prompt système
- L'IA peut faire référence aux sujets discutés précédemment
- La mémoire est limitée pour éviter de surcharger le contexte

### 3. **Gestion Multi-Enfants**
- Chaque enfant a sa propre mémoire conversationnelle
- Les conversations sont isolées par nom d'enfant
- Jusqu'à 5 sessions sont conservées par enfant

### 4. **Interface de Gestion**
- Bouton "🧠 Mémoire" dans la navigation (visible uniquement quand un nom est défini)
- Modal affichant les statistiques :
  - Nombre total de sessions
  - Nombre total d'échanges
  - Date de la dernière conversation
- Bouton pour effacer toute la mémoire (avec confirmation)

## Architecture Technique

### Structure des Données

```typescript
interface ConversationTurn {
  timestamp: number;
  speaker: "child" | "companion";
  message: string;
}

interface ConversationSession {
  childName: string;
  startTime: number;
  turns: ConversationTurn[];
}
```

### Fonctions Principales

#### `loadConversationHistory()`
Charge toutes les sessions de conversation depuis localStorage.

#### `getCurrentSession(childName: string)`
Récupère la session active du jour pour un enfant, ou en crée une nouvelle.

#### `addConversationTurn(childName, speaker, message)`
Ajoute un tour de conversation à la session active.

#### `buildMemoryContext(childName: string)`
Construit une chaîne de contexte formatée pour le prompt système.

#### `clearConversationHistory()`
Efface toute la mémoire conversationnelle (pour la confidentialité).

#### `getConversationStats(childName: string)`
Retourne les statistiques de conversation pour un enfant.

## Limites et Considérations

### Limites Actuelles
- **Stockage local uniquement** : Les données sont stockées dans le navigateur et ne sont pas synchronisées entre appareils
- **Pas de chiffrement** : Les conversations sont stockées en clair dans localStorage
- **Limite de 20 tours** : Seuls les 20 derniers tours sont conservés par session
- **Limite de 5 sessions** : Seules les 5 dernières sessions sont conservées

### Considérations de Confidentialité
- Les données restent sur l'appareil de l'utilisateur
- Aucune donnée n'est envoyée à un serveur externe (sauf via l'API Gemini pendant la conversation)
- Les parents peuvent effacer la mémoire à tout moment
- Conforme au RGPD (données locales, contrôle parental)

## Intégration avec l'IA

Le système de mémoire s'intègre automatiquement dans le prompt système :

```typescript
const memoryContext = buildMemoryContext(childName);
const systemPrompt = `
  ${basePrompt}
  
  ${memoryContext}
`;
```

L'IA reçoit alors un contexte comme :

```
### MÉMOIRE DE LA CONVERSATION :
Voici ce dont vous avez parlé récemment (pour que tu puisses te souvenir) :

Marie: J'aime les dinosaures
Toi: C'est super ! Quel est ton dinosaure préféré ?
Marie: Le T-Rex !
Toi: Le T-Rex est impressionnant ! Savais-tu qu'il pouvait courir très vite ?

Utilise ces informations pour rendre la conversation plus naturelle et personnelle.
```

## Tests

Le système de mémoire est entièrement testé avec Vitest :

```bash
npm test -- conversationMemory
```

Tests couverts :
- ✅ Création de sessions
- ✅ Ajout de tours de conversation
- ✅ Construction du contexte mémoire
- ✅ Limitation des tours en mémoire
- ✅ Effacement de l'historique
- ✅ Statistiques de conversation
- ✅ Gestion multi-enfants
- ✅ Continuité des sessions quotidiennes

## Évolutions Futures

### Phase 1 : Backend (v0.4)
- Synchronisation cloud avec Supabase
- Chiffrement des conversations
- Historique complet accessible aux parents

### Phase 2 : Analyse (v1.5)
- Détection des centres d'intérêt de l'enfant
- Suggestions de sujets basées sur l'historique
- Rapports pour les parents

### Phase 3 : Intelligence (v2.0)
- Mémoire à long terme (au-delà de 20 tours)
- Résumés automatiques des conversations
- Personnalisation avancée du comportement de l'IA

## Utilisation

### Pour les Développeurs

```typescript
import { 
  addConversationTurn, 
  buildMemoryContext,
  getConversationStats 
} from './lib/conversationMemory';

// Ajouter un tour de conversation
addConversationTurn("Marie", "child", "Bonjour !");
addConversationTurn("Marie", "companion", "Salut Marie !");

// Obtenir le contexte pour le prompt
const context = buildMemoryContext("Marie");

// Obtenir les statistiques
const stats = getConversationStats("Marie");
console.log(`${stats.totalTurns} échanges au total`);
```

### Pour les Parents

1. Cliquez sur le bouton "🧠 Mémoire" dans la navigation
2. Consultez les statistiques de conversation
3. Cliquez sur "Effacer la mémoire" si nécessaire (avec confirmation)

## Sécurité

- ✅ Données stockées localement (pas de serveur)
- ✅ Contrôle parental (bouton d'effacement)
- ✅ Pas de collecte de données personnelles sensibles
- ✅ Conforme RGPD (droit à l'oubli via effacement)
- ⚠️ Pas de chiffrement (prévu pour v0.4)

## Performance

- **Stockage** : ~1-2 KB par session (négligeable)
- **Chargement** : < 1ms (lecture localStorage)
- **Impact sur l'IA** : +100-200 tokens par requête (contexte mémoire)

---

**Dernière mise à jour** : 2026-05-13  
**Version** : 1.0.0  
**Auteur** : Équipe NeuroChat AI
