import { motion } from "motion/react";
import { Clock, Sparkles } from "lucide-react";
import { getRemainingMinutes } from "../lib/usageLimits";
import { useEffect, useState } from "react";

interface TimeRemainingWidgetProps {
  accentColor: string;
}

export function TimeRemainingWidget({ accentColor }: TimeRemainingWidgetProps) {
  const [remainingMinutes, setRemainingMinutes] = useState(Math.floor(getRemainingMinutes()));

  useEffect(() => {
    // Update remaining time every 30 seconds
    const interval = setInterval(() => {
      setRemainingMinutes(Math.floor(getRemainingMinutes()));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const percentage = (remainingMinutes / 30) * 100;
  const isLow = remainingMinutes < 10;
  const isCritical = remainingMinutes < 5;

  const getStatusColor = () => {
    if (isCritical) return "text-red-400";
    if (isLow) return "text-amber-400";
    return "text-green-400";
  };

  const getStatusEmoji = () => {
    if (isCritical) return "⚠️";
    if (isLow) return "⏰";
    return "✨";
  };

  const getStatusMessage = () => {
    if (isCritical) return "Bientôt l'heure de la pause !";
    if (isLow) return "Plus beaucoup de temps...";
    return "Profite bien !";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 shadow-xl"
    >
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <Clock className="w-5 h-5" style={{ color: accentColor }} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-300">Temps Magique</h3>
          <p className="text-xs text-slate-500">Aujourd'hui</p>
        </div>
        <span className="text-2xl">{getStatusEmoji()}</span>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-3 bg-slate-700/50 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: isCritical
              ? "linear-gradient(90deg, #ef4444, #dc2626)"
              : isLow
              ? "linear-gradient(90deg, #f59e0b, #d97706)"
              : `linear-gradient(90deg, ${accentColor}, ${accentColor}dd)`,
          }}
        />
      </div>

      {/* Time Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${getStatusColor()}`}>
            {remainingMinutes}
          </span>
          <span className="text-sm text-slate-400">minutes</span>
        </div>
        <div className="text-xs text-slate-500 text-right">
          {getStatusMessage()}
        </div>
      </div>

      {/* Fun Animation when time is running out */}
      {isLow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-900/20 px-3 py-2 rounded-lg"
        >
          <Sparkles className="w-4 h-4" />
          <span>Pense à faire une pause bientôt !</span>
        </motion.div>
      )}
    </motion.div>
  );
}
