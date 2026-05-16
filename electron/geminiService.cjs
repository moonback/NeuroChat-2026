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
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Leda" } },
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

  // ── Phase 1: Vision Proactive (améliorée) ──────────────────────────────────
  let lastVisionContext = "";
  let stagnationCounter = 0;

  // Circuit breaker: après N échecs consécutifs, pause pendant COOLDOWN_MS
  let visionFailures = 0;
  const VISION_MAX_FAILURES = 3;
  const VISION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
  let visionCooldownUntil = 0;

  // Ordered list of free vision-capable models (fallback chain)
  const VISION_MODELS = [
    "google/gemma-4-31b-it:free",
    "nvidia/nvidia-nemotron-3-nano-omni:free",
    "openrouter/free",
  ];

  async function callOpenRouterVision(base64, prompt) {
    const apiKey = process.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("VITE_OPENROUTER_API_KEY manquante");

    let lastError = null;

    for (const model of VISION_MODELS) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://neurochatia.vercel.app",
            "X-Title": "NeuroChat",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64}`
                    }
                  }
                ]
              }
            ],
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          console.warn(`[Vision] Modèle ${model} échoué (${response.status}): ${errBody.error?.message || "unknown"}`);
          lastError = new Error(errBody.error?.message || `HTTP ${response.status}`);
          continue; // Try next model
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          console.log(`[Vision] ✅ Modèle ${model} utilisé avec succès`);
          return content;
        }
      } catch (err) {
        console.warn(`[Vision] Modèle ${model} exception:`, err.message);
        lastError = err;
        continue;
      }
    }

    throw lastError || new Error("Aucun modèle de vision disponible");
  }

  ipcMain.handle('gemini:analyzeStagnation', async (event, payload) => {
    // Circuit breaker check
    const now = Date.now();
    if (now < visionCooldownUntil) {
      return { isStagnant: false };
    }

    try {
      const { base64, source } = payload;

      let prompt = "";
      if (source === "camera") {
        prompt = `Voici une image de la webcam de l'utilisateur. Analyse son humeur, son énergie et sa posture.
Est-ce que l'utilisateur semble s'affaisser, être très fatigué, se frotter les yeux, ou avoir l'air bloqué / frustré ?
Réponds strictement au format JSON : {"progress": boolean, "newContext": "description de sa posture/humeur"}. "progress": false signifie qu'il est en stagnation physique/fatigue.`;
      } else {
        prompt = `Voici une capture de l'écran de l'utilisateur.
Le contexte précédent était : "${lastVisionContext || "Aucun contexte"}".
L'utilisateur a-t-il fait des progrès significatifs ou complètement changé d'activité sémantique (pas juste scrollé ou tapé 2 mots) ?
Réponds strictement au format JSON : {"progress": boolean, "newContext": "description courte de 1 phrase"}`;
      }

      const aiResponse = await callOpenRouterVision(base64, prompt);

      if (aiResponse) {
        // Reset circuit breaker on success
        visionFailures = 0;

        // Parse JSON robustly (handle markdown code blocks)
        let jsonStr = aiResponse;
        const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        const result = JSON.parse(jsonStr);
        lastVisionContext = result.newContext;

        if (!result.progress) {
          stagnationCounter++;
          console.log(`[Vision Proactive] 🧠 Stagnation confirmée (${stagnationCounter}/3) : ${result.newContext}`);
          if (stagnationCounter >= 3) {
            stagnationCounter = 0;
            return { isStagnant: true, context: result.newContext };
          }
        } else {
          stagnationCounter = 0;
          console.log(`[Vision Proactive] ✅ Progrès détecté : ${result.newContext}`);
        }
      }
      return { isStagnant: false };
    } catch (err) {
      visionFailures++;
      if (visionFailures >= VISION_MAX_FAILURES) {
        visionCooldownUntil = Date.now() + VISION_COOLDOWN_MS;
        console.error(`[Vision Proactive] ⛔ Circuit breaker activé (${VISION_MAX_FAILURES} échecs). Pause de 5 min.`);
        visionFailures = 0;
      } else {
        console.warn(`[Vision Proactive] ⚠️ Échec ${visionFailures}/${VISION_MAX_FAILURES}: ${err.message}`);
      }
      return { isStagnant: false };
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
