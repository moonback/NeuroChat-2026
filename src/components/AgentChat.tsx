import React from "react";
import { motion, AnimatePresence } from "motion/react";
import type { AgentEvent } from "../lib/agent/types";
import { Activity, User, Globe, Folder, Bot, ChevronRight } from "lucide-react";

interface AgentChatProps {
  events: AgentEvent[];
}

export function AgentChat({ events }: AgentChatProps) {
  if (events.length === 0) return null;

  const getAgentIcon = (agentId?: string) => {
    switch (agentId) {
      case "supervisor": return <Activity className="w-4 h-4 text-purple-400" />;
      case "research_agent": return <Globe className="w-4 h-4 text-blue-400" />;
      case "file_agent": return <Folder className="w-4 h-4 text-emerald-400" />;
      default: return <Bot className="w-4 h-4 text-slate-400" />;
    }
  };

  const getAgentColor = (agentId?: string) => {
    switch (agentId) {
      case "supervisor": return "text-purple-400";
      case "research_agent": return "text-blue-400";
      case "file_agent": return "text-emerald-400";
      default: return "text-slate-400";
    }
  };

  return (
    <div className="absolute top-24 left-4 w-80 max-h-[60vh] bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-y-auto flex flex-col p-4 gap-3 z-40">
      <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
        <Activity className="w-4 h-4 text-blue-400" />
        NeuroChat Multi-Agents
      </h3>
      
      <AnimatePresence>
        {events.map((ev, i) => {
          let content = null;
          
          if (ev.type === "agent_start") {
            content = (
              <div className="text-xs text-slate-400 italic">
                Début de la tâche: "{ev.input}"
              </div>
            );
          } else if (ev.type === "model_response") {
            try {
              const parsed = JSON.parse(ev.raw);
              if (parsed.thought) {
                content = <div className="text-sm text-slate-300">"{parsed.thought}"</div>;
              }
            } catch (e) {
              content = <div className="text-sm text-slate-300">"{ev.raw.slice(0, 50)}..."</div>;
            }
          } else if (ev.type === "tool_result") {
            content = (
              <div className="text-xs bg-slate-800/50 p-2 rounded border border-white/5 font-mono text-slate-400 break-all">
                {ev.result.skill} {ev.result.ok ? "✅" : "❌"}
              </div>
            );
          } else if (ev.type === "delegation_start") {
            content = (
              <div className="text-xs text-yellow-400 flex items-center gap-1 font-medium bg-yellow-400/10 p-2 rounded">
                Délégation à {ev.targetAgentName} <ChevronRight className="w-3 h-3" />
              </div>
            );
          } else if (ev.type === "completed") {
            content = (
              <div className="text-sm text-green-400 font-medium">
                {ev.completed ? "Tâche terminée" : "Échec de la tâche"}
              </div>
            );
          }

          if (!content) return null;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5">
                {getAgentIcon(ev.agentId)}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${getAgentColor(ev.agentId)}`}>
                  {ev.agentName || "Système"}
                </span>
              </div>
              <div className="pl-5">
                {content}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
