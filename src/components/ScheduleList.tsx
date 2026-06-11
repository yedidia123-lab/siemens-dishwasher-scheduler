import React, { useState } from "react";
import { ScheduleItem } from "../types";
import { Calendar, Trash2, Clock, CheckCircle, AlertOctagon, Timer, Edit3, Save, X, ToggleLeft, ToggleRight, Loader2, Info, Activity, ChevronLeft } from "lucide-react";

interface ScheduleListProps {
  schedules: ScheduleItem[];
  onDelete: (id: string) => void;
  onEdit: (id: string, updatedSchedule: any) => Promise<boolean>;
  programs: Array<{ key: string; name: string; durationMin: number }>;
  onTriggerCheck?: () => Promise<void>;
  checkingSchedules?: boolean;
}

function getBilingualName(progKey: string, serverName?: string): string {
  const k = progKey.toLowerCase();
  if (k.includes("intensiv70") || k.includes("intensive70") || k.includes("heavy")) return "Intensive — הדחה חזקה";
  if (k.includes("auto4565") || k.includes("auto")) return "Auto — אוטומטי";
  if (k.includes("eco50") || k.includes("eco")) return "Eco — חסכונית";
  if (k.includes("prerinse") || k.includes("pre-rinse") || k.includes("pre_rinse")) return "Pre-Rinse — שטיפה מקדימה";
  if (k.includes("quick65") || k.includes("speed65") || k.includes("quickspeed65")) return "Speed 65° — מהירה 65°";
  if (k.includes("machinecare") || k.includes("machine-care") || k.includes("machine_care")) return "Machine Care — ניקוי מכונה";
  if (k.includes("quick45")) return "Quick 45° — מהירה 45°";
  if (k.includes("glas40") || k.includes("glass40")) return "Glass 40° — זכוכית 40°";
  if (k.includes("silence") || k.includes("nightwash")) return "Night Wash — לילה שקטה";
  if (serverName) return serverName;
  const clean = progKey.replace("Dishcare.Dishwasher.Program.", "").replace(/([A-Z])/g, " $1").trim();
  return clean;
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  pending:    { label: "ממתין",       color: "text-sky-400 bg-sky-950/60 border-sky-800",   dot: "bg-sky-400" },
  triggering: { label: "מופעל...",    color: "text-amber-400 bg-amber-950/60 border-amber-800", dot: "bg-amber-400 dot-pulse" },
  triggered:  { label: "הצליח",      color: "text-emerald-400 bg-emerald-950/60 border-emerald-800", dot: "bg-emerald-400" },
  failed:     { label: "נכשל",       color: "text-rose-400 bg-rose-950/60 border-rose-800",  dot: "bg-rose-400" },
  missed:     { label: "החמיץ",      color: "text-slate-400 bg-slate-800/60 border-slate-700", dot: "bg-slate-500" },
  cancelled:  { label: "מבוטל",      color: "text-slate-500 bg-slate-800/40 border-slate-700", dot: "bg-slate-600" },
};

const CARD_BORDER: Record<string, string> = {
  pending:   "border-r-sky-500",
  triggering:"border-r-amber-400",
  triggered: "border-r-emerald-500",
  failed:    "border-r-rose-500",
  missed:    "border-r-slate-600",
  cancelled: "border-r-slate-700",
};

export const ScheduleList: React.FC<ScheduleListProps> = ({
  schedules,
  onDelete,
  onEdit,
  programs,
  onTriggerCheck,
  checkingSchedules,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDayOfWeek, setEditDayOfWeek] = useState<number>(1);
  const [editOneTimeDate, setEditOneTimeDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editProgram, setEditProgram] = useState("");
  const [editStatus, setEditStatus] = useState<"pending" | "cancelled">("pending");
  const [saving, setSaving] = useState(false);

  const getDayName = (dayOfWeek: number) => {
    const names: Record<number, string> = { "-1": "חד-פעמי", 0: "ראשון", 1: "שני", 2: "שלישי", 3: "רביעי", 4: "חמישי", 5: "שישי", 6: "שבת" };
    return names[dayOfWeek] || "";
  };

  const startEditing = (item: ScheduleItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDayOfWeek(item.dayOfWeek);
    setEditOneTimeDate(item.oneTimeDate || "");
    setEditTime(item.time);
    setEditProgram(item.program);
    setEditStatus(item.status === "cancelled" ? "cancelled" : "pending");
  };

  const handleSave = async (item: ScheduleItem) => {
    if (!editName.trim() || (editDayOfWeek === -1 && !editOneTimeDate) || !editTime) return;
    setSaving(true);
    try {
      const ok = await onEdit(item.id, {
        name: editName,
        dayOfWeek: editDayOfWeek,
        oneTimeDate: editDayOfWeek === -1 ? editOneTimeDate : undefined,
        time: editTime,
        program: editProgram,
        status: editStatus,
        applianceId: item.applianceId,
      });
      if (ok) setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const getErrorLabel = (log?: string) => {
    if (!log) return "שגיאה לא ידועה";
    if (log.includes("דלת")) return "דלת פתוחה";
    if (log.includes("Remote")) return "Remote Start מושבת";
    if (log.includes("אינה נתמכת") || log.includes("לא נתמכת")) return "תוכנית לא נתמכת";
    if (log.includes("חיבור")) return "נדרש חיבור";
    if (log.includes("זמין")) return "מכשיר לא זמין";
    return "כשל בפעולה";
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            תזמונים מוגדרים
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{schedules.length} רשומות · עדכון אוטומטי כל 45 שניות</p>
        </div>
        {onTriggerCheck && (
          <button
            onClick={onTriggerCheck}
            disabled={checkingSchedules}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-sky-400 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {checkingSchedules ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> בודק...</>
            ) : (
              <><Activity className="w-3.5 h-3.5" /> בדוק עכשיו</>
            )}
          </button>
        )}
      </div>

      {/* Empty state */}
      {schedules.length === 0 && (
        <div className="bg-slate-800/50 border border-slate-700/60 border-dashed rounded-2xl p-10 text-center animate-fade-in">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">אין תזמונים מוגדרים</p>
          <p className="text-xs text-slate-600 mt-1">הוסף תזמון ראשון בטופס למעלה</p>
        </div>
      )}

      {/* Cards grid */}
      {schedules.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {schedules.map((item) => {
            const isEditing = editingId === item.id;
            const meta = STATUS_META[item.status] || STATUS_META.pending;
            const borderColor = CARD_BORDER[item.status] || "border-r-slate-700";

            return (
              <div
                key={item.id}
                className={`bg-[#1a2d42] border border-slate-700/70 border-r-2 ${borderColor} rounded-2xl overflow-hidden transition-all animate-fade-in ${
                  item.status === "cancelled" ? "opacity-60" : ""
                }`}
              >
                {isEditing ? (
                  /* Edit mode */
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> עריכת תזמון
                      </span>
                      <button onClick={() => setEditingId(null)} className="p-1 rounded-lg hover:bg-slate-700 text-slate-500 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">שם התזמון</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                        className="input-dark" placeholder="שם ההפעלה..." />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">תוכנית הדחה</label>
                      <select value={editProgram} onChange={e => setEditProgram(e.target.value)} className="input-dark">
                        {programs.map(p => (
                          <option key={p.key} value={p.key}>{getBilingualName(p.key, p.name)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">יום</label>
                        <select value={editDayOfWeek} onChange={e => setEditDayOfWeek(Number(e.target.value))} className="input-dark">
                          {[1,2,3,4,5,6,0,-1].map(d => (
                            <option key={d} value={d}>{d === -1 ? "חד-פעמי" : `כל ${getDayName(d)}`}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">שעה</label>
                        <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                          className="input-dark font-mono" />
                      </div>
                    </div>
                    {editDayOfWeek === -1 && (
                      <div>
                        <label className="block text-[11px] text-slate-400 font-semibold mb-1.5">תאריך</label>
                        <input type="date" value={editOneTimeDate} onChange={e => setEditOneTimeDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]} className="input-dark cursor-pointer" />
                      </div>
                    )}
                    <div>
                      <button type="button" onClick={() => setEditStatus(editStatus === "pending" ? "cancelled" : "pending")}
                        className="flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors">
                        {editStatus === "pending" ? (
                          <><ToggleRight className="w-6 h-6 text-emerald-400" /><span className="text-emerald-400">פעיל</span></>
                        ) : (
                          <><ToggleLeft className="w-6 h-6 text-slate-500" /><span className="text-slate-500">כבוי</span></>
                        )}
                      </button>
                    </div>
                    <div className="flex gap-2 pt-1 border-t border-slate-700">
                      <button onClick={() => setEditingId(null)} disabled={saving}
                        className="flex-1 py-2.5 border border-slate-600 text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors cursor-pointer">
                        ביטול
                      </button>
                      <button onClick={() => handleSave(item)} disabled={saving}
                        className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</> : <><Save className="w-4 h-4" /> שמור</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="p-4">
                    {/* Status + actions row */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                        {item.dayOfWeek !== -1 && item.lastRunStatus === "success" && (
                          <span className="text-emerald-400 text-[10px]"> · הצליח</span>
                        )}
                        {item.dayOfWeek !== -1 && item.lastRunStatus === "failed" && (
                          <span className="text-rose-400 text-[10px]"> · נכשל</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => startEditing(item)}
                          className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="ערוך">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(item.id)}
                          className="p-2 rounded-xl bg-slate-700/60 hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="מחק">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Name + program */}
                    <h4 className="text-sm font-bold text-slate-100 mb-1 leading-snug">{item.name}</h4>
                    <p className="text-xs text-sky-400/80 font-medium mb-3">{getBilingualName(item.program)}</p>

                    {/* Time + day */}
                    <div className="flex items-center justify-between bg-slate-900/50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.dayOfWeek === -1
                          ? item.oneTimeDate || "תאריך לא הוגדר"
                          : `כל יום ${getDayName(item.dayOfWeek)}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-200 text-sm font-mono font-bold">
                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                        {item.time}
                      </div>
                    </div>

                    {/* Error log */}
                    {(item.status === "failed" || item.lastRunStatus === "failed" || item.status === "missed") && item.errorLog && (
                      <div className="mt-2.5 bg-rose-950/50 border border-rose-800/60 rounded-xl px-3 py-2 text-[11px] text-rose-300 leading-relaxed">
                        <span className="font-bold">{getErrorLabel(item.errorLog)}:</span>{" "}
                        {item.errorLog}
                      </div>
                    )}

                    {/* Last run */}
                    {item.lastRun && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-600">
                        <Info className="w-3 h-3" />
                        הפעלה אחרונה: {new Date(item.lastRun).toLocaleDateString("he-IL")} {new Date(item.lastRun).toLocaleTimeString("he-IL")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
