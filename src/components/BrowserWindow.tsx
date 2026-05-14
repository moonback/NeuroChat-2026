/**
 * BrowserWindow - Fenêtre de navigateur intégrée contrôlée par l'assistant
 */

import { motion, AnimatePresence } from "motion/react";
import { X, Maximize2, Minimize2, RefreshCw, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface BrowserWindowProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onNavigate: (url: string) => void;
  accentColor: string;
}

export function BrowserWindow({
  isOpen,
  onClose,
  currentUrl,
  onNavigate,
  accentColor,
}: BrowserWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setInputUrl(currentUrl);
    // console.log("🔄 [BrowserWindow] URL mise à jour:", currentUrl);
  }, [currentUrl]);

  useEffect(() => {
    // console.log("👁️ [BrowserWindow] État d'ouverture changé:", isOpen);
  }, [isOpen]);

  const handleNavigate = () => {
    let url = inputUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    console.log("🧭 [BrowserWindow] Navigation manuelle vers:", url);
    onNavigate(url);
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleOpenExternal = () => {
    window.open(currentUrl, "_blank");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ 
            scale: isMaximized ? 1 : 0.95, 
            opacity: 1, 
            y: 0,
            width: isMaximized ? "100%" : "90%",
            height: isMaximized ? "100%" : "85%",
          }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ 
            maxWidth: isMaximized ? "100%" : "1400px",
            boxShadow: `0 25px 80px ${accentColor}40`,
          }}
        >
          {/* Header */}
          <div className="bg-slate-800/90 border-b border-slate-700/50 p-3 flex items-center gap-3">
            {/* Window Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                title="Fermer"
              />
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
                title={isMaximized ? "Restaurer" : "Maximiser"}
              />
              <button
                className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
                title="Minimiser"
              />
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Précédent"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => window.history.forward()}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Suivant"
              >
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* URL Bar */}
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-slate-700/50 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">🔒</span>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
                  className="flex-1 bg-transparent text-sm text-slate-200 outline-none"
                  placeholder="Entrez une URL..."
                />
              </div>
              <button
                onClick={handleOpenExternal}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors ml-2"
              title="Fermer"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Browser Content */}
          <div className="flex-1 bg-white relative overflow-hidden">
            {currentUrl ? (
              <iframe
                ref={iframeRef}
                src={currentUrl}
                className="w-full h-full border-0"
                title="Browser Window"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-slate-900">
                <div className="text-center">
                  <div className="text-6xl mb-4">🌐</div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Navigateur NeuroChat
                  </h3>
                  <p className="text-slate-400 mb-6">
                    Demandez-moi d'ouvrir un site web !
                  </p>
                  <div className="flex flex-col gap-2 text-sm text-slate-500">
                    <p>Exemples :</p>
                    <p>"Va sur Google"</p>
                    <p>"Ouvre YouTube"</p>
                    <p>"Cherche la météo"</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {currentUrl && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2 }}
                  className="h-full"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="bg-slate-800/90 border-t border-slate-700/50 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>🤖 Contrôlé par NeuroChat</span>
              {currentUrl && (
                <span className="text-green-400">● Connecté</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>Appuyez sur Échap pour fermer</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
