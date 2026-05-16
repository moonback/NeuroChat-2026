import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, X, RefreshCw, FileText, Share2, Brain, Activity, Trash2, Search, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { getStorageBackend } from '../lib/storage';

// --- Data Viewer Component ---
const DataViewer = ({ data }: { data: any }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!data) return <div className="text-slate-500 italic">Aucune donnée.</div>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <div className="text-slate-500 italic">Tableau vide.</div>;

    // Extract columns
    const columns = Array.from(new Set(data.flatMap(item => Object.keys(item))));

    // Filter data
    const filteredData = data.filter(item =>
      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="flex flex-col h-full gap-4">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Rechercher dans les données..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-slate-950/50 relative">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                {columns.map(col => (
                  <th key={col} className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((row: any, idx: number) => {
                const rowId = row.id || `row-${idx}`;
                const isExpanded = expandedRows[rowId];
                return (
                  <React.Fragment key={rowId}>
                    <tr
                      onClick={() => toggleRow(rowId)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 text-slate-500">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                      {columns.map(col => {
                        const val = row[col];
                        let displayVal = String(val);
                        let isComplex = false;

                        if (val === null) displayVal = 'null';
                        else if (val === undefined) displayVal = 'undefined';
                        else if (Array.isArray(val)) {
                          displayVal = `[Array(${val.length})]`;
                          isComplex = true;
                        }
                        else if (typeof val === 'object') {
                          displayVal = '{Object}';
                          isComplex = true;
                        }
                        else if (typeof val === 'string' && val.length > 50) {
                          displayVal = val.slice(0, 50) + '...';
                        }

                        return (
                          <td key={col} className="py-3 px-4 text-sm">
                            {isComplex ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {displayVal}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">{displayVal}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={columns.length + 1} className="p-0 border-t-0">
                          <div className="bg-slate-900/50 p-4 border-l-2 border-blue-500 relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(JSON.stringify(row, null, 2), rowId);
                              }}
                              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            >
                              {copiedKey === rowId ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <pre className="text-xs font-mono text-blue-300 leading-relaxed overflow-x-auto">
                              {JSON.stringify(row, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-slate-500 italic">Aucun résultat pour "{searchTerm}"</div>
          )}
        </div>
      </div>
    );
  }

  // Object view
  return (
    <div className="relative">
      <button
        onClick={() => handleCopy(JSON.stringify(data, null, 2), 'root')}
        className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors z-10"
      >
        {copiedKey === 'root' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre className="text-xs font-mono text-blue-300 bg-slate-950 p-6 rounded-2xl border border-white/5 leading-relaxed overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

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
        className="relative w-full max-w-12xl h-[80vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
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
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {Array.isArray(data) ? `${data.length} entrées trouvées` : 'Objet de données'}
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <DataViewer data={data} />
              </div>
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
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${active
        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
  >
    {icon}
    {label}
  </button>
);
