import React from 'react';
import { Sparkles, Brain, User, LogOut, Database } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AvatarConfig } from "../../lib/avatarConfig";

interface HeaderProps {
  avatar: AvatarConfig;
  status: "idle" | "connecting" | "listening";
  userName: string | null;
  updateUserName: (name: string) => void;
  onShowMemory: () => void;
  onShowDatabase: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  avatar,
  status,
  userName,
  updateUserName,
  onShowMemory,
  onShowDatabase
}) => {
  return (
    <nav className="relative z-50 flex items-center justify-between px-4 py-3 sm:px-10 sm:py-6 lg:px-16">
      {/* Brand / Logo Section */}
      <div className="flex items-center gap-4 group cursor-pointer">
        {/* <motion.div 
          whileHover={{ rotate: 15, scale: 1.1 }}
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatar.accentClass} flex items-center justify-center shadow-2xl relative overflow-hidden`}
          style={{ boxShadow: `0 8px 20px ${avatar.colors[0]}44` }}
        >
          <Sparkles className="w-7 h-7 text-white relative z-10" />
          <motion.div 
            animate={{ 
              top: ["-100%", "200%"],
              left: ["-100%", "200%"]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent w-full h-full transform -rotate-45"
          />
        </motion.div> */}

        <div className="flex flex-col">
          <span className="text-lg lg:text-2xl font-bold tracking-tight text-white leading-none">
            NeuroChat <span style={{ color: avatar.colors[0] }}>AI</span>
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${status !== "idle" ? "bg-green-500 animate-pulse" : "bg-slate-500"}`} />
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] font-bold text-slate-500">
              {status === "idle" ? "Prêt" : status === "connecting" ? "..." : "LIVE"}
            </span>
          </div>
        </div>
      </div>

      {/* Actions / User Section */}
      <div className="flex items-center gap-3 sm:gap-6">
        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 sm:gap-4"
            >
              {/* User Greeting/Input */}
              {!userName ? (
                <div className="hidden sm:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl focus-within:border-white/30 transition-all backdrop-blur-md">
                  <User className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") updateUserName((e.target as HTMLInputElement).value);
                    }}
                    onBlur={(e) => {
                      if (e.target.value) updateUserName(e.target.value);
                    }}
                    placeholder="Ton prénom..."
                    className="bg-transparent border-none outline-none text-sm text-slate-200 w-32 placeholder:text-slate-600 font-medium"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3 bg-white/5 border border-white/10 pl-3 pr-1.5 py-1 sm:pl-4 sm:pr-2 sm:py-1.5 rounded-2xl backdrop-blur-md">
                  <div className="flex flex-col items-end mr-1">
                    <span className="hidden sm:inline text-[10px] text-slate-500 font-bold uppercase tracking-wider">Utilisateur</span>
                    <span className="text-xs sm:text-sm font-bold text-white leading-none">
                      {userName}
                    </span>
                  </div>
                  <button
                    onClick={() => updateUserName("")}
                    className="p-2 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all"
                    title="Se déconnecter"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Database Button (Debug) */}
              {userName && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onShowDatabase}
                  className="hidden sm:flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 p-2.5 rounded-2xl transition-all shadow-xl backdrop-blur-md group"
                  title="Database Inspector"
                >
                  <Database className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                </motion.button>
              )}

              {/* Memory Button */}
              {userName && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onShowMemory}
                  className="hidden sm:flex items-center gap-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 px-4 py-2.5 rounded-2xl transition-all shadow-xl backdrop-blur-md group"
                >
                  <Brain className="w-5 h-5 text-purple-400 group-hover:rotate-12 transition-transform" />
                  <span className="text-sm font-semibold text-slate-200">Mémoire</span>
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};
