import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { AVATARS, AVATAR_IDS, type AvatarId } from "../lib/avatarConfig";
import { RobotAvatar } from "./avatars/RobotAvatar";

interface Props {
  isOpen: boolean;
  currentAvatar: AvatarId;
  onSelect: (id: AvatarId) => void;
  onClose: () => void;
}

/** Mini avatar preview — renders the idle avatar in a small container */
function AvatarPreview({ avatarId }: { avatarId: AvatarId }) {
  const props = { status: "idle" as const, isSpeaking: false };
  return <RobotAvatar {...props} />;
}

/**
 * AvatarSelector — A full-screen modal that lets children pick
 * their companion avatar with animated previews and vibrant cards.
 */
export function AvatarSelector({ isOpen, currentAvatar, onSelect, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-3xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Decorative top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-gradient-to-b from-purple-500/20 to-transparent blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative px-8 pt-8 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Choisis ton compagnon ✨
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Qui veux-tu comme ami magique ?
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar Cards Grid */}
            <div className="relative px-8 pb-8 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
              {AVATAR_IDS.map((id, index) => {
                const avatar = AVATARS[id];
                const isSelected = id === currentAvatar;

                return (
                  <motion.button
                    key={id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, type: "spring", damping: 20 }}
                    onClick={() => onSelect(id)}
                    className={`
                      relative group rounded-2xl p-5 text-center transition-all duration-300 cursor-pointer
                      border-2 focus:outline-none
                      ${isSelected
                        ? "border-white/40 bg-white/10 shadow-lg shadow-white/5"
                        : "border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }
                    `}
                  >
                    {/* Selected badge */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0 }}
                          className={`absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br ${avatar.accentClass} flex items-center justify-center shadow-lg z-10`}
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Avatar Preview */}
                    <div className="w-28 h-28 mx-auto mb-4 relative">
                      {/* Glow behind avatar */}
                      <div
                        className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-300 ${isSelected ? "opacity-60" : "opacity-0 group-hover:opacity-30"}`}
                        style={{ backgroundColor: avatar.colors[0] }}
                      />
                      <div className="relative w-full h-full">
                        <AvatarPreview avatarId={id} />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-white flex items-center justify-center gap-2">
                        <span>{avatar.emoji}</span>
                        <span>{avatar.name}</span>
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {avatar.description}
                      </p>
                    </div>

                    {/* Hover ring effect */}
                    <div
                      className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      style={{
                        boxShadow: `inset 0 0 30px ${avatar.colors[0]}15`,
                      }}
                    />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
