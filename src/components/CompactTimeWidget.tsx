import { motion } from "motion/react";
import { Clock } from "lucide-react";
import { getRemainingMinutes } from "../lib/usageLimits";
import { useEffect, useState } from "react";

interface CompactTimeWidgetProps {
  accentColor: string;
}

export function CompactTimeWidget({ accentColor }: CompactTimeWidgetProps) {
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
    if (isCritical) return "#ef4444";
    if (isLow) return "#f59e0b";
    return accentColor;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className="flex items-center gap-2 bg-slate-800/50 px-3 py-2 rounded-full border border-slate-700/50 cursor-pointer"
      title={`${remainingMinutes} minutes restantes aujourd'hui`}
    >
      {/* Circular Progress */}
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="16"
            cy="16"
            r="14"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-slate-700"
          />
          {/* Progress circle */}
          <motion.circle
            cx="16"
            cy="16"
            r="14"
            stroke={getStatusColor()}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDasharray: "0 88" }}
            animate={{ strokeDasharray: `${(percentage / 100) * 88} 88` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Clock className="w-4 h-4 text-slate-300" />
        </div>
      </div>

      {/* Time Text */}
      <div className="flex flex-col">
        <span className="text-xs font-bold text-slate-300">{remainingMinutes} min</span>
        <span className="text-[10px] text-slate-500">restantes</span>
      </div>

      {/* Pulse animation when critical */}
      {isCritical && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-red-400"
        />
      )}
    </motion.div>
  );
}
