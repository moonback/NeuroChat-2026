import { Square, Sparkles, Camera, CameraOff } from "lucide-react";
import { useState, FormEvent, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedCharacter } from "./components/AnimatedCharacter";
import { AVATARS, type AvatarId } from "./lib/avatarConfig";
import { useAudioSession } from "./hooks/useAudioSession";
import { useConversationMemory } from "./hooks/useConversationMemory";
import { useGeminiSession } from "./hooks/useGeminiSession";
import { ConversationVault } from "./components/ConversationVault";
import { VideoService } from "./lib/VideoService";

export default function App() {
  const [avatarId, setAvatarId] = useState<AvatarId>("robot");
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [cameraActive, setCameraActive] = useState(false);
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
        stopAudio();
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
    });
    stopAudio();
    sendInputRef.current = null;
  };

  // Manage VideoService reactively based on cameraActive and session status
  useEffect(() => {
    if (status === "listening" && cameraActive && !videoServiceRef.current && sendInputRef.current) {
      console.log("🎥 Activation de la caméra...");
      videoServiceRef.current = new VideoService((videoBase64) => {
        sendInputRef.current?.(videoBase64, 'video');
      });
      
      videoServiceRef.current.start()
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

      {/* Header Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatar.accentClass} flex items-center justify-center shadow-lg`} style={{ boxShadow: `0 4px 14px ${avatar.colors[0]}33` }}>
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-base sm:text-lg lg:text-xl font-semibold tracking-tight">NeuroChat <span style={{ color: avatar.colors[0] }}>AI</span></span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm font-medium text-slate-400 flex-wrap justify-end">

          {/* User Name Input / Greeting — only when idle */}
          {status === "idle" && (
            <div className="flex items-center gap-2">
              {!userName ? (
                <div className="flex items-center gap-2 bg-slate-800/30 px-3 py-1.5 rounded-full border border-slate-700/30 focus-within:border-slate-500 transition-colors">
                  <span className="text-xs uppercase tracking-wider font-bold opacity-50">Votre Prénom :</span>
                  <input
                    type="text"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value;
                        updateUserName(val);
                      }
                    }}
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                      const val = e.target.value;
                      if (val) {
                        updateUserName(val);
                      }
                    }}
                    placeholder="Tape ici..."
                    aria-label="Votre prénom"
                    className="bg-transparent border-none outline-none text-slate-200 w-24 sm:w-32 placeholder:text-slate-600"
                  />
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-slate-800/30 px-4 py-1.5 rounded-full border border-slate-700/30"
                >
                  <span className="text-slate-300">Bonjour, <span className="font-bold" style={{ color: avatar.colors[0] }}>{userName}</span> !</span>
                  <button
                    onClick={() => {
                      updateUserName("");
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


          {/* Memory Button - Only visible when idle and user name is set */}
          {status === "idle" && userName && (
            <button
              onClick={() => setShowMemoryModal(true)}
              className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-700/50 hover:border-slate-500 transition-colors"
              title="Voir la mémoire de l'assistant"
            >
              <span>🧠</span>
              <span className="hidden sm:inline">Mémoire</span>
            </button>
          )}
        </div>
      </nav>


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
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: 20 }}
                      className="absolute -bottom-4 -right-4 w-32 h-24 sm:w-40 sm:h-30 bg-slate-900 rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl z-30 group"
                    >
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover mirror"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                      <div className="absolute bottom-1 right-2 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[8px] font-bold text-white/80 uppercase tracking-widest">LIVE</span>
                      </div>
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
                className={`w-14 h-14 flex items-center justify-center rounded-full transition-all ${
                  cameraActive 
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"
                }`}
                title={cameraActive ? "Désactiver la caméra" : "Activer la caméra"}
              >
                {cameraActive ? <Camera className="w-6 h-6" /> : <CameraOff className="w-6 h-6" />}
              </button>

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
