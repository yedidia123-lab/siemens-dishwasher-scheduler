import React, { useState } from "react";
import { ScheduleItem } from "../types";
import { Calendar, Trash2, Clock, Edit3, Save, X, ToggleLeft, ToggleRight, Loader2, Info, Activity } from "lucide-react";

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
  pending:    { label: "ממתין",    color: "text-[#c9a84c] bg-[#1a1622] border-[#c9a84c]/30",        dot: "bg-[#c9a84c]" },
  triggering: { label: "מופעל...", color: "text-amber-300 bg-amber-950/40 border-amber-800/50",      dot: "bg-amber-400 dot-pulse" },
  triggered:  { label: "הצליח",   color: "text-emerald-300 bg-emerald-950/40 border-emerald-800/50", dot: "bg-emerald-400" },
  failed:     { label: "נכשל",    color: "text-rose-300 bg-rose-950/40 border-rose-800/50",          dot: "bg-rose-400" },
  missed:     { label: "החמיץ",   color: "text-[#6e6e8a] bg-[#13131e] border-[#252538]",             dot: "bg-[#3e3e58]" },
  cancelled:  { label: "מבוטל",   color: "text-[#4e4e6a] bg-[#0d0d18] border-[#1e1e2e]",            dot: "bg-[#2e2e48]" },
};

const CARD_BORDER: Record<string, string> = {
  pending:   "border-r-[#c9a84c]",
  triggering:"border-r-amber-400",
  triggered: "border-r-emerald-500",
  failed:    "border-r-rose-500",
  missed:    "border-r-[#3e3e58]",
  cancelled: "border-r-[#252538]",
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#e8e4f0] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#c9a84c]" />
            תזמונים מוגדרים
          </h3>
          <p className="text-xs text-[#4e4e6a] mt-0.5">{schedules.length} רשומות · עדכון אוטומטי כל 45 שניות</p>
        </div>
        {onTriggerCheck && (
          <button
            onClick={onTriggerCheck}
            disabled={checkingSchedules}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#13131e] hover:bg-[#1e1e30] border border-[#252538] text-[#6e6e8a] hover:text-[#c9a84c] rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-50 min-h-[40px]"
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
        <div className="bg-[#13131e] border border-[#252538] border-dashed rounded-2xl p-12 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#18182a] border border-[#252538] flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-[#3a3a55]" />
          </div>
          <p className="text-sm font-medium text-[#6e6e8a]">אין תזמונים מוגדרים</p>
          <p className="text-xs text-[#3a3a55] mt-1">הוסף תזמון ראשון בטופס למעלה</p>
        </div>
      )}

      {/* Cards grid */}
      {schedules.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {schedules.map((item) => {
            const isEditing = editingId === item.id;
            const meta = STATUS_META[item.status] || STATUS_META.pending;
            const borderColor = CARD_BORDER[item.status] || "border-r-[#252538]";

            return (
              <div
                key={item.id}
                className={`bg-[#18182a] border border-[#252538] border-r-2 ${borderColor} rounded-2xl overflow-hidden transition-all animate-fade-in ${
                  item.status === "cancelled" ? "opacity-50" : ""
                }`}
              >
                {isEditing ? (
                  /* Edit mode */
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#252538] pb-2.5">
                      <span className="text-xs font-semibold text-[#c9a84c] flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> עריכת תזמון
                      </span>
                      <button onClick={() => setEditingId(null)} className="p-1 rounded-lg hover:bg-[#252538] text-[#4e4e6a] cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide">שם התזמון</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                        className="input-dark" placeholder="שם ההפעלה..." />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide">תוכנית הדחה</label>
                      <select value={editProgram} onChange={e => setEditProgram(e.target.value)} className="input-dark">
                        {programs.map(p => (
                          <option key={p.key} value={p.key}>{getBilingualName(p.key, p.name)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide">יום</label>
                        <select value={editDayOfWeek} onChange={e => setEditDayOfWeek(Number(e.target.value))} className="input-dark">
                          {[1,2,3,4,5,6,0,-1].map(d => (
                            <option key={d} value={d}>{d === -1 ? "חד-פעמי" : `כל ${getDayName(d)}`}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide">שעה</label>
                        <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                          className="input-dark font-mono" />
                      </div>
                    </div>
                    {editDayOfWeek === -1 && (
                      <div>
                        <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide">תאריך</label>
                        <input type="date" value={editOneTimeDate} onChange={e => setEditOneTimeDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]} className="input-dark cursor-pointer" />
                      </div>
                    )}
                    <div>
                      <button type="button" onClick={() => setEditStatus(editStatus === "pending" ? "cancelled" : "pending")}
                        className="flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors">
                        {editStatus === "pending" ? (
                          <><ToggleRight className="w-6 h-6 text-emerald-400" /><span className="text-emerald-400">פעיל</span></>
                        ) : (
                          <><ToggleLeft className="w-6 h-6 text-[#4e4e6a]" /><span className="text-[#4e4e6a]">כבוי</span></>
                        )}
                      </button>
                    </div>
                    <div className="flex gap-2 pt-1 border-t border-[#252538]">
                      <button onClick={() => setEditingId(null)} disabled={saving}
                        className="flex-1 py-2.5 border border-[#252538] text-[#6e6e8a] rounded-xl text-sm font-medium hover:bg-[#1e1e30] transition-colors cursor-pointer">
                        ביטול
                      </button>
                      <button onClick={() => handleSave(item)} disabled={saving}
                        className="flex-1 py-2.5 bg-[#c9a84c] hover:bg-[#d4b55a] text-[#0b0b12] rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> שומר...</> : <><Save className="w-4 h-4" /> שמור</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="p-4">
                    {/* Status + actions row */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${meta.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                        {item.dayOfWeek !== -1 && item.lastRunStatus === "success" && (
                          <span className="text-emerald-400 text-[10px]"> · הצליח</span>
                        )}
                        {item.dayOfWeek !== -1 && item.lastRunStatus === "failed" && (
                          <span className="text-rose-400 text-[10px]"> · נכשל</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEditing(item)}
                          className="p-2 rounded-xl bg-[#13131e] hover:bg-[#1e1e30] text-[#4e4e6a] hover:text-[#c9a84c] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="ערוך">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(item.id)}
                          className="p-2 rounded-xl bg-[#13131e] hover:bg-rose-950/50 text-[#4e4e6a] hover:text-rose-400 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="מחק">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Name + program */}
                    <h4 className="text-sm font-semibold text-[#e8e4f0] mb-0.5 leading-snug">{item.name}</h4>
                    <p className="text-xs text-[#c9a84c]/70 font-medium mb-3">{getBilingualName(item.program)}</p>

                    {/* Time + day */}
                    <div className="flex items-center justify-between bg-[#0d0d18] rounded-xl px-3 py-2.5 border border-[#1e1e2e]">
                      <div className="flex items-center gap-1.5 text-[#6e6e8a] text-xs font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.dayOfWeek === -1
                          ? item.oneTimeDate || "תאריך לא הוגדר"
                          : `כל יום ${getDayName(item.dayOfWeek)}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-[#e8e4f0] text-sm font-mono font-semibold">
                        <Clock className="w-3.5 h-3.5 text-[#c9a84c]" />
                        {item.time}
                      </div>
                    </div>

                    {/* Error log */}
                    {(item.status === "failed" || item.lastRunStatus === "failed" || item.status === "missed") && item.errorLog && (
                      <div className="mt-2.5 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2 text-[11px] text-rose-300 leading-relaxed">
                        <span className="font-semibold">{getErrorLabel(item.errorLog)}:</span>{" "}
                        {item.errorLog}
                      </div>
                    )}

                    {/* Last run */}
                    {item.lastRun && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-[#3a3a55]">
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
