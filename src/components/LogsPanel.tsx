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
        row: "bg-emerald-950/30 border-emerald-900/50 text-emerald-300",
        icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />,
      };
      case "warn": return {
        row: "bg-amber-950/30 border-amber-900/50 text-amber-300",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />,
      };
      case "error": return {
        row: "bg-rose-950/30 border-rose-900/50 text-rose-300",
        icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />,
      };
      default: return {
        row: "bg-[#13131e] border-[#252538] text-[#6e6e8a]",
        icon: <Info className="w-3.5 h-3.5 text-[#4e4e6a] shrink-0 mt-0.5" />,
      };
    }
  };

  return (
    <div className="bg-[#18182a] border border-[#252538] rounded-2xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#e8e4f0] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#c9a84c]" />
          יומן בטיחות
        </h3>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#13131e] hover:bg-[#1e1e30] text-[#6e6e8a] hover:text-rose-400 border border-[#252538] transition-colors cursor-pointer font-medium min-h-[34px]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          נקה
        </button>
      </div>

      <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-10 text-[#3a3a55]">
            <Shield className="w-7 h-7 mx-auto mb-2.5 text-[#252538]" />
            <p className="text-sm font-medium text-[#4e4e6a]">אין רשומות ביומן</p>
          </div>
        ) : (
          logs.map((log, i) => {
            const { row, icon } = getLevelStyle(log.level);
            return (
              <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${row}`}>
                {icon}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-[#3a3a55] font-mono block mb-0.5">
                    {new Date(log.timestamp).toLocaleTimeString("he-IL")} · {new Date(log.timestamp).toLocaleDateString("he-IL")}
                  </span>
                  <p className="text-xs leading-snug font-medium">{log.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#3a3a55] justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-pulse-green" />
        מנוע Scheduler בודק כל 15 שניות
      </div>
    </div>
  );
};
