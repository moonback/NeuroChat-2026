import { Square, Sparkles, Camera, CameraOff, RefreshCcw } from "lucide-react";
import { useState, FormEvent, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedCharacter } from "./components/AnimatedCharacter";
import { AVATARS, type AvatarId } from "./lib/avatarConfig";
import { useAudioSession } from "./hooks/useAudioSession";
import { useConversationMemory } from "./hooks/useConversationMemory";
import { useGeminiSession } from "./hooks/useGeminiSession";
import { ConversationVault } from "./components/ConversationVault";
import { VideoService } from "./lib/VideoService";
import { Header } from "./components/layout/Header";

export default function App() {
  const [avatarId, setAvatarId] = useState<AvatarId>("robot");
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoServiceRef = useRef<VideoService | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const sendInputRef = useRef<((base64: string, type: 'audio' | 'video') => void) | null>(null);

  const avatar = AVATARS[avatarId];

  // Initialize hooks
  const {
    isSpeaking,
    audioLevel,
    playAudio,
    stopAudio,
    startRecording,
    stopRecording
  } = useAudioSession();

  const {
    userName,
    showWelcomeModal,
    showMemoryModal,
    setShowMemoryModal,
    handleWelcomeSubmit,
    handleClearMemory,
    updateUserName,
    memoryData,
    selectedSession,
    setSelectedSessionId,
    addTurn
  } = useConversationMemory();

  const {
    status,
    errorMsg,
    setErrorMsg,
    startSession,
    stopSession
  } = useGeminiSession();

  const handleStartSession = async () => {
    await startSession({
      avatarId,
      userName,
      enableVideo: cameraActive,
      onAudioResponse: (base64, aiText) => {
        playAudio(base64);
        if (aiText && userName) {
          addTurn(userName, "assistant", aiText);
        }
      },
      onTranscription: (text, finished) => {
        setCurrentTranscript(text);
        if (finished && userName) {
          addTurn(userName, "user", text);
        }
      },
      onInterrupted: () => {
        // Dynamic threshold: higher when AI is speaking to avoid echo triggering barge-in
        const threshold = isSpeaking ? 0.15 : 0.08;
        if (audioLevel > threshold) {
          console.log(`🗣️ Interruption détectée (${audioLevel.toFixed(2)} > ${threshold})`);
          stopAudio();
        } else {
          console.log(`🔇 Bruit ignoré (${audioLevel.toFixed(2)} <= ${threshold})`);
        }
      },
      onRecordingStart: (sendInput) => {
        sendInputRef.current = sendInput;
        startRecording((audioBase64) => sendInput(audioBase64, 'audio'));
      },
      onStopRecording: () => {
        stopRecording();
        sendInputRef.current = null;
        if (videoServiceRef.current) {
          videoServiceRef.current.stop();
          videoServiceRef.current = null;
          setVideoStream(null);
        }
      }
    });
  };

  const handleStopSession = () => {
    stopSession(() => {
      stopRecording();
      if (videoServiceRef.current) {
        videoServiceRef.current.stop();
        videoServiceRef.current = null;
        setVideoStream(null);
      }
    }, userName ?? undefined);
    stopAudio();
    sendInputRef.current = null;
  };

  const toggleCameraFacingMode = async () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    
    if (videoServiceRef.current && cameraActive) {
      videoServiceRef.current.stop();
      try {
        await videoServiceRef.current.start(nextMode);
        setVideoStream(videoServiceRef.current.getStream() || null);
      } catch (err) {
        console.error("Erreur lors du changement de caméra:", err);
      }
    }
  };

  // Manage VideoService reactively based on cameraActive and session status
  useEffect(() => {
    if (status === "listening" && cameraActive && !videoServiceRef.current && sendInputRef.current) {
      console.log("🎥 Activation de la caméra...");
      videoServiceRef.current = new VideoService((videoBase64) => {
        sendInputRef.current?.(videoBase64, 'video');
      });

      videoServiceRef.current.start(facingMode)
        .then(() => {
          setVideoStream(videoServiceRef.current?.getStream() || null);
        })
        .catch(err => {
          console.error("Erreur caméra:", err);
          setErrorMsg("Impossible d'accéder à la caméra.");
          setCameraActive(false);
        });
    } else if ((!cameraActive || status !== "listening") && videoServiceRef.current) {
      console.log("🛑 Désactivation de la caméra...");
      videoServiceRef.current.stop();
      videoServiceRef.current = null;
      setVideoStream(null);
    }
  }, [cameraActive, status]);

  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
      videoPreviewRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

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
                  Bienvenue !
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
                    aria-label="Votre prénom"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  aria-label="Démarrer l'assistant"
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

      {/* Memory Vault (Advanced) */}
      <ConversationVault
        isOpen={showMemoryModal}
        onClose={() => setShowMemoryModal(false)}
        userName={userName}
        memoryData={memoryData}
        selectedSession={selectedSession}
        onSelectSession={setSelectedSessionId}
        onClearMemory={handleClearMemory}
        accentColor={avatar.colors[0]}
      />

      {/* Background Atmosphere — colors adapt to avatar */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full ${avatar.atmosphereColors[0]} blur-[120px]`}></div>
        <div className={`absolute bottom-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full ${avatar.atmosphereColors[1]} blur-[120px]`}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(66,133,244,0.05)_0%,transparent_70%)]"></div>
      </div>

      <Header 
        avatar={avatar}
        status={status}
        userName={userName}
        updateUserName={updateUserName}
        onShowMemory={() => setShowMemoryModal(true)}
      />


      {/* Main Interaction Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-10 lg:px-20">



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
                onClick={handleStartSession}
                className="relative rounded-full focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                title="Clique pour parler !"
                aria-label="Démarrer la conversation vocale"
              >
                <AnimatedCharacter status={status} isSpeaking={isSpeaking} avatarId={avatarId} audioLevel={audioLevel} />
              </motion.button>
            ) : (
              <div className="relative">
                <AnimatedCharacter status={status} isSpeaking={isSpeaking} avatarId={avatarId} audioLevel={audioLevel} />

                {/* Video PiP Preview */}
                <AnimatePresence>
                  {cameraActive && videoStream && (
                    <motion.div
                      drag
                      dragConstraints={{ left: -window.innerWidth + 160, right: 0, top: -window.innerHeight + 240, bottom: 0 }}
                      dragElastic={0.1}
                      whileDrag={{ scale: 1.05, rotate: 1, boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}
                      initial={{ opacity: 0, scale: 0.5, y: 20, rotate: -2 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        rotate: 0,
                        borderColor: isSpeaking ? "rgba(96, 165, 250, 0.6)" : "rgba(255, 255, 255, 0.2)",
                        boxShadow: isSpeaking
                          ? "0 0 30px rgba(96, 165, 250, 0.3), 0 25px 60px rgba(0,0,0,0.5)"
                          : "0 0 0px rgba(96, 165, 250, 0), 0 25px 60px rgba(0,0,0,0.5)"
                      }}
                      exit={{ opacity: 0, scale: 0.5, y: 20 }}
                      className="absolute -bottom-4 -right-4 w-40 h-30 sm:w-56 sm:h-42 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/20 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] z-30 group cursor-grab active:cursor-grabbing"
                    >
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        muted
                        playsInline
                        className={`w-full h-full object-cover ${facingMode === "user" ? "mirror" : ""}`}
                      />

                      {/* Premium Overlay Effects */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                      {/* Scanning Animation Line */}
                      <motion.div
                        animate={{ top: ["0%", "100%", "0%"] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[2px] bg-blue-400/30 blur-[1px] z-10 pointer-events-none"
                      />

                      {/* UI Elements inside PiP */}
                      <div className="absolute top-2 left-3 flex items-center gap-1.5 px-2 py-0.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-white/90 uppercase tracking-tighter">Vision Active</span>
                      </div>

                      <div className="absolute bottom-2 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] text-white/60">Déplace-moi</span>
                      </div>

                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-400/50 rounded-tl-sm" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-blue-400/50 rounded-tr-sm" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-blue-400/50 rounded-bl-sm" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-400/50 rounded-br-sm" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Live Text / Status Preview */}
        <div className="w-full max-w-2xl text-center space-y-4">
          <h1 className="text-3xl font-medium text-slate-100">
            NeuroChat : Votre Assistant Intelligent
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
            <div className="flex items-center gap-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 p-2 rounded-[40px] shadow-2xl">
              <button
                onClick={() => setCameraActive(!cameraActive)}
                className={`w-14 h-14 flex items-center justify-center rounded-full transition-all ${cameraActive
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"
                  }`}
                title={cameraActive ? "Désactiver la caméra" : "Activer la caméra"}
              >
                {cameraActive ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </button>

              {cameraActive && (
                <button
                  onClick={toggleCameraFacingMode}
                  className="w-14 h-14 flex items-center justify-center rounded-full transition-all bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"
                  title="Changer de caméra"
                >
                  <RefreshCcw className="w-6 h-6" />
                </button>
              )}

              <button
                onClick={handleStopSession}
                className="px-10 py-4 bg-white text-black font-bold text-lg rounded-[32px] shadow-xl hover:scale-105 transition-transform flex gap-3 items-center focus:outline-none focus:ring-4 focus:ring-white/50"
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
