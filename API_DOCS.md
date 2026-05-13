# Documentation de l'API (Live API Integration) 🔌

Bien que cette application ne définisse pas d'API REST interne (serveur backend Node.js), elle dépend fortement d'une intégration en temps réel (WebSocket) détaillée ci-dessous.

## 1. Google Gemini Live API

L'API principale utilisée est le SDK officiel `@google/genai` pour initier une session WebSocket temps réel avec le modèle vocal.

### Authentification
L'authentification se fait via un identifiant passé dans le frontend.
- **Header/Secret** : `GEMINI_API_KEY` (Fourni lors de l'instanciation de `GoogleGenAI`).

### Initialisation de session : `ai.live.connect()`

Initialisée dans `App.tsx` (fonction `startSession`).

**Configuration :**
```typescript
{
  model: "gemini-3.1-flash-live-preview",
  config: {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
    },
    systemInstruction: "..." // Chargé depuis lib/systemPrompt.ts
  }
}
```

### Événements et Callbacks WebSocket

1. **`onopen`** : 
   - Déclenché lorsque le tunnel WebSocket est ouvert et prêt. 
   - **Action** : Modifie l'état UI à `listening`, démarre l'`AudioRecorder` (microphone).

2. **Émission de messages (Client -> Serveur)** :
   - Fonction : `session.sendRealtimeInput(payload)`
   - Payload : Audio encodé
   ```json
   {
     "audio": {
       "data": "base64String...",
       "mimeType": "audio/pcm;rate=16000"
     }
   }
   ```
   > ⚠️ **Format audio requis** : Le serveur Gemini attend des tampons audio échantillonnés à **16 kHz** en **PCM 16-bit Mono**.

3. **`onmessage`** :
   - Déclenché lors du retour audio ou texte de Gemini.
   - **Action** : Traite les chunks audio `message.serverContent.modelTurn.parts[0].inlineData.data`. 
   - **Interruption** : Si l'utilisateur parle pendant que Gemini répond, un événement d'interruption `message.serverContent.interrupted === true` est envoyé. La file d'attente `AudioPlayer` est alors purgée.

4. **`onclose` & `onerror`** :
   - Fermeture ordonnée ou due à une erreur de réseau.
   - Purgement de l'audio (`audioRecorder.stop()`, `audioPlayer.clearQueue()`).

---

## 2. API Futures (Planification Supabase)

Si une intégration Supabase (PostgreSQL + REST) est ajoutée (selon la ROADMAP), voici les points finaux REST générés `PostgREST` qui seront envisagés :

### `POST /auth/v1/signup`
- Gestion des utilisateurs (Parents et Enfants).

### `GET /rest/v1/sessions`
- Historique de session, durée de la discussion.
- Dépend du token JWT généré par le service auth.
