import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, X, RefreshCw, FileText, Share2, Brain, Activity, Trash2 } from 'lucide-react';
import { getStorageBackend } from '../lib/storage';

interface DatabaseInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

type Tab = 'sessions' | 'vectors' | 'learning' | 'traces' | 'summaries';

export const DatabaseInspector: React.FC<DatabaseInspectorProps> = ({ isOpen, onClose, userId }) => {
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const db = getStorageBackend();
    try {
      let result: any = null;
      switch (activeTab) {
        case 'sessions':
          result = await db.loadSessions();
          break;
        case 'vectors':
          result = await db.loadVectors();
          break;
        case 'learning':
          if (userId) {
            const raw = await db.loadLearning(userId);
            result = raw ? JSON.parse(raw) : { message: "No learning data found for this user." };
          } else {
            result = { message: "Please select a user to view learning data." };
          }
          break;
        case 'traces':
          result = await db.loadTraces();
          break;
        case 'summaries':
          result = await db.loadSummaries();
          break;
      }
      setData(result);
    } catch (err) {
      setData({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    const db = getStorageBackend();
    setLoading(true);
    try {
      await db.clearSessions();
      await db.clearVectors();
      await db.clearSummaries();
      await db.clearTraces();
      if (userId) await db.clearLearning(userId);
      
      setData([]);
      setShowConfirmClear(false);
      
      // Refresh the entire app to ensure a clean state
      window.location.reload();
    } catch (err) {
      console.error("Failed to clear database", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-6xl h-[80vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Database Inspector</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">Provisional Debug Tool</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {showConfirmClear ? (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl animate-in fade-in zoom-in duration-200">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-tight">Supprimer TOUT ?</span>
                <button
                  onClick={handleClearDatabase}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-lg transition-colors"
                >
                  OUI
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-colors"
                >
                  NON
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all flex items-center gap-2"
                title="Vider la base de données"
              >
                <Trash2 className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Vider</span>
              </button>
            )}

            <div className="w-[1px] h-6 bg-white/10 mx-1" />

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-950/50 overflow-x-auto no-scrollbar">
          <TabButton 
            active={activeTab === 'sessions'} 
            onClick={() => setActiveTab('sessions')}
            icon={<FileText className="w-4 h-4" />}
            label="Sessions" 
          />
          <TabButton 
            active={activeTab === 'vectors'} 
            onClick={() => setActiveTab('vectors')} 
            icon={<Share2 className="w-4 h-4" />}
            label="Vecteurs (RAG)" 
          />
          <TabButton 
            active={activeTab === 'learning'} 
            onClick={() => setActiveTab('learning')} 
            icon={<Brain className="w-4 h-4" />}
            label="Apprentissage" 
          />
          <TabButton 
            active={activeTab === 'traces'} 
            onClick={() => setActiveTab('traces')} 
            icon={<Activity className="w-4 h-4" />}
            label="Traces Agent" 
          />
          <TabButton 
            active={activeTab === 'summaries'} 
            onClick={() => setActiveTab('summaries')} 
            icon={<FileText className="w-4 h-4" />}
            label="Résumés" 
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950/30">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-sm font-medium animate-pulse">Chargement des données...</span>
            </div>
          ) : data ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {Array.isArray(data) ? `${data.length} entrées trouvées` : 'Objet de données'}
                </span>
              </div>
              <pre className="text-xs font-mono text-blue-300 bg-slate-950 p-6 rounded-2xl border border-white/5 leading-relaxed overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 italic">
              Aucune donnée à afficher.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
      active 
        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
    }`}
  >
    {icon}
    {label}
  </button>
);
