import React, { useState } from "react";
import { Appliance } from "../types";
import { DoorClosed, DoorOpen, Wifi, WifiOff, ShieldCheck, Power, RotateCcw, AlertTriangle, StopCircle, Loader } from "lucide-react";

interface StatusWidgetProps {
  appliance: Appliance | null;
  useSimulator: boolean;
  onSimulatorAction: (action: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onStop?: () => Promise<void>;
}

export const StatusWidget: React.FC<StatusWidgetProps> = ({
  appliance,
  useSimulator,
  onSimulatorAction,
  loading,
  onRefresh,
  onStop,
}) => {
  const [stopping, setStopping] = useState(false);

  if (loading) {
    return (
      <div className="bg-[#1a2d42] border border-slate-700/70 rounded-2xl p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-3.5 bg-slate-700 rounded-full w-1/3" />
          <div className="h-5 bg-slate-700 rounded-full w-1/2" />
          <div className="grid grid-cols-2 gap-2 pt-2">
            {[0,1,2,3].map(i => <div key={i} className="h-16 bg-slate-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!appliance) {
    return (
      <div className="bg-[#1a2d42] border border-slate-700/70 rounded-2xl p-6 text-center">
        <Wifi className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-amber-400 mb-1">לא נמצא מדיח מחובר</p>
        <p className="text-xs text-slate-500">ודא שהתחברת ב-Home Connect ומכשיר דלוק</p>
      </div>
    );
  }

  const getStateName = (s: string) => {
    const map: Record<string, string> = {
      Ready: "מוכן", Run: "פועל", Finished: "סיים", Aborting: "עוצר..."
    };
    return map[s] || s;
  };

  const getProgramLabel = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes("intensiv70") || k.includes("heavy")) return "Intensive — הדחה חזקה";
    if (k.includes("auto")) return "Auto — אוטומטי";
    if (k.includes("eco")) return "Eco — חסכונית";
    if (k.includes("prerinse")) return "Pre-Rinse — שטיפה מקדימה";
    if (k.includes("quick65") || k.includes("speed65")) return "Speed 65°";
    if (k.includes("machinecare")) return "Machine Care";
    if (k.includes("quick45")) return "Quick 45°";
    if (k.includes("glass40") || k.includes("glas40")) return "Glass 40°";
    if (k.includes("silence") || k.includes("nightwash")) return "Night Wash";
    return key.replace("Dishcare.Dishwasher.Program.", "");
  };

  const handleStop = async () => {
    if (!onStop) return;
    setStopping(true);
    try { await onStop(); } finally { setStopping(false); }
  };

  const isRunning = appliance.operationState === "Run";

  const statusItems = [
    {
      label: "WiFi",
      ok: appliance.connected,
      okText: "מחובר",
      failText: "מנותק",
      OkIcon: Wifi,
      FailIcon: WifiOff,
    },
    {
      label: "דלת",
      ok: appliance.doorState === "Closed",
      okText: "סגורה",
      failText: "פתוחה",
      OkIcon: DoorClosed,
      FailIcon: DoorOpen,
      unknown: appliance.doorState !== "Closed" && appliance.doorState !== "Open",
    },
    {
      label: "Remote Start",
      ok: appliance.remoteStartAllowed,
      okText: "מאופשר",
      failText: "מושבת",
      OkIcon: ShieldCheck,
      FailIcon: Power,
    },
    {
      label: "מצב",
      ok: !isRunning,
      okText: getStateName(appliance.operationState),
      failText: getStateName(appliance.operationState),
      isRunning,
    },
  ];

  return (
    <div className="bg-[#1a2d42] border border-slate-700/70 rounded-2xl overflow-hidden">
      {/* Top accent line */}
      <div className="h-[2px] bg-gradient-to-l from-sky-600 to-sky-400" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-sky-400/80 uppercase tracking-widest">
                {appliance.brand}
              </span>
              {useSimulator && (
                <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 border border-purple-700/60 rounded-full text-[10px] font-bold">
                  SIM
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-100">{appliance.name}</h3>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="רענן"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {statusItems.map((item, i) => {
            if (item.isRunning !== undefined) {
              return (
                <div key={i} className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1.5">{item.label}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.isRunning ? "bg-sky-400 dot-pulse" : "bg-emerald-400"}`} />
                    <span className={`text-sm font-bold ${item.isRunning ? "text-sky-300" : "text-emerald-300"}`}>
                      {item.isRunning ? "פועל" : item.okText}
                    </span>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1.5">{item.label}</p>
                <div className="flex items-center gap-1.5">
                  {(item as any).unknown ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-bold text-amber-300">לא ידוע</span>
                    </>
                  ) : item.ok ? (
                    <>
                      <item.OkIcon className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-300">{item.okText}</span>
                    </>
                  ) : (
                    <>
                      <item.FailIcon className="w-4 h-4 text-rose-400" />
                      <span className="text-sm font-bold text-rose-300">{item.failText}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active program + stop button */}
        {isRunning && appliance.activeProgram && (
          <div className="bg-sky-950/60 border border-sky-800/60 rounded-xl p-3 mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wide mb-0.5">פועל כעת</p>
              <p className="text-sm font-bold text-sky-200">{getProgramLabel(appliance.activeProgram)}</p>
            </div>
            {onStop && (
              <button
                onClick={handleStop}
                disabled={stopping}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 hover:bg-rose-600 disabled:bg-rose-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 min-h-[40px]"
              >
                {stopping
                  ? <><Loader className="w-3.5 h-3.5 animate-spin" /> עוצר...</>
                  : <><StopCircle className="w-3.5 h-3.5" /> עצור</>}
              </button>
            )}
          </div>
        )}

        {/* Simulator controls */}
        {useSimulator && (
          <div className="pt-3 border-t border-slate-700/60">
            <p className="text-[10px] font-bold text-purple-400 mb-2 uppercase tracking-wide">בקרת סימולציה</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onSimulatorAction("toggleDoor")}
                className={`text-xs px-3 py-2 rounded-xl border font-semibold transition-colors cursor-pointer min-h-[36px] ${
                  appliance.doorState === "Closed"
                    ? "bg-rose-950/60 border-rose-800/60 text-rose-300 hover:bg-rose-900/60"
                    : "bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60"
                }`}
              >
                {appliance.doorState === "Closed" ? "פתח דלת" : "סגור דלת"}
              </button>
              <button
                onClick={() => onSimulatorAction("toggleRemote")}
                className={`text-xs px-3 py-2 rounded-xl border font-semibold transition-colors cursor-pointer min-h-[36px] ${
                  appliance.remoteStartAllowed
                    ? "bg-rose-950/60 border-rose-800/60 text-rose-300 hover:bg-rose-900/60"
                    : "bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60"
                }`}
              >
                {appliance.remoteStartAllowed ? "בטל Remote" : "אפשר Remote"}
              </button>
              <button
                onClick={() => onSimulatorAction("toggleConnected")}
                className={`text-xs px-3 py-2 rounded-xl border font-semibold transition-colors cursor-pointer min-h-[36px] ${
                  appliance.connected
                    ? "bg-rose-950/60 border-rose-800/60 text-rose-300 hover:bg-rose-900/60"
                    : "bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60"
                }`}
              >
                {appliance.connected ? "נתק WiFi" : "חבר WiFi"}
              </button>
              {isRunning && (
                <button
                  onClick={() => onSimulatorAction("resetState")}
                  className="text-xs px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-xl transition-colors cursor-pointer font-semibold min-h-[36px]"
                >
                  אפס מחזור
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
