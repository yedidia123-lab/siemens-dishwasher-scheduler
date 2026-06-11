import React, { useState, useEffect, useCallback } from "react";
import { ScheduleItem, Appliance, AuthConfig, LogEntry } from "./types";
import { StatusWidget } from "./components/StatusWidget";
import { ScheduleForm } from "./components/ScheduleForm";
import { ScheduleList } from "./components/ScheduleList";
import { LogsPanel } from "./components/LogsPanel";
import { ConfigModal } from "./components/ConfigModal";
import { ToastContainer, ToastData, makeToast } from "./components/Toast";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ShieldCheck, CalendarRange, Clock, Settings, Sparkles, HelpCircle, Activity } from "lucide-react";

export default function App() {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [appliance, setAppliance] = useState<Appliance | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [programs, setPrograms] = useState<Array<{ key: string; name: string; durationMin: number }>>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingAppliance, setLoadingAppliance] = useState(false);
  const [activeTab, setActiveTab] = useState<"scheduler" | "config" | "logs">("scheduler");

  // Toast notifications
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const addToast = useCallback((type: ToastData["type"], message: string) => {
    setToasts((prev) => [...prev.slice(-4), makeToast(type, message)]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Confirm dialog
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const askConfirm = (message: string): Promise<boolean> =>
    new Promise((resolve) => {
      setConfirm({
        message,
        onConfirm: () => {
          setConfirm(null);
          resolve(true);
        },
      });
    });
  const cancelConfirm = () => {
    setConfirm(null);
  };

  // Developer & Debug states
  const [developerMode, setDeveloperMode] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [checkingSchedules, setCheckingSchedules] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) setConfig(await res.json());
    } catch (err) {
      console.error("Failed to fetch config:", err);
    }
  };

  const fetchAppliance = async () => {
    setLoadingAppliance(true);
    try {
      const res = await fetch("/api/appliances");
      if (res.ok) {
        const data = await res.json();
        const activeApp = data[0] || null;
        setAppliance(activeApp);
        fetchPrograms(activeApp?.haId);
      }
    } catch (err) {
      console.error("Failed to fetch appliances:", err);
    } finally {
      setLoadingAppliance(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/schedules");
      if (res.ok) setSchedules(await res.json());
    } catch (err) {
      console.error("Failed to fetch schedules:", err);
    }
  };

  const fetchPrograms = async (appId?: string) => {
    try {
      const url = appId ? `/api/programs?applianceId=${encodeURIComponent(appId)}` : "/api/programs";
      const res = await fetch(url);
      if (res.ok) setPrograms(await res.json());
    } catch (err) {
      console.error("Failed to fetch programs:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) setLogs(await res.json());
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchSchedules();
    fetchPrograms();
    fetchLogs();
    fetchAppliance();

    const interval = setInterval(() => {
      fetchAppliance();
      fetchSchedules();
      fetchLogs();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (config) fetchAppliance();
  }, [config?.useSimulator, config?.hasToken]);

  // OAuth popup postMessage listener
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const isTrusted =
        origin === window.location.origin ||
        origin.endsWith(".run.app") ||
        origin.endsWith(".railway.app") ||
        origin.endsWith(".render.com") ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".fly.dev") ||
        origin.includes("localhost") ||
        origin.includes("0.0.0.0");
      if (!isTrusted) return;

      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        fetchConfig();
        fetchAppliance();
        fetchLogs();
        addToast("success", "החיבור ל-Siemens Home Connect בוצע בהצלחה!");
      }
    };
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, []);

  const handleAddSchedule = async (newSchedule: Omit<ScheduleItem, "id" | "status">) => {
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSchedule),
      });
      if (res.ok) {
        await fetchSchedules();
        await fetchLogs();
        addToast("success", "התזמון נוסף בהצלחה!");
        return true;
      } else {
        const errorData = await res.json();
        addToast("error", errorData.error || "נכשל להוסיף תזמון.");
        return false;
      }
    } catch (err: any) {
      addToast("error", err.message);
      return false;
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    const ok = await askConfirm("האם אתה בטוח שברצונך למחוק תזמון זה?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchSchedules();
        await fetchLogs();
        addToast("info", "התזמון נמחק.");
      }
    } catch (err) {
      console.error("Failed to delete schedule:", err);
    }
  };

  const handleEditSchedule = async (id: string, updatedSchedule: any) => {
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedSchedule }),
      });
      if (res.ok) {
        await fetchSchedules();
        await fetchLogs();
        if (developerMode) fetchDebugStatus();
        addToast("success", "התזמון עודכן.");
        return true;
      } else {
        const errorData = await res.json();
        addToast("error", errorData.error || "נכשל לעדכן תזמון.");
        return false;
      }
    } catch (err: any) {
      addToast("error", err.message);
      return false;
    }
  };

  const handleTriggerCheck = async () => {
    setCheckingSchedules(true);
    try {
      const res = await fetch("/api/debug/trigger-check", { method: "POST" });
      if (res.ok) {
        await fetchSchedules();
        await fetchLogs();
        if (developerMode) await fetchDebugStatus();
        addToast("info", "בדיקת תזמונים בוצעה.");
      } else {
        const errData = await res.json();
        addToast("error", "שגיאה בבדיקת תזמונים: " + (errData.error || "שרת לא זמין"));
      }
    } catch (err: any) {
      addToast("error", "שגיאה בתקשורת עם השרת: " + err.message);
    } finally {
      setCheckingSchedules(false);
    }
  };

  const fetchDebugStatus = async () => {
    try {
      const res = await fetch("/api/debug/status");
      if (res.ok) setDebugData(await res.json());
    } catch (err) {
      console.error("Failed to fetch debug status:", err);
    }
  };

  useEffect(() => {
    if (developerMode) {
      fetchDebugStatus();
      const interval = setInterval(fetchDebugStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [developerMode]);

  const handleSimulatorAction = async (action: string) => {
    try {
      const res = await fetch("/api/simulator/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setAppliance(data.appliance);
        fetchLogs();
      }
    } catch (err) {
      console.error("Failed to run simulator action:", err);
    }
  };

  const handleUpdateConfig = async (updatedFields: Partial<AuthConfig>): Promise<boolean> => {
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        fetchLogs();
        return true;
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "נכשל לעדכן הגדרות.");
      }
    } catch (err: any) {
      throw err;
    }
  };

  const [testingConnection, setTestingConnection] = useState(false);
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch("/api/auth/test");
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchAppliance();
        await fetchLogs();
      } else {
        await fetchLogs();
        throw new Error((data.error || "שגיאה לא ידועה") + (data.advice ? " — " + data.advice : ""));
      }
    } catch (err: any) {
      throw err;
    } finally {
      setTestingConnection(false);
    }
  };

  const handleRefreshAppliances = async () => {
    await fetchAppliance();
  };

  const handleConnectOAuth = async () => {
    try {
      const res = await fetch("/api/auth/url");
      if (!res.ok) {
        const errorText = await res.json();
        addToast("error", errorText.error || "נכשל לקבל כתובת התחברות.");
        return;
      }
      const { url } = await res.json();
      const width = 600, height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const authWindow = window.open(url, "siemens_homeconnect_auth_popup", `width=${width},height=${height},top=${top},left=${left}`);
      if (!authWindow) {
        addToast("warn", "פופ-אפ ההתחברות נחסם. אפשר פופ-אפים עבור אתר זה ונסה שוב.");
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
  };

  const handleDisconnectOAuth = async () => {
    const ok = await askConfirm("האם אתה בטוח שברצונך לנתק את חשבון Siemens Home Connect?");
    if (!ok) return;
    try {
      const res = await fetch("/api/auth/disconnect", { method: "POST" });
      if (res.ok) {
        fetchConfig();
        fetchAppliance();
        fetchLogs();
        addToast("info", "החיבור ל-Home Connect נותק.");
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch("/api/logs/clear", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        addToast("info", "יומן האירועים אופס.");
      }
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  };

  // Compute next scheduled run
  const getNextSchedule = (): string | null => {
    const pending = schedules.filter((s) => s.status === "pending");
    if (pending.length === 0) return null;

    const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    const now = new Date();
    const israelTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);

    // Find nearest upcoming schedule
    let earliest: { label: string; ms: number } | null = null;
    for (const s of pending) {
      if (s.dayOfWeek === -1 && s.oneTimeDate) {
        const [h, m] = s.time.split(":").map(Number);
        const target = new Date(`${s.oneTimeDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
        const diff = target.getTime() - now.getTime();
        if (diff > 0 && (!earliest || diff < earliest.ms)) {
          earliest = { label: `${s.name} — ${s.oneTimeDate} ${s.time}`, ms: diff };
        }
      } else {
        const dayName = DAY_NAMES[s.dayOfWeek];
        if (!earliest) {
          earliest = { label: `${s.name} — כל יום ${dayName} ב-${s.time}`, ms: 0 };
        }
      }
    }
    return earliest?.label || null;
  };

  const appUrl = window.location.origin;
  const pendingSchedulesCount = schedules.filter((s) => s.status === "pending").length;
  const nextSchedule = getNextSchedule();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans" style={{ direction: "rtl" }}>

      {/* Toast layer */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={cancelConfirm}
        />
      )}

      {/* Header */}
      <header className="bg-[#005f7a] text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-wider text-white flex items-center gap-1.5 font-mono">
                SIEMENS <span className="text-xs opacity-80 font-normal mr-2">| Home Connect Scheduler</span>
              </h1>
              <p className="text-[11px] text-sky-100 opacity-90 mt-0.5">מערכת תזמון הפעלות וניטור חיישני בטיחות למדיחי כלים</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-[#004f66] p-1 rounded-lg border border-white/10">
            {(["scheduler", "config", "logs"] as const).map((tab) => {
              const labels: Record<string, { icon: React.ReactNode; label: string }> = {
                scheduler: { icon: <CalendarRange className="w-3.5 h-3.5" />, label: "לוח תזמונים" },
                config: { icon: <Settings className="w-3.5 h-3.5" />, label: "חיבור והגדרות" },
                logs: { icon: <Activity className="w-3.5 h-3.5" />, label: "יומן בטיחות" },
              };
              const { icon, label } = labels[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1.5 cursor-pointer relative ${
                    activeTab === tab ? "bg-white text-[#005f7a] shadow" : "text-sky-100 hover:text-white"
                  }`}
                >
                  {icon}
                  {label}
                  {tab === "logs" && logs.length > 0 && logs[0].level === "error" && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Status bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-slate-700 font-semibold">
              מקור: {config?.useSimulator ? "סימולטור פנימי" : "Home Connect API רשמי"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
            <span>תזמונים: <strong className="text-[#005f7a]">{pendingSchedulesCount}/7</strong></span>
            {nextSchedule && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#005f7a]" />
                הבא: <strong className="text-slate-800 mr-1">{nextSchedule}</strong>
              </span>
            )}
          </div>
        </div>

        {activeTab === "scheduler" && (
          <div className="space-y-6 animate-fade-in">
            {/* Hero banner */}
            <div className="bg-gradient-to-r from-[#005f7a] to-[#004255] text-white rounded-lg p-5 sm:p-7 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-sky-400/25 border border-sky-300/30 rounded-full text-sky-200 text-xs font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    מערכת תזמון חכמה
                  </span>
                  {config?.hasToken && !config?.useSimulator ? (
                    <span className="px-2.5 py-0.5 bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 rounded-full text-xs font-bold">חיבור API פעיל ✓</span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-amber-400/20 border border-amber-300/30 text-amber-200 rounded-full text-xs font-bold">מצב סימולטור</span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">ניהול ותזמון הפעלות מדיח Siemens</h2>
                <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed">
                  תכנן מחזורי הדחה חסכוניים בשעות תעריף חשמל מוזל. מנוע הבטיחות בודק חיישני דלת, WiFi ו-Remote Start לפני כל הפעלה.
                </p>
              </div>
              <div className="flex flex-row md:flex-col lg:flex-row items-center gap-2.5 w-full md:w-auto shrink-0">
                {!config?.hasToken && !config?.useSimulator && (
                  <button onClick={handleConnectOAuth} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all shadow-sm cursor-pointer border-0">
                    🔐 התחבר ל-Siemens
                  </button>
                )}
                <button onClick={() => setActiveTab("config")} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-md text-xs font-bold transition-all cursor-pointer">
                  ⚙️ הגדרות
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                <StatusWidget
                  appliance={appliance}
                  useSimulator={config?.useSimulator || false}
                  onSimulatorAction={handleSimulatorAction}
                  loading={loadingAppliance}
                  onRefresh={fetchAppliance}
                />
                <ScheduleForm
                  onAddSchedule={handleAddSchedule}
                  applianceId={appliance?.haId || "SIEMENS-DISHER-SIM-123"}
                  programs={programs}
                  pendingCount={pendingSchedulesCount}
                />
              </div>

              {/* Main content */}
              <div className="lg:col-span-2 space-y-6">
                <ScheduleList
                  schedules={schedules}
                  onDelete={handleDeleteSchedule}
                  onEdit={handleEditSchedule}
                  programs={programs}
                  onTriggerCheck={handleTriggerCheck}
                  checkingSchedules={checkingSchedules}
                />

                <LogsPanel logs={logs.slice(0, 5)} onClear={handleClearLogs} />

                {/* Developer portal */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded">
                        <Settings className="w-4 h-4 text-[#005f7a]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">אזור מפתחים (Developer Portal)</h4>
                        <p className="text-[10px] text-slate-500 font-semibold">מעקב אחר מנוע ה-Scheduler בזמן אמת</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeveloperMode(!developerMode)}
                      className={`px-3 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${developerMode ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    >
                      {developerMode ? "הסתר ✕" : "הצג Debug ⚙️"}
                    </button>
                  </div>

                  {developerMode && (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200/50">
                        <div>
                          <span className="block text-[10px] text-slate-500 font-bold mb-0.5">זמן שרת (UTC):</span>
                          <code className="text-xs font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {debugData?.serverTimeUtc || "—"}
                          </code>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-500 font-bold mb-0.5">שעה בישראל:</span>
                          <code className="text-xs font-mono font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-100">
                            {debugData?.israelTime?.dateStr} {debugData?.israelTime?.timeStr} ({debugData?.israelTime?.success ? "✓" : "fallback"})
                          </code>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-bold text-slate-700 text-xs">ניתוח תזמונים:</h5>
                        {schedules.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic">אין תזמונים פעילים.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {schedules.map((s) => {
                              const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
                              const statusText = s.status === "pending"
                                ? s.dayOfWeek === -1
                                  ? `ממתין ל-${s.oneTimeDate} ${s.time}`
                                  : `ממתין ליום ${days[s.dayOfWeek]} ב-${s.time}`
                                : s.status === "triggered" ? "הופעל בהצלחה"
                                : s.status === "failed" ? `נכשל: ${s.errorLog}`
                                : s.status === "missed" ? "עבר ללא הפעלה"
                                : s.status;
                              return (
                                <div key={s.id} className="p-2 border rounded bg-white flex justify-between items-center text-[11px]">
                                  <span className="font-bold text-[#005f7a]">{s.name}</span>
                                  <span className="text-slate-500">{statusText}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <h5 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#005f7a]" />
                          תוכניות מה-API:
                        </h5>
                        {programs.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic">לא התקבלו תוכניות.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                            {programs.map((p) => (
                              <div key={p.key} className="p-2 border rounded bg-white shadow-sm">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                  <span className="font-bold text-slate-800 text-[11px]">{p.name}</span>
                                  <span className="font-mono text-[9.5px] bg-[#e0f2fe] text-[#005f7a] px-1.5 py-0.5 rounded border border-sky-100 shrink-0">
                                    {p.key.split(".").pop()}
                                  </span>
                                </div>
                                <p className="text-[9.5px] text-slate-400 font-mono select-all">{p.key}</p>
                                {p.raw && (
                                  <details className="border-t border-slate-100 pt-1 mt-1">
                                    <summary className="text-[9px] text-[#005f7a] cursor-pointer hover:underline">▸ Raw JSON</summary>
                                    <pre className="mt-1 text-[8.5px] text-slate-600 bg-slate-50 p-1 rounded overflow-x-auto max-h-32">
                                      {JSON.stringify(p.raw, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Safety info */}
                <div className="bg-white border border-slate-200 p-5 rounded-lg flex items-start gap-4 shadow-sm">
                  <div className="p-3 bg-[#e0f2fe] text-[#005f7a] rounded-lg shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#005f7a] mb-2">מנגנון בטיחות — 4 שערי בקרה</h4>
                    <ul className="list-decimal text-xs text-slate-600 mr-4 space-y-1.5">
                      <li><strong>דלת סגורה:</strong> אם הדלת פתוחה — ההדחה נחסמת מיידית.</li>
                      <li><strong>Remote Start מאופשר:</strong> נדרש אישור פיזי מהמכשיר.</li>
                      <li><strong>אין תוכנית פעילה:</strong> לא יתנגש עם הדחה שכבר רצה.</li>
                      <li><strong>תוכנית נתמכת:</strong> Program Key נבדק מול ה-API לפני הפעלה.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "config" && (
          <div className="max-w-3xl mx-auto">
            <ConfigModal
              config={config}
              onUpdate={handleUpdateConfig}
              onConnect={handleConnectOAuth}
              onDisconnect={handleDisconnectOAuth}
              callbackUrl={`${appUrl}/auth/callback`}
              onTestConnection={handleTestConnection}
              testingConnection={testingConnection}
              onRefreshAppliances={handleRefreshAppliances}
              loadingAppliances={loadingAppliance}
            />
          </div>
        )}

        {activeTab === "logs" && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <LogsPanel logs={logs} onClear={handleClearLogs} />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-slate-200/50 mt-12 py-6 text-center text-xs text-slate-500">
        <p className="mb-1 font-semibold text-slate-600">מאובטח על פי תקנות Siemens ו-Home Connect SDK</p>
        <p className="max-w-md mx-auto text-[11px] text-slate-400 leading-relaxed">
          Client Secret נשמר בשרת בלבד. תקשורת מוצפנת מול שרתי BSH Group.
        </p>
      </footer>
    </div>
  );
}
