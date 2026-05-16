import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, 
  Camera, CameraOff, 
  Monitor, 
  Database, 
  Cloud, 
  Cpu,
  ShieldCheck,
  Activity,
  Lock,
  Heart,
  Zap,
  VolumeX,
  GraduationCap
} from 'lucide-react';
import { runtimeEvents } from '../runtime/events';
import { metricsStore } from '../runtime/metrics';
import { useRuntime, ProactivityLevel } from '../runtime/RuntimeProvider';

interface PrivacyStatus {
  mic: boolean;
  camera: boolean;
  screen: boolean;
  memory: boolean;
  provider: string;
}

export const PrivacyHUD: React.FC = () => {
  const { isPrivate, setIsPrivate, proactivityLevel, setProactivityLevel } = useRuntime();
  const [status, setStatus] = useState<PrivacyStatus>({
    mic: false,
    camera: false,
    screen: false,
    memory: false,
    provider: 'idle'
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubMic = runtimeEvents.on('media:mic:active', ({ active }) => 
      setStatus(prev => ({ ...prev, mic: active })));
    const unsubCam = runtimeEvents.on('media:camera:active', ({ active }) => 
      setStatus(prev => ({ ...prev, camera: active })));
    const unsubScreen = runtimeEvents.on('media:screen:active', ({ active }) => 
      setStatus(prev => ({ ...prev, screen: active })));
    const unsubSession = runtimeEvents.on('session:status', ({ status }) => {
      setStatus(prev => ({ ...prev, provider: status }));
      setIsVisible(status !== 'idle');
    });
    const unsubMemory = runtimeEvents.on('memory:write', () => {
      setStatus(prev => ({ ...prev, memory: true }));
      setTimeout(() => setStatus(prev => ({ ...prev, memory: false })), 1500);
    });

    return () => {
      unsubMic();
      unsubCam();
      unsubScreen();
      unsubSession();
      unsubMemory();
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className={`flex items-center gap-4 px-6 py-2 border rounded-full shadow-2xl backdrop-blur-xl transition-colors duration-500 pointer-events-auto ${isPrivate ? 'bg-red-500/10 border-red-500/30' : 'glass-dark border-white/10'}`}>
            {/* Private Mode Toggle */}
            <button 
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex items-center gap-2 pr-4 border-r transition-colors ${isPrivate ? 'border-red-500/30 text-red-400' : 'border-white/10 text-white/40 hover:text-white/80'}`}
              title={isPrivate ? "Quitter le mode privé" : "Activer le mode privé"}
            >
              <Lock className={`w-3.5 h-3.5 ${isPrivate ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{isPrivate ? 'Private' : 'Normal'}</span>
            </button>

            {/* Security Indicator */}
            <div className="flex items-center gap-2 pr-4 border-r border-white/10">
              <ShieldCheck className={`w-4 h-4 ${isPrivate ? 'text-red-400' : 'text-emerald-400'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isPrivate ? 'text-red-400/80' : 'text-emerald-400/80'}`}>
                {isPrivate ? 'Memory Off' : 'Sandbox Active'}
              </span>
            </div>

            {/* Inputs Status */}
            <div className="flex items-center gap-3 px-2">
              <StatusIcon 
                icon={status.mic ? Mic : MicOff} 
                active={status.mic} 
                label="Audio" 
                color="text-blue-400" 
              />
              <StatusIcon 
                icon={status.camera ? Camera : CameraOff} 
                active={status.camera} 
                label="Vision" 
                color="text-purple-400" 
              />
              <StatusIcon 
                icon={Monitor} 
                active={status.screen} 
                label="Screen" 
                color="text-emerald-400" 
              />
            </div>

            {/* Backend / Intelligence Status */}
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="flex items-center gap-1.5">
                {status.provider === 'gemini' ? (
                  <Cloud className="w-4 h-4 text-blue-400" />
                ) : (
                  <Cpu className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-[10px] font-medium text-white/60">
                  {status.provider === 'gemini' ? 'Cloud Gemini' : 'Local / OpenRouter'}
                </span>
              </div>

              <motion.div 
                animate={status.memory ? { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] } : {}}
                className="flex items-center gap-1.5"
              >
                <Database className={`w-3.5 h-3.5 ${status.memory ? 'text-blue-400' : 'text-white/30'}`} />
                <span className={`text-[10px] font-medium ${status.memory ? 'text-blue-400' : 'text-white/30'}`}>
                  Mem
                </span>
              </motion.div>
            </div>

            {/* Proactivity Slider */}
            <div className="flex items-center gap-1.5 pl-4 border-l border-white/10">
              <ProactivityButton 
                level="quiet" 
                current={proactivityLevel} 
                icon={VolumeX} 
                onClick={() => setProactivityLevel('quiet')}
                label="Silencieux"
              />
              <ProactivityButton 
                level="coach" 
                current={proactivityLevel} 
                icon={GraduationCap} 
                onClick={() => setProactivityLevel('coach')}
                label="Coach"
              />
              <ProactivityButton 
                level="companion" 
                current={proactivityLevel} 
                icon={Heart} 
                onClick={() => setProactivityLevel('companion')}
                label="Compagnon"
              />
              <ProactivityButton 
                level="jarvis" 
                current={proactivityLevel} 
                icon={Zap} 
                onClick={() => setProactivityLevel('jarvis')}
                label="Jarvis"
              />
            </div>

            {/* Activity Pulse */}
            <div className="pl-2">
              <Activity className="w-3.5 h-3.5 text-blue-500/50 animate-pulse" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ProactivityButton: React.FC<{
  level: ProactivityLevel;
  current: ProactivityLevel;
  icon: any;
  onClick: () => void;
  label: string;
}> = ({ level, current, icon: Icon, onClick, label }) => {
  const active = level === current;
  return (
    <button 
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-all group relative ${active ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      {active && (
        <motion.div 
          layoutId="proactivity-active"
          className="absolute inset-0 border border-white/20 rounded-lg shadow-[0_0_10px_rgba(255,255,255,0.1)]"
        />
      )}
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-white/10 rounded text-[8px] font-bold uppercase tracking-widest text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[110]">
        {label}
      </span>
    </button>
  );
};

const StatusIcon: React.FC<{ 
  icon: any; 
  active: boolean; 
  label: string; 
  color: string; 
}> = ({ icon: Icon, active, label, color }) => (
  <div className="flex flex-col items-center gap-0.5 group">
    <div className={`relative p-1.5 rounded-lg transition-all ${active ? `bg-white/5 ${color}` : 'text-white/20'}`}>
      <Icon className="w-4 h-4" />
      {active && (
        <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]`} />
      )}
    </div>
    <span className="text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity text-white/40 uppercase tracking-tighter">
      {label}
    </span>
  </div>
);
