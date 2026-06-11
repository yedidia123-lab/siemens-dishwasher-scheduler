import React from "react";
import { Appliance } from "../types";
import { DoorClosed, DoorOpen, Wifi, WifiOff, ShieldCheck, Play, Power, RotateCcw, AlertTriangle } from "lucide-react";

interface StatusWidgetProps {
  appliance: Appliance | null;
  useSimulator: boolean;
  onSimulatorAction: (action: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

export const StatusWidget: React.FC<StatusWidgetProps> = ({
  appliance,
  useSimulator,
  onSimulatorAction,
  loading,
  onRefresh,
}) => {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center animate-pulse">
        <p className="text-slate-400">טוען נתוני מכשיר...</p>
      </div>
    );
  }

  if (!appliance) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
        <p className="text-amber-400 font-medium mb-2">לא נמצא מדיח כלים מחובר</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          אם בחרת בחיבור API, ודא שהתחברת לחשבון בהצלחה בטאב ההגדרות והמכשיר דלוק ומחובר ל-WiFi.
        </p>
      </div>
    );
  }

  const getOperationStateName = (state: string) => {
    switch (state) {
      case "Ready": return "מוכן להפעלה";
      case "Run": return "עובד כעת (בתוכנית)";
      case "Finished": return "סיום מחזור הדחה";
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
    
    // common others
    if (k.includes("quick45")) return "הדחה מהירה 45°C";
    if (k.includes("glas40") || k.includes("glass40")) return "זכוכית עדינה 40°C";
    if (k.includes("silence") || k.includes("nightwash")) return "הדחת לילה שקטה";

    const cleanKey = progKey.replace("Dishcare.Dishwasher.Program.", "");
    const spaced = cleanKey.replace(/([A-Z])/g, ' $1').trim();
    return `${spaced} (תוכנית ייעודית)`;
  };

  return (
    <div id="status-widget" className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm relative overflow-hidden transition-all duration-300 animate-fade-in">
      <div className="absolute top-0 right-0 left-0 h-[3px] bg-[#005f7a]"></div>
      
      {/* Top row */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-[#e0f2fe] text-[#005f7a] border border-[#bae6fd] rounded text-[11px] font-mono tracking-wider font-bold">
              {appliance.brand.toUpperCase()}
            </span>
            {useSimulator && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-bold">
                בסימולטור
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-800">{appliance.name}</h3>
        </div>

        <button
          onClick={onRefresh}
          className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 border border-slate-200 transition-colors cursor-pointer"
          title="רענן מסטטוס מכשיר"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of status states */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        
        {/* Connection status */}
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <p className="text-xs text-slate-500 mb-1 font-semibold">מצב חיבור WiFi</p>
          <div className="flex items-center gap-2">
            {appliance.connected ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-600">מחובר</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-bold text-rose-600">מנותק</span>
              </>
            )}
          </div>
        </div>

        {/* Door sensor state */}
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <p className="text-xs text-slate-500 mb-1 font-semibold">חיישן דלת</p>
          <div className="flex items-center gap-2">
            {appliance.doorState === "Closed" ? (
              <>
                <DoorClosed className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-600">סגורה (בטוח)</span>
              </>
            ) : appliance.doorState === "Open" ? (
              <>
                <DoorOpen className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-bold text-rose-600">פתוחה (חסום)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-amber-500">לא ידוע</span>
              </>
            )}
          </div>
        </div>

        {/* Remote control capability */}
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <p className="text-xs text-slate-500 mb-1 font-semibold">אישור Remote Start</p>
          <div className="flex items-center gap-2">
            {appliance.remoteStartAllowed ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-600">מאופשר</span>
              </>
            ) : (
              <>
                <Power className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-bold text-rose-500">מושבת</span>
              </>
            )}
          </div>
        </div>

        {/* Operation State */}
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <p className="text-xs text-slate-500 mb-1 font-semibold">סטטוס עבודה</p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${appliance.operationState === "Run" ? "bg-cyan-500 animate-pulse" : "bg-emerald-500"}`}></span>
            <span className="text-sm font-bold text-slate-800">
              {getOperationStateName(appliance.operationState)}
            </span>
          </div>
        </div>

      </div>

      {/* If running show remaining and active program */}
      {appliance.operationState === "Run" && appliance.activeProgram && (
        <div className="bg-sky-50 border border-sky-250 rounded-lg p-3 mb-6 animate-pulse">
          <div className="flex justify-between items-center text-xs text-[#005f7a] mb-1 font-bold">
            <span>מריץ כעת תוכנית עבודה</span>
            <span className="font-mono">פעיל</span>
          </div>
          <p className="text-sm font-bold text-[#005f7a]">{getProgramName(appliance.activeProgram)}</p>
        </div>
      )}

      {/* Simulator Interactive Panel - test safety checks */}
      {useSimulator && (
        <div className="mt-2 pt-4 border-t border-slate-200">
          <p className="text-[11px] font-bold text-purple-700 mb-3 flex items-center gap-1">
            <span>🔧 בקרת סימולציה אינטראקטיבית:</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            
            <button
              onClick={() => onSimulatorAction("toggleDoor")}
              className={`text-xs px-2.5 py-1.5 rounded border font-bold transition-colors cursor-pointer ${
                appliance.doorState === "Closed"
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {appliance.doorState === "Closed" ? "פחת דלת 🚪" : "סגור דלת 🚪"}
            </button>

            <button
              onClick={() => onSimulatorAction("toggleRemote")}
              className={`text-xs px-2.5 py-1.5 rounded border font-bold transition-colors cursor-pointer ${
                appliance.remoteStartAllowed
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {appliance.remoteStartAllowed ? "בטל Remote-Start 🛑" : "אפשר Remote-Start ✓"}
            </button>

            <button
              onClick={() => onSimulatorAction("toggleConnected")}
              className={`text-xs px-2.5 py-1.5 rounded border font-bold transition-colors cursor-pointer ${
                appliance.connected
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {appliance.connected ? "נתק WiFi 🔌" : "חבר WiFi 🔌"}
            </button>

            {appliance.operationState === "Run" && (
              <button
                onClick={() => onSimulatorAction("resetState")}
                className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded transition-colors ml-auto cursor-pointer font-bold"
              >
                אפס מחזור 🔄
              </button>
            )}

          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 leading-relaxed">
            * הטיקר בודק את התנאים לפעולת המדיח. באפשרותך לפתוח את הדלת או לכבות את ה-Remote Start כאן כדי לבחון מנגנוני הבטיחות בפעולה!
          </p>
        </div>
      )}
    </div>
  );
};
