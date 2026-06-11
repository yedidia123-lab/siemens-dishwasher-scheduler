import React, { useState } from "react";
import { ScheduleItem } from "../types";
import { PlusCircle, Calendar, Clock, Sparkles } from "lucide-react";

interface ScheduleFormProps {
  onAddSchedule: (schedule: Omit<ScheduleItem, "id" | "status">) => Promise<boolean>;
  applianceId: string;
  programs: Array<{ key: string; name: string; durationMin: number }>;
  pendingCount: number;
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  onAddSchedule,
  applianceId,
  programs,
  pendingCount,
}) => {
  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Default to Monday
  const [oneTimeDate, setOneTimeDate] = useState("");
  const [time, setTime] = useState("");
  const [program, setProgram] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Set initial selected option dynamically once programs list is fetched
  React.useEffect(() => {
    if (programs.length > 0 && !program) {
      setProgram(programs[0].key);
    }
  }, [programs, program]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("נא להזין שם או תיאור לתזמון.");
      return;
    }
    if (dayOfWeek === -1 && !oneTimeDate) {
      setErrorMsg("נא לבחור תאריך עבור הפעלה חד-פעמית.");
      return;
    }
    if (!time) {
      setErrorMsg("נא לבחור שעת הפעלה.");
      return;
    }
    if (!applianceId) {
      setErrorMsg("שגיאה קריטית: לא נבחר מזהה מכשיר מדיח להפעלה.");
      return;
    }

    setLoading(true);
    try {
      const success = await onAddSchedule({
        name,
        dayOfWeek,
        oneTimeDate: dayOfWeek === -1 ? oneTimeDate : undefined,
        time,
        program,
        applianceId,
      });

      if (success) {
        setSuccessMsg("התזמון נוסף בהצלחה!");
        setName("");
        setTime("");
        setOneTimeDate("");
        // Reset after 3 seconds
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "נכשל לרשום תזמון חדש במכונה.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="schedule-form" className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm relative animate-fade-in font-sans">
      <h3 className="text-md font-bold text-[#005f7a] mb-4 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-[#005f7a]" />
        הגדרת הפעלה מתוזמנת חדשה
        <span className="text-xs font-normal text-slate-500 mr-auto">
          ({pendingCount}/50 ממתינים)
        </span>
      </h3>

      {/* Warning if max exceeded */}
      {pendingCount >= 50 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mb-4 leading-relaxed">
          ⚠️ הגעת למכסה המרבית של 50 תזמונים ממתינים. מחק תזמון קיים כדי לפנות מקום.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 font-sans">
        
        {/* Schedule name */}
        <div>
          <label className="block text-xs text-slate-600 font-bold mb-1.5">שם / תיאור ההפעלה:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pendingCount >= 50 || loading}
            placeholder="למשל: הדחה יומית אחרי ארוחת ערב"
            className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-3.5 py-2 text-sm text-slate-800 outline-none transition-all font-semibold"
          />
        </div>

        {/* Program selection */}
        <div>
          <label className="block text-xs text-slate-600 font-bold mb-1.5">בחירת תוכנית הדחה:</label>
          <select
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            disabled={pendingCount >= 50 || loading}
            className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-3.5 py-2 text-sm text-slate-800 outline-none transition-all font-semibold cursor-pointer"
          >
            {programs.map((prog) => (
              <option key={prog.key} value={prog.key}>
                {prog.name} (משך: כ-{prog.durationMin} דקות)
              </option>
            ))}
          </select>
        </div>

        {/* Day selection */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-600 font-bold mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" /> תדירות / יום בשבוע:
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              disabled={pendingCount >= 50 || loading}
              className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-3.5 py-2 text-sm text-slate-800 outline-none transition-all font-semibold cursor-pointer"
            >
              <option value={1}>כל יום שני</option>
              <option value={2}>כל יום שלישי</option>
              <option value={3}>כל יום רביעי</option>
              <option value={4}>כל יום חמישי</option>
              <option value={5}>כל יום שישי</option>
              <option value={6}>כל יום שבת</option>
              <option value={0}>כל יום ראשון</option>
              <option value={-1}>חד-פעמי (תאריך ספציפי)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-600 font-bold mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" /> שעת הפעלה:
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={pendingCount >= 50 || loading}
              className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-3.5 py-2 text-sm text-slate-800 outline-none transition-all font-mono font-bold"
            />
          </div>
        </div>

        {/* Specific Date Picker if One-Time is chosen */}
        {dayOfWeek === -1 && (
          <div className="animate-fade-in font-sans">
            <label className="block text-xs text-slate-600 font-bold mb-1.5">בחר תאריך יעד מדויק:</label>
            <input
              type="date"
              value={oneTimeDate}
              onChange={(e) => setOneTimeDate(e.target.value)}
              disabled={pendingCount >= 50 || loading}
              min={new Date().toISOString().split("T")[0]}
              className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-3.5 py-2 text-sm text-slate-800 outline-none transition-all font-semibold cursor-pointer"
            />
          </div>
        )}

        {errorMsg && (
          <p className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 p-2.5 rounded">
            {errorMsg}
          </p>
        )}

        {successMsg && (
          <p className="text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 p-2.5 rounded flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            {successMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={pendingCount >= 50 || loading}
          className={`w-full py-2.5 rounded text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
            pendingCount >= 50
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-[#005f7a] hover:bg-[#00465a] text-white"
          }`}
        >
          {loading ? "רושם תזמון..." : "הוסף תזמון לשרת"}
        </button>
      </form>
    </div>
  );
};
