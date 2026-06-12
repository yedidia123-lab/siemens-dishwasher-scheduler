import React, { useState } from "react";
import { ScheduleItem } from "../types";
import { PlusCircle, Calendar, Clock, Sparkles } from "lucide-react";

interface ScheduleFormProps {
  onAddSchedule: (schedule: Omit<ScheduleItem, "id" | "status">) => Promise<boolean>;
  applianceId: string;
  programs: Array<{ key: string; name: string; durationMin: number }>;
  pendingCount: number;
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
  return progKey.replace("Dishcare.Dishwasher.Program.", "").replace(/([A-Z])/g, " $1").trim();
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  onAddSchedule,
  applianceId,
  programs,
  pendingCount,
}) => {
  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number>(5);
  const [oneTimeDate, setOneTimeDate] = useState("");
  const [time, setTime] = useState("22:00");
  const [program, setProgram] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  React.useEffect(() => {
    if (programs.length > 0 && !program) {
      setProgram(programs[0].key);
    }
  }, [programs, program]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) { setErrorMsg("נא להזין שם לתזמון."); return; }
    if (dayOfWeek === -1 && !oneTimeDate) { setErrorMsg("נא לבחור תאריך לחד-פעמי."); return; }
    if (!time) { setErrorMsg("נא לבחור שעת הפעלה."); return; }
    if (!applianceId) { setErrorMsg("לא נמצא מזהה מכשיר."); return; }

    setLoading(true);
    try {
      const ok = await onAddSchedule({
        name,
        dayOfWeek,
        oneTimeDate: dayOfWeek === -1 ? oneTimeDate : undefined,
        time,
        program,
        applianceId,
      });
      if (ok) {
        setSuccessMsg("התזמון נוסף בהצלחה!");
        setName("");
        setTime("22:00");
        setOneTimeDate("");
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "שגיאה בהוספת תזמון.");
    } finally {
      setLoading(false);
    }
  };

  const isAtLimit = pendingCount >= 50;

  return (
    <div className="bg-[#18182a] border border-[#252538] rounded-2xl p-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#e8e4f0] flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-[#c9a84c]" />
          תזמון חדש
        </h3>
        <span className="text-xs text-[#4e4e6a] font-medium tabular-nums">
          {pendingCount}<span className="text-[#2e2e48]">/50</span>
        </span>
      </div>

      {isAtLimit && (
        <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3 text-xs text-amber-300 font-medium">
          הגעת למכסה המרבית של 50 תזמונים. מחק תזמון כדי להוסיף חדש.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name */}
        <div>
          <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide">שם / תיאור</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isAtLimit || loading}
            placeholder="למשל: הדחה שישי בלילה"
            className="input-dark"
          />
        </div>

        {/* Program */}
        <div>
          <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide">תוכנית הדחה</label>
          <select
            value={program}
            onChange={e => setProgram(e.target.value)}
            disabled={isAtLimit || loading}
            className="input-dark"
          >
            {programs.map(p => (
              <option key={p.key} value={p.key}>
                {getBilingualName(p.key, p.name)} · {p.durationMin} דק׳
              </option>
            ))}
          </select>
        </div>

        {/* Day + Time */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <Calendar className="w-3 h-3" /> יום
            </label>
            <select
              value={dayOfWeek}
              onChange={e => setDayOfWeek(Number(e.target.value))}
              disabled={isAtLimit || loading}
              className="input-dark"
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
            <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3 h-3" /> שעה
            </label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              disabled={isAtLimit || loading}
              className="input-dark font-mono"
            />
          </div>
        </div>

        {/* Specific date */}
        {dayOfWeek === -1 && (
          <div className="animate-fade-in">
            <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide">תאריך</label>
            <input
              type="date"
              value={oneTimeDate}
              onChange={e => setOneTimeDate(e.target.value)}
              disabled={isAtLimit || loading}
              min={new Date().toISOString().split("T")[0]}
              className="input-dark cursor-pointer"
            />
          </div>
        )}

        {/* Messages */}
        {errorMsg && (
          <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl px-3 py-2.5 text-xs text-rose-300 font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl px-3 py-2.5 text-xs text-emerald-300 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {successMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isAtLimit || loading}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px] ${
            isAtLimit
              ? "bg-[#13131e] text-[#3a3a55] cursor-not-allowed border border-[#252538]"
              : "bg-[#c9a84c] hover:bg-[#d4b55a] active:bg-[#b89640] text-[#0b0b12] shadow-lg shadow-[#c9a84c]/15"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          {loading ? "מוסיף..." : "הוסף תזמון"}
        </button>
      </form>
    </div>
  );
};
