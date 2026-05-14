# 🔌 Référence API — NeuroChat

Ce document répertorie les points d'entrée (endpoints) externes consommés par NeuroChat ainsi que les services internes structurants.

---

## 🤖 Services d'IA Externes

### 1. Google Gemini Multimodal Live
Utilisé pour l'interaction vocale et visuelle en temps réel.

- **URL** : `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`
- **Méthode** : WebSocket (Bidirectionnel)
- **Authentification** : Clé API transmise via query parameter `key`.
- **Rôle** : Reçoit des flux audio (PCM) et vidéo (JPEG) et renvoie des flux audio et texte en temps réel.

### 2. OpenRouter (Failover & Synthèses)
Utilisé pour les tâches asynchrones ou en cas d'indisponibilité du service principal.

- **Méthode** : `POST`
- **Route** : `https://openrouter.ai/api/v1/chat/completions`
- **Authentification** : Bearer Token (`VITE_OPENROUTER_API_KEY`)
- **Corps de la requête** :
| Nom | Type | Requis | Description |
| :--- | :--- | :--- | :--- |
| `model` | `string` | Oui | Identifiant du modèle (ex: `minimax/minimax-m2.5:free`) |
| `messages` | `array` | Oui | Liste des messages `{role, content}` |
| `temperature`| `number` | Non | Créativité (défaut: 0.7) |

---

## 🏛️ Services Internes (Pseudo-API)

Bien que l'application soit client-side, les modules suivants agissent comme une couche API interne.

### 📦 Vector Store (`src/lib/vectorStore.ts`)
Gère l'indexation et la recherche sémantique locale.

| Fonction | Description | Paramètres |
| :--- | :--- | :--- |
| `addVectorEntry` | Ajoute un vecteur au store | `entry: VectorEntry` |
| `semanticSearch` | Recherche par similarité | `query: string, userName: string, topK: number` |
| `clearUserVectors`| Efface les données d'un utilisateur | `userName: string` |

### 🧠 Conversation Memory (`src/lib/conversationMemory.ts`)
Gère la persistance des sessions de chat.

| Fonction | Description | Retour |
| :--- | :--- | :--- |
| `loadAllSessions`| Charge tout l'historique | `ConversationSession[]` |
| `addConversationTurn` | Ajoute un message à la session | `void` |
| `buildMemoryContext` | Génère le contexte pour le prompt | `string` |

---

## 📂 Formats de Données

### Objet `ConversationSession`
```json
{
  "id": "session_173956..._abc123",
  "userName": "Maysson",
  "startTime": 173956...,
  "endTime": 173957...,
  "turns": [
    {
      "timestamp": 173956...,
      "speaker": "user",
      "message": "Bonjour NeuroChat"
    }
  ],
  "summary": "Résumé de la session...",
  "topic": "Salutations"
}
```

---

> ⚠️ À compléter : Détails sur les schémas de réponse exacts de l'API Gemini Live (BidiGenerateContent).
