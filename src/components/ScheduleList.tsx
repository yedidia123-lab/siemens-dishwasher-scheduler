import React, { useState } from "react";
import { ScheduleItem } from "../types";
import { Calendar, Trash2, Clock, CheckCircle, AlertOctagon, Timer, Edit3, Save, X, ToggleLeft, ToggleRight, Loader2, Info, Activity } from "lucide-react";

interface ScheduleListProps {
  schedules: ScheduleItem[];
  onDelete: (id: string) => void;
  onEdit: (id: string, updatedSchedule: any) => Promise<boolean>;
  programs: Array<{ key: string; name: string; durationMin: number }>;
  onTriggerCheck?: () => Promise<void>;
  checkingSchedules?: boolean;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({ 
  schedules, 
  onDelete, 
  onEdit, 
  programs,
  onTriggerCheck,
  checkingSchedules 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDayOfWeek, setEditDayOfWeek] = useState<number>(1);
  const [editOneTimeDate, setEditOneTimeDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editProgram, setEditProgram] = useState("");
  const [editStatus, setEditStatus] = useState<'pending' | 'cancelled'>("pending");
  const [saving, setSaving] = useState(false);

  const getDayName = (dayOfWeek: number) => {
    switch (dayOfWeek) {
      case -1: return "חד-פעמי";
      case 0: return "יום ראשון";
      case 1: return "יום שני";
      case 2: return "יום שלישי";
      case 3: return "יום רביעי";
      case 4: return "יום חמישי";
      case 5: return "יום שישי";
      case 6: return "יום שבת";
      default: return "";
    }
  };

  const getProgramName = (progKey: string) => {
    const prog = programs.find((p) => p.key === progKey);
    if (prog) return prog.name;
    
    const k = progKey.toLowerCase();
    let english = "";
    let hebrew = "";
    
    if (k.includes("intensiv70") || k.includes("intensive70") || k.includes("heavy")) {
      english = "Heavy"; hebrew = "הדחה חזקה";
    } else if (k.includes("auto4565") || k.includes("auto")) {
      english = "Auto"; hebrew = "אוטומטי";
    } else if (k.includes("eco50") || k.includes("eco")) {
      english = "Eco"; hebrew = "חסכונית";
    } else if (k.includes("prerinse") || k.includes("pre-rinse") || k.includes("pre_rinse")) {
      english = "Pre-rinse"; hebrew = "שטיפה מקדימה";
    } else if (k.includes("quick65") || k.includes("speed65") || k.includes("quickspeed65")) {
      english = "Speed 65°"; hebrew = "מהירה 65°";
    } else if (k.includes("machinecare") || k.includes("machine-care") || k.includes("machine_care")) {
      english = "Machine Care"; hebrew = "ניקוי מכונה";
    } else if (k.includes("quick45")) {
      english = "Quick 45°"; hebrew = "הדחה מהירה 45°C";
    } else if (k.includes("glas40") || k.includes("glass40")) {
      english = "Glass 40°"; hebrew = "זכוכית עדינה 40°C";
    } else if (k.includes("silence") || k.includes("nightwash")) {
      english = "Silence / Night Wash"; hebrew = "הדחת לילה שקטה";
    } else {
      const cleanKey = progKey.replace("Dishcare.Dishwasher.Program.", "");
      const spaced = cleanKey.replace(/([A-Z])/g, " $1").trim();
      english = spaced;
      hebrew = `${spaced} (לא מתורגם)`;
    }
    
    return `${english} — ${hebrew}`;
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
    if (!editName.trim() || (editDayOfWeek === -1 && !editOneTimeDate) || !editTime) {
      return;
    }

    setSaving(true);
    try {
      const success = await onEdit(item.id, {
        name: editName,
        dayOfWeek: editDayOfWeek,
        oneTimeDate: editDayOfWeek === -1 ? editOneTimeDate : undefined,
        time: editTime,
        program: editProgram,
        status: editStatus,
        applianceId: item.applianceId,
      });
      if (success) {
        setEditingId(null);
      }
    } catch (err: any) {
      console.error("Schedule edit error:", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="schedule-list" className="space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 border border-slate-200/60 p-3.5 rounded-lg">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-[#005f7a] flex items-center gap-1.5">
            <Calendar className="w-4.5 h-4.5 text-[#005f7a]" />
            לוח זמנים פעיל לשליטה מתוזמנת במדיח
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold">
            דיווחים ומצבי מכשיר מתעדכנים אוטומטית ברקע כל 10 שניות
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-auto justify-between">
          {onTriggerCheck && (
            <button
              onClick={onTriggerCheck}
              disabled={checkingSchedules}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[#005f7a] rounded text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {checkingSchedules ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#005f7a]" />
                  מבצע בדיקה...
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-[#005f7a]" />
                  בדוק תזמונים עכשיו
                </>
              )}
            </button>
          )}
          
          <span className="text-[11px] bg-[#e0f2fe] border border-[#bae6fd] text-[#005f7a] rounded-full px-2.5 py-0.5 font-bold shrink-0">
            {schedules.length} מועדים
          </span>
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-lg p-8 text-center text-slate-500 shadow-sm animate-fade-in">
          <p className="text-sm font-semibold">אין הפעלות מתוזמנות ברשימה כעת.</p>
          <p className="text-xs text-slate-400 mt-1">השתמש בטופס מימין כדי לקבוע עד 7 הפעלות עתידיות בטיחותיות.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((item) => {
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-lg transition-all relative overflow-hidden flex flex-col justify-between shadow-sm animate-fade-in ${
                  isEditing
                    ? "border-[#005f7a] ring-1 ring-[#005f7a] p-5"
                    : item.status === "failed"
                    ? "border-rose-200 p-4.5"
                    : item.status === "cancelled"
                    ? "border-slate-250 opacity-80 bg-slate-50/70 p-4.5"
                    : item.status === "triggered"
                    ? "border-emerald-200 p-4.5"
                    : "border-slate-200 hover:border-slate-350 p-4.5"
                }`}
              >
                {/* Cancel & Edit action buttons */}
                {!isEditing && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5">
                    <button
                      onClick={() => startEditing(item)}
                      className="p-1.5 rounded bg-slate-100 hover:bg-sky-50 text-slate-650 hover:text-[#005f7a] border border-slate-200 hover:border-sky-200 transition-all cursor-pointer"
                      title="ערוך תזמון"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 rounded bg-slate-100 hover:bg-rose-50 text-slate-650 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                      title="בטל והסר תזמון"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {isEditing ? (
                  /* --- EDITING MODE INTERFACE --- */
                  <div className="space-y-3.5 font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                      <span className="text-xs font-bold text-[#005f7a] flex items-center gap-1">
                        <Edit3 className="w-3.5 h-3.5" />
                        עריכת הפעלה מתוזמנת
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {item.id}</span>
                    </div>

                    {/* Edit Name */}
                    <div>
                      <label className="block text-[10px] text-slate-600 font-bold mb-1">תיאור תזמון:</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-2 py-1 text-xs outline-none transition-all font-semibold"
                        placeholder="שם ההפעלה..."
                      />
                    </div>

                    {/* Edit Program */}
                    <div>
                      <label className="block text-[10px] text-slate-600 font-bold mb-1">תוכנית הדחה:</label>
                      <select
                        value={editProgram}
                        onChange={(e) => setEditProgram(e.target.value)}
                        className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-2 py-1 text-xs outline-none transition-all cursor-pointer font-semibold"
                      >
                        {programs.map((prog) => (
                          <option key={prog.key} value={prog.key}>
                            {prog.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Edit Day & Time */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-600 font-bold mb-1">יום / תדירות:</label>
                        <select
                          value={editDayOfWeek}
                          onChange={(e) => setEditDayOfWeek(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-2 py-1 text-xs outline-none transition-all cursor-pointer font-semibold"
                        >
                          <option value={1}>כל שני</option>
                          <option value={2}>כל שלישי</option>
                          <option value={3}>כל רביעי</option>
                          <option value={4}>כל חמישי</option>
                          <option value={5}>כל שישי</option>
                          <option value={6}>כל שבת</option>
                          <option value={0}>כל ראשון</option>
                          <option value={-1}>חד-פעמי</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-600 font-bold mb-1">שעה:</label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-2 py-1 text-xs outline-none transition-all font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Edit Specific Date if One-Time is chosen */}
                    {editDayOfWeek === -1 && (
                      <div>
                        <label className="block text-[10px] text-slate-600 font-bold mb-1">תאריך יעד:</label>
                        <input
                          type="date"
                          value={editOneTimeDate}
                          onChange={(e) => setEditOneTimeDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-2 py-1 text-xs outline-none transition-all cursor-pointer font-semibold"
                        />
                      </div>
                    )}

                    {/* Status selection (Active/Inactive Toggle) */}
                    <div>
                      <label className="block text-[10px] text-slate-600 font-bold mb-1">מצב הפעלה מתוכננת:</label>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setEditStatus(editStatus === "pending" ? "cancelled" : "pending")}
                          className="text-[#005f7a] hover:text-[#004d64] flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-bold"
                        >
                          {editStatus === "pending" ? (
                            <>
                              <ToggleRight className="w-6 h-6 text-emerald-600" />
                              <span className="text-emerald-700">פעיל וממתין להדחה</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-6 h-6 text-slate-400" />
                              <span className="text-slate-500">כבוי (לא יתבצע)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                        className="px-2.5 py-1.5 border border-slate-250 rounded text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer font-bold flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave(item)}
                        disabled={saving}
                        className="px-3.5 py-1.5 bg-[#005f7a] hover:bg-[#004d64] text-white rounded text-xs transition-colors cursor-pointer font-bold flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            שומר...
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            עדכן תזמון
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* --- VIEW MODE INTERFACE --- */
                  <>
                    <div>
                      {/* Status pills */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3 font-sans">
                        {item.status === "pending" && (
                          <span className="px-2 py-0.5 bg-sky-50 text-[#005f7a] border border-sky-100 text-[10px] rounded flex items-center gap-1 font-bold">
                            <Timer className="w-3.5 h-3.5 text-[#005f7a]" />
                            ממתין למועד (פעיל)
                          </span>
                        )}
                        {item.status === "triggering" && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] rounded flex items-center gap-1 font-bold animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                            בתהליך הפעלה...
                          </span>
                        )}
                        {item.status === "cancelled" && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] rounded flex items-center gap-1 font-bold">
                            <X className="w-3.5 h-3.5 text-slate-500" />
                            לא פעיל (מבוטל)
                          </span>
                        )}
                        {item.status === "triggered" && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] rounded flex items-center gap-1 font-bold">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            הופעל בהצלחה
                          </span>
                        )}
                        {item.status === "failed" && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-[10px] rounded flex items-center gap-1 font-bold">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                            {item.errorLog?.includes("אינה נתמכת") || item.errorLog?.includes("לא נתמכת")
                              ? "תוכנית לא נתמכת במדיח הזה"
                              : item.errorLog?.includes("חיבור מחדש")
                              ? "נדרש חיבור"
                              : item.errorLog?.includes("זמין כרגע")
                              ? "מכשיר לא זמין"
                              : item.errorLog?.includes("Remote Start") || item.errorLog?.includes("שלט")
                              ? "יש להפעיל Remote Start"
                              : item.errorLog?.includes("דלת")
                              ? "דלת פתוחה"
                              : "נכשל בפעולה"}
                          </span>
                        )}
                        {item.status === "missed" && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-650 border border-slate-250 text-[10px] rounded flex items-center gap-1 font-bold">
                            <AlertOctagon className="w-3.5 h-3.5 text-slate-500" />
                            עבר ללא הפעלה
                          </span>
                        )}
                        
                        {/* Recurring run execution outcomes */}
                        {item.dayOfWeek !== -1 && item.lastRunStatus === "success" && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] rounded flex items-center gap-0.5 font-semibold">
                            הפעלה אחרונה הצליחה ✓
                          </span>
                        )}
                        {item.dayOfWeek !== -1 && item.lastRunStatus === "failed" && (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-[10px] rounded flex items-center gap-0.5 font-semibold">
                            הפעלה אחרונה נכשלה ✗
                          </span>
                        )}
                      </div>

                      {/* Title & Program info */}
                      <h4 className="text-sm font-bold text-slate-800 mb-1 prune-text max-w-[80%]">{item.name}</h4>
                      <p className="text-xs text-slate-500 mb-4 font-semibold">{getProgramName(item.program)}</p>
                    </div>

                    {/* Footer Info */}
                    <div className="bg-slate-50 -mx-4.5 -mb-4.5 px-4.5 py-3 border-t border-slate-150 flex flex-col gap-1.5 mt-auto">
                      {/* Day and hour indicator */}
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span className="font-bold text-slate-700">
                          {getDayName(item.dayOfWeek)}
                          {item.dayOfWeek === -1 && item.oneTimeDate ? ` (${item.oneTimeDate})` : ""}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-slate-800 font-mono">
                          <Clock className="w-3.5 h-3.5 text-[#005f7a]" />
                          {item.time}
                        </span>
                      </div>

                      {/* Last Run Info */}
                      {item.lastRun && (
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                          <Info className="w-3 h-3 text-slate-400" />
                          <span>
                            הפעלה אחרונה: {new Date(item.lastRun).toLocaleTimeString("he-IL")} (בתאריך {new Date(item.lastRun).toLocaleDateString("he-IL")})
                          </span>
                        </div>
                      )}

                      {/* Security/Operation failed reason */}
                      {(item.status === "failed" || item.lastRunStatus === "failed" || item.status === "missed") && item.errorLog && (
                        <div className="bg-rose-50 border border-rose-100 rounded p-2 text-[10px] text-rose-700 mt-2 leading-relaxed font-semibold">
                          ❌ {item.errorLog?.includes("בטיחות") || item.errorLog?.includes("דלת") || item.errorLog?.includes("Remote")
                            ? "סיבת כשל בטיחותי או אי-ביצוע: "
                            : "פרטי השגיאה או אי-ביצוע: "}
                          {item.errorLog}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
