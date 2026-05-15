import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart3, 
  LineChart, 
  Table as TableIcon, 
  X, 
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap
} from "lucide-react";

export type UIType = "bar-chart" | "line-chart" | "table" | "stat-card";

export interface UIData {
  type: UIType;
  title: string;
  description?: string;
  labels?: string[];
  values?: number[];
  columns?: string[];
  rows?: any[][];
  trend?: number; // percentage
}

interface DynamicUIProps {
  data: UIData | null;
  onClose: () => void;
  accentColor: string;
}

export const DynamicUI: React.FC<DynamicUIProps> = ({ data, onClose, accentColor }) => {
  if (!data) return null;
  const safeAccentColor = accentColor || "#8B5CF6";

  const renderContent = () => {
    switch (data.type) {
      case "bar-chart":
        return <BarChartVisualization data={data} accentColor={safeAccentColor} />;
      case "line-chart":
        return <LineChartVisualization data={data} accentColor={safeAccentColor} />;
      case "table":
        return <TableVisualization data={data} accentColor={safeAccentColor} />;
      case "stat-card":
        return <StatCardVisualization data={data} accentColor={safeAccentColor} />;
      default:
        return <div className="text-slate-400 p-8 text-center italic">Format visuel non supporté</div>;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, x: 100, filter: "blur(10px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, x: 100, filter: "blur(10px)" }}
        className="fixed bottom-24 right-6 z-[9999] w-[90vw] max-w-md bg-slate-950/90 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden ring-1 ring-white/10"
      >
        {/* Animated Background Glow */}
        <div 
          className="absolute -top-24 -right-24 w-48 h-48 blur-[80px] opacity-20 rounded-full animate-pulse"
          style={{ backgroundColor: safeAccentColor }}
        />

        {/* Header */}
        <div className="relative px-6 py-5 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner"
              style={{ 
                background: `linear-gradient(135deg, ${safeAccentColor}33, ${safeAccentColor}11)`,
                color: safeAccentColor,
                border: `1px solid ${safeAccentColor}44`
              }}
            >
              {data.type === "bar-chart" && <BarChart3 size={20} />}
              {data.type === "line-chart" && <LineChart size={20} />}
              {data.type === "table" && <TableIcon size={20} />}
              {data.type === "stat-card" && <Zap size={20} />}
            </div>
            <div>
              <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] leading-tight">{data.title}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: safeAccentColor }} />
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">IA Visualizer Active</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="relative p-7 min-h-[180px]">
          {renderContent()}
        </div>

        {/* Dynamic Footer Info */}
        {data.description && (
          <div className="px-7 pb-6 text-slate-400 text-xs leading-relaxed border-t border-white/5 pt-4 mx-2">
            <p className="opacity-80 italic italic-font">"{data.description}"</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// --- REDESIGNED VISUALIZATIONS ---

const BarChartVisualization: React.FC<{ data: UIData; accentColor: string }> = ({ data, accentColor }) => {
  const values = (data.values || []).map(v => Number(v));
  const labels = data.labels || [];
  const max = Math.max(...values, 1);

  return (
    <div className="w-full">
      <div className="flex items-end justify-around h-44 gap-3 px-1 border-b border-white/5 pb-2">
        {values.map((v, i) => {
          const heightPercent = Math.max((v / max) * 100, 8); // Min 8% for visibility
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative min-w-[35px]">
              {/* Value Label - Always Visible */}
              <div className="absolute -top-7 z-20">
                <span className="text-[10px] font-black text-white/90 tabular-nums">
                  {v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                </span>
              </div>

              {/* Bar Container */}
              <div className="w-full h-full flex items-end">
                <motion.div 
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ 
                    delay: i * 0.1, 
                    type: "spring", 
                    stiffness: 100, 
                    damping: 15 
                  }}
                  className="w-full rounded-t-xl relative shadow-lg origin-bottom"
                  style={{ 
                    height: `${heightPercent}%`,
                    background: `linear-gradient(to top, ${accentColor}, ${accentColor}aa)`,
                    boxShadow: `0 4px 15px ${accentColor}33`,
                    border: `1px solid ${accentColor}44`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                </motion.div>
              </div>

              <span className="text-[9px] text-slate-500 mt-4 font-bold uppercase tracking-tighter truncate w-full text-center">
                {labels[i] || ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LineChartVisualization: React.FC<{ data: UIData; accentColor: string }> = ({ data, accentColor }) => {
  const values = (data.values || []).map(v => Number(v));
  const labels = data.labels || [];
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * 100;
    const y = 100 - (v / max) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-full">
      <div className="relative h-44 w-full px-2">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Subtle Grid Lines */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeOpacity="0.05" strokeDasharray="2,2" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="white" strokeOpacity="0.1" />

          {/* Area under the line */}
          <motion.path
            d={`M 0,100 L ${points} L 100,100 Z`}
            fill={`url(#gradient-${accentColor.replace('#','')})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            transition={{ duration: 1.5 }}
          />
          <defs>
            <linearGradient id={`gradient-${accentColor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Main Line */}
          <motion.polyline
            fill="none"
            stroke={accentColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>

        {/* Data Points */}
        {values.map((v, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="absolute w-2.5 h-2.5 rounded-full border-2 border-slate-900 shadow-xl"
            style={{ 
              left: `${(i / Math.max(values.length - 1, 1)) * 100}%`, 
              top: `${100 - (v / max) * 100}%`,
              backgroundColor: accentColor,
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 10px ${accentColor}aa`
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-6 px-1">
        {labels.map((l, i) => (
          <span key={i} className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{l}</span>
        ))}
      </div>
    </div>
  );
};

const TableVisualization: React.FC<{ data: UIData; accentColor: string }> = ({ data, accentColor }) => {
  const columns = data.columns || [];
  const rows = data.rows || [];

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/5 bg-white/[0.01]">
      <div className="max-h-60 overflow-y-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-white/[0.03] sticky top-0 z-10">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="py-3 px-4 text-slate-400 font-black uppercase tracking-widest border-b border-white/5">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-300 divide-y divide-white/5">
            {rows.map((row, ri) => (
              <motion.tr 
                key={ri}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: ri * 0.05 }}
                className="hover:bg-white/[0.02] transition-colors"
              >
                {row.map((cell, ci) => (
                  <td key={ci} className="py-3 px-4 font-medium">{cell}</td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatCardVisualization: React.FC<{ data: UIData; accentColor: string }> = ({ data, accentColor }) => {
  const value = Number(data.values?.[0] || 0);
  const trend = Number(data.trend || 0);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-1">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black tracking-tighter text-white"
          style={{ 
            textShadow: `0 0 30px ${accentColor}44`
          }}
        >
          {value.toLocaleString()}
        </motion.div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${trend >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
            {trend >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
            {Math.abs(trend)}%
          </div>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">Growth Signal</span>
        </div>
      </div>
      
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, 0, -5, 0]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 rounded-[2rem] flex items-center justify-center relative group"
      >
        <div 
          className="absolute inset-0 blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"
          style={{ backgroundColor: accentColor }}
        />
        <div 
          className="w-full h-full rounded-[1.5rem] flex items-center justify-center border border-white/10 shadow-2xl relative z-10"
          style={{ 
            background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}05)`,
            color: accentColor
          }}
        >
          <Sparkles size={40} />
        </div>
      </motion.div>
    </div>
  );
};
