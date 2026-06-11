import React from "react";
import { LogEntry } from "../types";
import { ListFilter, Shield, Trash2, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

interface LogsPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({ logs, onClear }) => {
  const getLevelStyle = (level: string) => {
    switch (level) {
      case "success": return { bg: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> };
      case "warn": return { bg: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> };
      case "error": return { bg: "bg-rose-50 text-rose-800 border-rose-200", icon: <AlertCircle className="w-3.5 h-3.5 text-rose-650" /> };
      default: return { bg: "bg-slate-50 text-slate-700 border-slate-200", icon: <Info className="w-3.5 h-3.5 text-slate-600" /> };
    }
  };

  return (
    <div id="logs-panel" className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm font-sans animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-[#005f7a] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#005f7a]" />
          יומן בטיחות ואינטגרציות (מחזור בדיקות רציף)
        </h3>
        
        <button
          onClick={onClear}
          className="text-xs px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer font-bold"
        >
          <Trash2 className="w-3.5 h-3.5" />
          נקה יומן
        </button>
      </div>

      <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-3.5 max-h-[220px] overflow-y-auto font-mono text-xs space-y-2.5">
        {logs.length === 0 ? (
          <p className="text-slate-400 text-center py-6 font-sans font-semibold">אין רשומות ביומן בשלב זה.</p>
        ) : (
          logs.map((log, index) => {
            const levelStyle = getLevelStyle(log.level);
            return (
              <div
                key={index}
                className={`p-2.5 rounded border ${levelStyle.bg} flex items-start gap-2.5 leading-relaxed transition-all duration-200`}
              >
                <div className="mt-0.5">{levelStyle.icon}</div>
                <div className="flex-1">
                  <span className="text-[10px] text-slate-500 block mb-0.5 font-bold font-mono">
                    {new Date(log.timestamp).toLocaleTimeString("he-IL")} ({new Date(log.timestamp).toLocaleDateString("he-IL")})
                  </span>
                  <p className="text-[11.5px] font-sans text-slate-800 font-semibold">{log.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3.5 text-[11px] text-slate-500 flex items-center gap-1.5 justify-center leading-relaxed font-semibold">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        מנוע ה-Scheduler בודק את הגדרות המדיח וחיישני הזליגה בקריאת API כל 15 שניות.
      </div>
    </div>
  );
};
