const { ipcMain } = require('electron');
const { GoogleGenAI, Modality } = require('@google/genai');
require('dotenv').config();

let activeSession = null;

function registerGeminiHandlers(mainWindow) {
  ipcMain.handle('gemini:connect', async (event, systemPromptText) => {
    try {
      if (activeSession) {
        activeSession.close();
        activeSession = null;
      }

      console.log("[Main] Connexion à Gemini Live API...");
      const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

      activeSession = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            console.log("[Main] Session Gemini ouverte");
            mainWindow.webContents.send('gemini:event', { type: 'open' });
          },
          onmessage: (message) => {
            const serverContent = message.serverContent;
            const modelTurn = serverContent?.modelTurn;
            const parts = modelTurn?.parts;

            if (serverContent?.inputTranscription?.text) {
              mainWindow.webContents.send('gemini:event', {
                type: 'inputTranscription',
                text: serverContent.inputTranscription.text,
                finished: serverContent.inputTranscription.finished ?? false
              });
            }

            const aiTranscriptText =
              serverContent?.outputTranscription?.text ??
              serverContent?.modelTurn?.transcription?.text ??
              null;

            if (aiTranscriptText) {
              mainWindow.webContents.send('gemini:event', {
                type: 'outputTranscription',
                text: aiTranscriptText
              });
            }

            const base64Audio = parts?.find((p) => p.inlineData)?.inlineData?.data;
            if (base64Audio) {
              mainWindow.webContents.send('gemini:event', {
                type: 'audio',
                data: base64Audio
              });
            }

            if (serverContent?.turnComplete) {
              mainWindow.webContents.send('gemini:event', { type: 'turnComplete' });
            }

            if (serverContent?.interrupted) {
              mainWindow.webContents.send('gemini:event', { type: 'interrupted' });
            }

            const functionCall = parts?.find((p) => p.functionCall)?.functionCall;
            if (functionCall) {
              console.log(`[Main] Appel de fonction reçu: ${functionCall.name}`);
              mainWindow.webContents.send('gemini:event', {
                type: 'functionCall',
                functionCall: functionCall
              });
            }
          },
          onerror: (error) => {
            console.error("[Main] Erreur Gemini:", error);
            mainWindow.webContents.send('gemini:event', { type: 'error', error: error.message });
          },
          onclose: (event) => {
            console.log("[Main] Session Gemini fermée");
            mainWindow.webContents.send('gemini:event', { type: 'close' });
            activeSession = null;
          }
        },
        config: {
          systemInstruction: {
            parts: [{ text: systemPromptText }],
          },
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          outputAudioTranscription: {},
          tools: [{
            functionDeclarations: [
              {
                name: "execute_agent_task",
                description: "Délègue une tâche complexe d'analyse, de code ou de manipulation de fichiers à un agent autonome. Utilise ce système pour réfléchir en silence (Inner Monologue).",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    task: { type: "STRING", description: "La description claire et précise de la tâche à exécuter." }
                  },
                  required: ["task"]
                }
              },
              {
                name: "browser_control",
                description: "Contrôle le navigateur intégré. Actions supportées: navigate (url), click (selector), type (selector, text), extract, scroll (direction: up/down).",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    action: { type: "STRING", description: "L'action à exécuter (navigate, click, type, extract, scroll)." },
                    url: { type: "STRING", description: "L'URL (pour navigate)." },
                    selector: { type: "STRING", description: "Le sélecteur CSS ou texte descriptif." },
                    text: { type: "STRING", description: "Le texte à taper." },
                    direction: { type: "STRING", description: "Direction du scroll (up, down)." }
                  },
                  required: ["action"]
                }
              }
            ]
          }],
        },
      });

      return true;
    } catch (error) {
      console.error("[Main] Échec de la connexion Gemini:", error);
      return false;
    }
  });

  ipcMain.on('gemini:sendAudio', (event, base64PCM) => {
    if (activeSession) {
      activeSession.sendRealtimeInput({
        audio: { data: base64PCM, mimeType: "audio/pcm;rate=16000" },
      });
    }
  });

  ipcMain.on('gemini:sendVideo', (event, base64JPEG) => {
    if (activeSession) {
      activeSession.sendRealtimeInput({
        video: { data: base64JPEG, mimeType: "image/jpeg" },
      });
    }
  });

  ipcMain.on('gemini:sendText', (event, text) => {
    if (activeSession) {
      console.log(`[Main] Envoi de texte à Gemini: ${text.slice(0, 50)}...`);
      activeSession.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true
      });
    }
  });

  ipcMain.handle('gemini:disconnect', async () => {
    if (activeSession) {
      activeSession.close();
      activeSession = null;
    }
    return true;
  });

  ipcMain.on('gemini:sendFunctionResponse', (event, { name, response }) => {
    if (activeSession) {
      console.log(`[Main] Envoi du résultat de la fonction ${name} à Gemini`);
      activeSession.sendClientContent({
        turns: [{
          role: "user",
          parts: [{
            functionResponse: {
              name,
              response
            }
          }]
        }],
        turnComplete: true
      });
    }
  });
}

module.exports = { registerGeminiHandlers };
