import { GoogleGenAI, Modality } from "@google/genai";
import { Square, Sparkles } from "lucide-react";
import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AudioRecorder } from "./lib/AudioRecorder";
import { AudioPlayer } from "./lib/AudioPlayer";
import { IAudioRecorder, IAudioPlayer } from "./lib/AudioService";
import { buildSystemPrompt } from "./lib/systemPrompt";
import { AnimatedCharacter } from "./components/AnimatedCharacter";
import { CompactTimeWidget } from "./components/CompactTimeWidget";
import { TimeRemainingWidget } from "./components/TimeRemainingWidget";
import { AVATARS, loadSavedAvatar, loadChildName, saveChildName, type AvatarId } from "./lib/avatarConfig";
import { getUsageStatus, trackUsage, type UsageStatus } from "./lib/usageLimits";
import { addConversationTurn, clearConversationHistory, getConversationStats } from "./lib/conversationMemory";

export default function App() {
  const [status, setStatus] = useState<"idle" | "connecting" | "listening">("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>(loadSavedAvatar);
  const [childName, setChildName] = useState(loadChildName());
  const [showWelcomeModal, setShowWelcomeModal] = useState(!loadChildName());
  const [showTimeWidget, setShowTimeWidget] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [usageStatus, setUsageStatus] = useState<UsageStatus>(getUsageStatus());
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const audioLevelRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Throttle audioLevel updates to animation frames for performance
  const handleAudioLevel = useCallback((level: number) => {
    audioLevelRef.current = level;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setAudioLevel(audioLevelRef.current);
        rafRef.current = null;
      });
    }
  }, []);
  const audioRecorder = useRef<IAudioRecorder | null>(null);
  const audioPlayer = useRef<IAudioPlayer | null>(null);
  const sessionRef = useRef<any>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const usageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const avatar = AVATARS[avatarId];

  useEffect(() => {
    audioRecorder.current = new AudioRecorder();
    audioPlayer.current = new AudioPlayer();

    // Check usage status every minute
    statusIntervalRef.current = setInterval(() => {
      const status = getUsageStatus();
      setUsageStatus(status);
      if (status.isRestricted && sessionRef.current) {
        stopSession();
      }
    }, 60000);

    return () => {
      audioRecorder.current?.stop();
      audioPlayer.current?.stop();
      sessionRef.current?.close();
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
      if (usageTimerRef.current) clearInterval(usageTimerRef.current);
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Usage tracking effect
  useEffect(() => {
    if (status === "listening" || isSpeaking) {
      usageTimerRef.current = setInterval(() => {
        trackUsage(10); // track 10 seconds
      }, 10000);
    }
    return () => {
      if (usageTimerRef.current) clearInterval(usageTimerRef.current);
    };
  }, [status, isSpeaking]);

  const startSession = async () => {
    const statusCheck = getUsageStatus();
    if (statusCheck.isRestricted) {
      setUsageStatus(statusCheck);
      setErrorMsg(statusCheck.message);
      return;
    }

    setStatus("connecting");
    setErrorMsg("");

    let retryCount = 0;
    const maxRetries = 3;

    const attemptConnection = async (): Promise<void> => {
      try {
        console.log("🚀 Démarrage de la session...");
        
        // Request microphone permission FIRST
        console.log("🎤 Demande de permission microphone...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        console.log("✅ Permission microphone accordée");
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop());
        
        const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
        audioPlayer.current?.clearQueue();

        console.log("📡 Connexion à Gemini Live...");
        // Connect and await the session before setting callbacks that rely on it
        const session = await ai.live.connect({
          model: "gemini-3.1-flash-live-preview",
          callbacks: {
            onopen: () => {
              console.log("✅ Session ouverte !");
              setStatus("listening");
              retryCount = 0; // Reset retry count on success
              // Start recording only after the session is ready
              try {
                console.log("🎤 Démarrage de l'enregistrement audio...");
                audioRecorder.current?.start(
                  (base64Data: string) => {
                    // Ensure the session is still open before sending
                    if (sessionRef.current) {
                      sessionRef.current.sendRealtimeInput({
                        audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
                      });
                    }
                  },
                  handleAudioLevel,
                );
                console.log("✅ Enregistrement audio démarré");
              } catch (error) {
                console.error("❌ Erreur lors du démarrage de l'enregistrement:", error);
              }
            },
            onmessage: (message: any) => {
              console.log("📨 Message reçu:", message);
              
              // Capture transcript from user (if available)
              const userTranscript = message.serverContent?.turnComplete;
              if (userTranscript && childName) {
                const userText = message.serverContent?.modelTurn?.parts?.find(
                  (p: any) => p.text
                )?.text;
                if (userText) {
                  setCurrentTranscript(userText);
                }
              }
              
              const base64Audio =
                message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                // Capture AI response text if available
                const aiText = message.serverContent?.modelTurn?.parts?.find(
                  (p: any) => p.text
                )?.text;
                
                if (aiText && childName) {
                  // Save the conversation turn
                  if (currentTranscript) {
                    addConversationTurn(childName, "child", currentTranscript);
                    setCurrentTranscript("");
                  }
                  addConversationTurn(childName, "companion", aiText);
                }
                
                audioPlayer.current?.play(base64Audio);
                setIsSpeaking(true);
                if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 1500);
              }
              if (message.serverContent?.interrupted) {
                audioPlayer.current?.clearQueue();
                setIsSpeaking(false);
                if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
              }
            },
            onclose: (event: any) => {
              console.log("🔴 Session fermée");
              console.log("Code de fermeture:", event?.code);
              console.log("Raison:", event?.reason);
              
              // Show error message if there's a reason
              if (event?.reason) {
                setErrorMsg(event.reason);
              }
              
              // Attempt reconnection if not manually closed
              if (event?.code !== 1000 && retryCount < maxRetries) {
                retryCount++;
                console.log(`🔄 Tentative de reconnexion ${retryCount}/${maxRetries}...`);
                setTimeout(() => attemptConnection(), 2000 * retryCount);
              } else {
                setStatus("idle");
                audioRecorder.current?.stop();
                sessionRef.current = null;
              }
            },
            onerror: (error: any) => {
              console.error("❌ Live API Error", error);
              console.error("Error details:", JSON.stringify(error, null, 2));
              setErrorMsg("Une erreur avec la connexion vocale s'est produite.");
              
              // Attempt reconnection on error
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`🔄 Tentative de reconnexion après erreur ${retryCount}/${maxRetries}...`);
                setTimeout(() => attemptConnection(), 2000 * retryCount);
              } else {
                stopSession();
              }
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
            },
            systemInstruction: buildSystemPrompt(avatarId, childName),
          },
        });

        console.log("💾 Session stockée");
        // Store the active session
        sessionRef.current = session;
      } catch (err: any) {
        console.error("💥 Failed to start session:", err);
        if (err.name === "NotAllowedError") {
          setErrorMsg("Je n'ai pas la permission d'utiliser le microphone !");
          setStatus("idle");
        } else if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 Tentative de reconnexion après échec ${retryCount}/${maxRetries}...`);
          setTimeout(() => attemptConnection(), 2000 * retryCount);
        } else {
          setErrorMsg(err.message || "Impossible de démarrer.");
          setStatus("idle");
        }
      }
    };

    await attemptConnection();
  };

  const stopSession = () => {
    // Safely close the session if it exists and is not already closed
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.warn("Attempted to close an already closed session", e);
      }
      sessionRef.current = null;
    }
    audioRecorder.current?.stop();
    audioPlayer.current?.clearQueue();
    setStatus("idle");
    setIsSpeaking(false);
    setAudioLevel(0);
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
  };

  const handleWelcomeSubmit = (name: string) => {
    setChildName(name);
    saveChildName(name);
    setShowWelcomeModal(false);
  };

  const handleClearMemory = () => {
    if (window.confirm("Êtes-vous sûr de vouloir effacer toute la mémoire des conversations ? Cette action est irréversible.")) {
      clearConversationHistory();
      setShowMemoryModal(false);
      alert("La mémoire a été effacée avec succès !");
    }
  };

  const conversationStats = childName ? getConversationStats(childName) : null;

  return (
    <div className="min-h-screen bg-[#020408] text-white flex flex-col font-sans relative overflow-hidden">
      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 md:p-12 shadow-2xl max-w-md w-full mx-4"
              style={{ boxShadow: `0 20px 60px ${avatar.colors[0]}33` }}
            >
              <div className="text-center mb-8">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${avatar.accentClass} flex items-center justify-center shadow-lg`}>
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: avatar.colors[0] }}>
                  Bienvenue ! 🎉
                </h2>
                <p className="text-slate-400 text-sm">
                  Dis-moi qui tu es pour commencer l'aventure
                </p>
              </div>

              <form
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get("name") as string;
                  if (name) {
                    handleWelcomeSubmit(name);
                  }
                }}
                className="space-y-6"
              >
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                    Ton prénom
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    autoFocus
                    placeholder="Ex: Marie"
                    aria-label="Prénom de l'enfant"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  aria-label="Commencer l'aventure"
                  className="w-full py-3.5 sm:py-4 bg-gradient-to-r font-bold text-base sm:text-lg rounded-2xl shadow-xl hover:scale-105 transition-transform"
                  style={{ 
                    background: `linear-gradient(135deg, ${avatar.colors[0]}, ${avatar.colors[1]})`,
                    boxShadow: `0 10px 30px ${avatar.colors[0]}44`
                  }}
                >
                  Commencer ! 🚀
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory Modal */}
      <AnimatePresence>
        {showMemoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowMemoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-[28px] sm:rounded-[32px] p-5 sm:p-8 md:p-12 shadow-2xl max-w-md w-full mx-4"
              style={{ boxShadow: `0 20px 60px ${avatar.colors[0]}33` }}
            >
              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${avatar.accentClass} flex items-center justify-center shadow-lg`}>
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: avatar.colors[0] }}>
                  Mémoire du Compagnon 🧠
                </h2>
                <p className="text-slate-400 text-sm">
                  Statistiques des conversations
                </p>
              </div>

              {conversationStats && (
                <div className="space-y-4 mb-6">
                  <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                    <div className="text-sm text-slate-400 mb-1">Sessions totales</div>
                    <div className="text-2xl font-bold" style={{ color: avatar.colors[0] }}>
                      {conversationStats.totalSessions}
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                    <div className="text-sm text-slate-400 mb-1">Échanges totaux</div>
                    <div className="text-2xl font-bold" style={{ color: avatar.colors[0] }}>
                      {conversationStats.totalTurns}
                    </div>
                  </div>
                  
                  {conversationStats.lastConversationDate && (
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                      <div className="text-sm text-slate-400 mb-1">Dernière conversation</div>
                      <div className="text-lg font-medium text-slate-200">
                        {conversationStats.lastConversationDate.toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleClearMemory}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 font-bold text-base rounded-2xl shadow-xl hover:scale-105 transition-transform"
                >
                  Effacer la mémoire 🗑️
                </button>
                
                <button
                  onClick={() => setShowMemoryModal(false)}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 font-medium text-base rounded-2xl transition-colors"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Atmosphere — colors adapt to avatar */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full ${avatar.atmosphereColors[0]} blur-[120px]`}></div>
        <div className={`absolute bottom-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full ${avatar.atmosphereColors[1]} blur-[120px]`}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(66,133,244,0.05)_0%,transparent_70%)]"></div>
      </div>

      {/* Header Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatar.accentClass} flex items-center justify-center shadow-lg`} style={{ boxShadow: `0 4px 14px ${avatar.colors[0]}33` }}>
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-base sm:text-lg lg:text-xl font-semibold tracking-tight">KidsVoice <span style={{ color: avatar.colors[0] }}>AI</span></span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm font-medium text-slate-400 flex-wrap justify-end">
          
          {/* Child Name Input / Greeting — only when idle */}
          {status === "idle" && (
            <div className="flex items-center gap-2">
              {!childName ? (
                <div className="flex items-center gap-2 bg-slate-800/30 px-3 py-1.5 rounded-full border border-slate-700/30 focus-within:border-slate-500 transition-colors">
                  <span className="text-xs uppercase tracking-wider font-bold opacity-50">Ton Prénom :</span>
                  <input
                    type="text"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value;
                        setChildName(val);
                        saveChildName(val);
                      }
                    }}
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                      const val = e.target.value;
                      if (val) {
                        setChildName(val);
                        saveChildName(val);
                      }
                    }}
                    placeholder="Tape ici..."
                    aria-label="Ton prénom"
                    className="bg-transparent border-none outline-none text-slate-200 w-24 sm:w-32 placeholder:text-slate-600"
                  />
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-slate-800/30 px-4 py-1.5 rounded-full border border-slate-700/30"
                >
                  <span className="text-slate-300">Salut, <span className="font-bold" style={{ color: avatar.colors[0] }}>{childName}</span> !</span>
                  <button 
                    onClick={() => {
                      setChildName("");
                      saveChildName("");
                    }}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                    title="Changer de nom"
                  >
                    (Changer)
                  </button>
                </motion.div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-700/50">
            <div className={`w-2 h-2 rounded-full ${usageStatus.isRestricted ? "bg-amber-400" : "bg-green-400"}`}></div>
            <span>{usageStatus.isRestricted ? "Mode Repos" : "En ligne"}</span>
          </div>
          
          {/* Memory Button - Only visible when idle and child name is set */}
          {status === "idle" && childName && (
            <button
              onClick={() => setShowMemoryModal(true)}
              className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-700/50 hover:border-slate-500 transition-colors"
              title="Voir la mémoire du compagnon"
            >
              <span>🧠</span>
              <span className="hidden sm:inline">Mémoire</span>
            </button>
          )}
        </div>
      </nav>

      {/* Rest Mode Overlay */}
      <AnimatePresence>
        {usageStatus.isRestricted && status === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 sm:bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 sm:px-6"
          >
            <div className="bg-amber-900/40 border border-amber-500/30 backdrop-blur-xl p-6 rounded-[32px] text-center shadow-2xl">
              <span className="text-3xl mb-3 block">{usageStatus.reason === "night" ? "🌙" : "⏳"}</span>
              <h3 className="text-xl font-bold text-amber-200 mb-2">
                {usageStatus.reason === "night" ? "C'est l'heure de dormir" : "Pause nécessaire"}
              </h3>
              <p className="text-amber-100/80 text-sm leading-relaxed">
                {usageStatus.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Interaction Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-10 lg:px-20">
        

        {/* Toggle Widget Button */}
        {/* {status === "idle" && !usageStatus.isRestricted && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowTimeWidget(!showTimeWidget)}
            className="fixed top-32 right-6 z-20 w-12 h-12 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            style={{ boxShadow: `0 4px 14px ${avatar.colors[0]}33` }}
            aria-label={showTimeWidget ? "Masquer le widget de temps" : "Afficher le widget de temps"}
            title={showTimeWidget ? "Masquer" : "Voir le temps restant"}
          >
            <motion.div
              animate={{ rotate: showTimeWidget ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <Sparkles className="w-5 h-5" style={{ color: avatar.colors[0] }} />
            </motion.div>
          </motion.button>
        )} */}
        
        {/* Error Messages */}
        <div className="absolute top-10 inset-x-0 flex justify-center w-full z-30 pointer-events-none px-4">
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-red-300 font-medium bg-red-900/40 border border-red-500/30 px-6 py-3 rounded-full text-sm shadow-2xl backdrop-blur-md max-w-lg text-center"
              >
                {errorMsg}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* The Listening/Speaking Orb */}
        <div className="relative mb-8 sm:mb-12 lg:mb-16 mt-4 sm:mt-6 lg:mt-8 flex items-center justify-center">
          {/* Glow Rings for Listening state */}
          <AnimatePresence>
            {status === "listening" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <motion.div
                  animate={{ scale: [1.2, 1.6, 1.2], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-64 h-64 rounded-full"
                  style={{ border: `1px solid ${avatar.colors[0]}33` }}
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-64 h-64 rounded-full"
                  style={{ border: `1px solid ${avatar.colors[2]}4D` }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Main Controls inside Orb */}
          <div className="relative z-20 flex items-center justify-center">
            {status === "idle" ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startSession}
                className="relative rounded-full focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                title="Clique pour parler !"
                aria-label="Démarrer la conversation vocale"
              >
                <AnimatedCharacter status={status} isSpeaking={isSpeaking} avatarId={avatarId} audioLevel={audioLevel} isRestricted={usageStatus.isRestricted} />
              </motion.button>
            ) : (
              <AnimatedCharacter status={status} isSpeaking={isSpeaking} avatarId={avatarId} audioLevel={audioLevel} isRestricted={usageStatus.isRestricted} />
            )}
          </div>
        </div>

        {/* Live Text / Status Preview */}
        <div className="w-full max-w-2xl text-center space-y-4">
          <h1 className="text-3xl font-medium text-slate-100">
            Votre assistant IA personnel
          </h1>
          
          <div className="h-10">
            <AnimatePresence mode="wait">
              {status === "idle" && (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xl text-slate-400 font-light leading-relaxed"
                >
                  Appuie sur moi pour parler !
                </motion.p>
              )}
              {status === "connecting" && (
                <motion.p
                  key="connect"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xl font-light leading-relaxed"
                  style={{ color: avatar.colors[0] }}
                >
                  Connexion magique en cours...
                </motion.p>
              )}
              {status === "listening" && (
                <motion.p
                  key="listen"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-xl text-slate-300 font-light leading-relaxed animate-pulse"
                >
                  Je t'écoute... Pose ta question à haute voix !
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
      
      {/* Footer Controls (Visible during conversation) */}
      <AnimatePresence>
        {(status === "listening" || status === "connecting") && (
          <motion.footer 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="relative z-10 px-10 py-12 flex justify-center items-end"
          >
            <div className="flex items-center gap-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 p-2 rounded-[40px] shadow-2xl">
              <button 
                onClick={stopSession}
                className="px-12 py-5 bg-white text-black font-bold text-lg rounded-[32px] shadow-xl hover:scale-105 transition-transform flex gap-3 items-center focus:outline-none focus:ring-4 focus:ring-white/50"
                aria-label="Arrêter la conversation"
              >
                <Square className="w-5 h-5" fill="currentColor" />
                ARRÊTER
              </button>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}
