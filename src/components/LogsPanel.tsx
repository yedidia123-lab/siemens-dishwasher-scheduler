import React from "react";
import { LogEntry } from "../types";
import { Shield, Trash2, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

interface LogsPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({ logs, onClear }) => {
  const getLevelStyle = (level: string) => {
    switch (level) {
      case "success": return {
        row: "bg-emerald-950/40 border-emerald-800/50 text-emerald-300",
        icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />,
      };
      case "warn": return {
        row: "bg-amber-950/40 border-amber-800/50 text-amber-300",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />,
      };
      case "error": return {
        row: "bg-rose-950/40 border-rose-800/50 text-rose-300",
        icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />,
      };
      default: return {
        row: "bg-slate-800/40 border-slate-700/50 text-slate-400",
        icon: <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />,
      };
    }
  };

  return (
    <div className="bg-[#1a2d42] border border-slate-700/70 rounded-2xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-500" />
          יומן בטיחות
        </h3>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-600/60 transition-colors cursor-pointer font-semibold min-h-[36px]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          נקה
        </button>
      </div>

      <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">
            <Shield className="w-6 h-6 mx-auto mb-2 text-slate-700" />
            אין רשומות ביומן
          </div>
        ) : (
          logs.map((log, i) => {
            const { row, icon } = getLevelStyle(log.level);
            return (
              <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${row}`}>
                {icon}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-slate-600 font-mono block mb-0.5">
                    {new Date(log.timestamp).toLocaleTimeString("he-IL")} · {new Date(log.timestamp).toLocaleDateString("he-IL")}
                  </span>
                  <p className="text-xs leading-snug font-medium">{log.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-600 justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-pulse" />
        מנוע Scheduler בודק כל 15 שניות
      </div>
    </div>
  );
};
