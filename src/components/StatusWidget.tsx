import React, { useState } from "react";
import { Appliance } from "../types";
import { DoorClosed, DoorOpen, Wifi, WifiOff, ShieldCheck, Play, Power, RotateCcw, AlertTriangle, StopCircle } from "lucide-react";

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
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-100 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!appliance) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center">
        <p className="text-amber-600 font-semibold mb-2">לא נמצא מדיח כלים מחובר</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          ודא שהתחברת לחשבון Home Connect בטאב ההגדרות והמכשיר מחובר ל-WiFi.
        </p>
      </div>
    );
  }

  const getOperationStateName = (state: string) => {
    switch (state) {
      case "Ready": return "מוכן להפעלה";
      case "Run": return "פועל כעת";
      case "Finished": return "סיים מחזור";
      case "Aborting": return "מבטל תוכנית...";
      default: return state || "לא ידוע";
    }
  };

  const getProgramName = (progKey: string) => {
    const k = progKey.toLowerCase();
    if (k.includes("intensiv70") || k.includes("intensive70") || k.includes("heavy")) return "הדחה חזקה";
    if (k.includes("auto4565") || k.includes("auto")) return "אוטומטי";
    if (k.includes("eco50") || k.includes("eco")) return "חסכונית";
    if (k.includes("prerinse") || k.includes("pre-rinse") || k.includes("pre_rinse")) return "שטיפה מקדימה";
    if (k.includes("quick65") || k.includes("speed65") || k.includes("quickspeed65")) return "מהירה 65°";
    if (k.includes("machinecare") || k.includes("machine-care") || k.includes("machine_care")) return "ניקוי מכונה";
    if (k.includes("quick45")) return "הדחה מהירה 45°C";
    if (k.includes("glas40") || k.includes("glass40")) return "זכוכית עדינה 40°C";
    if (k.includes("silence") || k.includes("nightwash")) return "הדחת לילה שקטה";
    const cleanKey = progKey.replace("Dishcare.Dishwasher.Program.", "");
    const spaced = cleanKey.replace(/([A-Z])/g, ' $1').trim();
    return `${spaced}`;
  };

  const handleStop = async () => {
    if (!onStop) return;
    setStopping(true);
    try {
      await onStop();
    } finally {
      setStopping(false);
    }
  };

  const isRunning = appliance.operationState === "Run";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-[#005f7a] to-[#0284c7]" />

      {/* Header row */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-[#e0f2fe] text-[#005f7a] border border-[#bae6fd] rounded text-[11px] font-mono font-bold">
              {appliance.brand.toUpperCase()}
            </span>
            {useSimulator && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-bold">
                סימולטור
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-800">{appliance.name}</h3>
        </div>

        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          title="רענן"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wide">WiFi</p>
          <div className="flex items-center gap-1.5">
            {appliance.connected ? (
              <><Wifi className="w-3.5 h-3.5 text-emerald-600" /><span className="text-sm font-bold text-emerald-600">מחובר</span></>
            ) : (
              <><WifiOff className="w-3.5 h-3.5 text-rose-600" /><span className="text-sm font-bold text-rose-600">מנותק</span></>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wide">דלת</p>
          <div className="flex items-center gap-1.5">
            {appliance.doorState === "Closed" ? (
              <><DoorClosed className="w-3.5 h-3.5 text-emerald-600" /><span className="text-sm font-bold text-emerald-600">סגורה ✓</span></>
            ) : appliance.doorState === "Open" ? (
              <><DoorOpen className="w-3.5 h-3.5 text-rose-600" /><span className="text-sm font-bold text-rose-600">פתוחה ✗</span></>
            ) : (
              <><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /><span className="text-sm font-bold text-amber-500">לא ידוע</span></>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wide">Remote Start</p>
          <div className="flex items-center gap-1.5">
            {appliance.remoteStartAllowed ? (
              <><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /><span className="text-sm font-bold text-emerald-600">מאופשר</span></>
            ) : (
              <><Power className="w-3.5 h-3.5 text-rose-500" /><span className="text-sm font-bold text-rose-500">מושבת</span></>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wide">מצב</p>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isRunning ? "bg-cyan-500 animate-pulse" : "bg-emerald-500"}`} />
            <span className="text-sm font-bold text-slate-800">{getOperationStateName(appliance.operationState)}</span>
          </div>
        </div>
      </div>

      {/* Active program banner + Stop button */}
      {isRunning && appliance.activeProgram && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-sky-600 font-bold uppercase tracking-wide mb-0.5">פועל כעת</p>
              <p className="text-sm font-bold text-[#005f7a]">{getProgramName(appliance.activeProgram)}</p>
            </div>
            {onStop && (
              <button
                onClick={handleStop}
                disabled={stopping}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
                title="עצור את התוכנית הפעילה"
              >
                <StopCircle className="w-3.5 h-3.5" />
                {stopping ? "עוצר..." : "עצור פעולה"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Simulator controls */}
      {useSimulator && (
        <div className="pt-3 border-t border-slate-100">
          <p className="text-[10px] font-bold text-purple-700 mb-2">🔧 בקרת סימולציה:</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onSimulatorAction("toggleDoor")}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer ${
                appliance.doorState === "Closed"
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {appliance.doorState === "Closed" ? "פתח דלת 🚪" : "סגור דלת 🚪"}
            </button>

            <button
              onClick={() => onSimulatorAction("toggleRemote")}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer ${
                appliance.remoteStartAllowed
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {appliance.remoteStartAllowed ? "בטל Remote ✗" : "אפשר Remote ✓"}
            </button>

            <button
              onClick={() => onSimulatorAction("toggleConnected")}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold transition-colors cursor-pointer ${
                appliance.connected
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {appliance.connected ? "נתק WiFi 🔌" : "חבר WiFi 🔌"}
            </button>

            {isRunning && (
              <button
                onClick={() => onSimulatorAction("resetState")}
                className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer font-bold"
              >
                אפס מחזור 🔄
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
