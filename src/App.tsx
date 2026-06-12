import React, { useState, useEffect, useCallback } from "react";
import { ScheduleItem, Appliance, AuthConfig, LogEntry } from "./types";
import { StatusWidget } from "./components/StatusWidget";
import { ScheduleForm } from "./components/ScheduleForm";
import { ScheduleList } from "./components/ScheduleList";
import { LogsPanel } from "./components/LogsPanel";
import { ConfigModal } from "./components/ConfigModal";
import { ToastContainer, ToastData, makeToast } from "./components/Toast";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ShieldCheck, CalendarRange, Clock, Settings, Sparkles, HelpCircle, Activity, Waves, Loader2 } from "lucide-react";

export default function App() {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [appliance, setAppliance] = useState<Appliance | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [programs, setPrograms] = useState<Array<{ key: string; name: string; durationMin: number }>>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingAppliance, setLoadingAppliance] = useState(false);
  const initialApplianceLoad = React.useRef(true);
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

  const fetchAppliance = async (showLoading = false) => {
    if (showLoading) setLoadingAppliance(true);
    try {
      const res = await fetch("/api/appliances");
      if (res.ok) {
        const data = await res.json();
        const activeApp = data[0] || null;
        setAppliance(activeApp);
        if (initialApplianceLoad.current) {
          fetchPrograms(activeApp?.haId);
          initialApplianceLoad.current = false;
        }
      }
    } catch (err) {
      console.error("Failed to fetch appliances:", err);
    } finally {
      if (showLoading) setLoadingAppliance(false);
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
    fetchAppliance(true);

    const interval = setInterval(() => {
      fetchAppliance(false);
      fetchSchedules();
      fetchLogs();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (config) fetchAppliance(true);
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
    await fetchAppliance(true);
  };

  const handleStopProgram = async () => {
    const haId = appliance?.haId;
    if (!haId) return;
    const ok = await askConfirm("האם לעצור את הפעולה הנוכחית של המדיח? הפעולה תישלח ל-Home Connect API.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/appliances/${encodeURIComponent(haId)}/stop`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        addToast("success", data.message || "נשלחה בקשת עצירה");
        await fetchAppliance(false);
        await fetchLogs();
      } else {
        const debugInfo = data.debug ? ` (${data.debug.slice(0, 80)})` : "";
        addToast("error", `העצירה נכשלה: HTTP ${data.httpStatus || res.status}${debugInfo}`);
      }
    } catch (err: any) {
      addToast("error", "שגיאת תקשורת בעת עצירה: " + err.message);
    }
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

  const tabs = [
    { id: "scheduler" as const, icon: <CalendarRange className="w-5 h-5" />, label: "תזמונים" },
    { id: "config" as const, icon: <Settings className="w-5 h-5" />, label: "הגדרות" },
    { id: "logs" as const, icon: <Activity className="w-5 h-5" />, label: "יומן" },
  ];
  const hasLogError = logs.length > 0 && logs[0].level === "error";

  return (
    <div className="min-h-screen bg-[#0b0b12] text-[#e8e4f0] font-sans" style={{ direction: "rtl" }}>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {confirm && (
        <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={cancelConfirm} />
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#090910]/98 backdrop-blur-md border-b border-[#1e1e2e]">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#c9a84c]/35 to-transparent" />
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#c9a84c]/12 border border-[#c9a84c]/25 rounded-xl flex items-center justify-center shrink-0">
              <Waves className="w-4 h-4 text-[#c9a84c]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#e8e4f0] leading-none tracking-wide">ShabbatDish</p>
              <p className="text-[10px] text-[#4e4e6a] leading-none mt-0.5">
                {config?.useSimulator ? "סימולטור" : "Home Connect API"}
              </p>
            </div>
          </div>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#13131e] border border-[#252538] rounded-xl p-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`relative px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 min-h-[34px] ${
                  activeTab === t.id ? "bg-[#c9a84c] text-[#0b0b12] font-bold shadow-sm" : "text-[#6e6e8a] hover:text-[#e8e4f0] hover:bg-[#1e1e30]"
                }`}>
                {t.id === "logs" && hasLogError && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                )}
                {React.cloneElement(t.icon as React.ReactElement, { className: "w-3.5 h-3.5" })}
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${config?.hasToken || config?.useSimulator ? "bg-emerald-400" : "bg-amber-400"}`} />
            {!config?.hasToken && !config?.useSimulator && (
              <button onClick={handleConnectOAuth}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a84c] hover:bg-[#d4b55a] text-[#0b0b12] rounded-xl text-xs font-bold transition-colors cursor-pointer">
                התחבר
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-5 pb-28 md:pb-8">
        {/* Status strip */}
        <div className="flex items-center justify-between bg-[#13131e] border border-[#252538] rounded-2xl px-4 py-2.5 mb-5 text-xs">
          <div className="flex items-center gap-3 text-[#6e6e8a]">
            <span>תזמונים: <strong className="text-[#c9a84c]">{pendingSchedulesCount}/50</strong></span>
            {nextSchedule && (
              <span className="hidden sm:flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#c9a84c]/60" />
                <strong className="text-[#a0a0bc]">{nextSchedule}</strong>
              </span>
            )}
          </div>
          {config?.hasToken && !config?.useSimulator ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />API חי
            </span>
          ) : (
            <span className="text-amber-400 font-semibold">סימולטור</span>
          )}
        </div>

        {/* ── Scheduler tab ── */}
        {activeTab === "scheduler" && (
          <div className="space-y-4 animate-fade-in">
            {!config?.hasToken && !config?.useSimulator && (
              <div className="bg-[#1a1410] border border-[#c9a84c]/25 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#e8ddc0]">לא מחובר ל-Home Connect</p>
                  <p className="text-xs text-[#6e6e8a] mt-0.5">חבר חשבון כדי לשלוט במדיח האמיתי</p>
                </div>
                <button onClick={handleConnectOAuth}
                  className="px-4 py-2.5 bg-[#c9a84c] hover:bg-[#d4b55a] text-[#0b0b12] rounded-xl text-sm font-bold transition-colors cursor-pointer shrink-0 min-h-[44px]">
                  התחבר
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Sidebar */}
              <div className="lg:col-span-2 space-y-4">
                <StatusWidget
                  appliance={appliance}
                  useSimulator={config?.useSimulator || false}
                  onSimulatorAction={handleSimulatorAction}
                  loading={loadingAppliance}
                  onRefresh={() => fetchAppliance(true)}
                  onStop={handleStopProgram}
                />
                <ScheduleForm
                  onAddSchedule={handleAddSchedule}
                  applianceId={appliance?.haId || "SIEMENS-DISHER-SIM-123"}
                  programs={programs}
                  pendingCount={pendingSchedulesCount}
                />
              </div>

              {/* Main panel */}
              <div className="lg:col-span-3 space-y-4">
                <ScheduleList
                  schedules={schedules}
                  onDelete={handleDeleteSchedule}
                  onEdit={handleEditSchedule}
                  programs={programs}
                  onTriggerCheck={handleTriggerCheck}
                  checkingSchedules={checkingSchedules}
                />

                {/* Recent logs preview */}
                {logs.length > 0 && (
                  <div className="bg-[#18182a] border border-[#252538] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-[#6e6e8a] uppercase tracking-wide flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />אירועים אחרונים
                      </h4>
                      <button onClick={() => setActiveTab("logs")}
                        className="text-xs text-[#c9a84c] hover:text-[#d4b55a] cursor-pointer font-semibold">הצג הכל</button>
                    </div>
                    <div className="space-y-1.5">
                      {logs.slice(0, 3).map((log, i) => (
                        <div key={i} className={`flex items-start gap-2 text-xs px-2.5 py-1.5 rounded-xl ${
                          log.level === "error" ? "bg-rose-950/40 text-rose-300" :
                          log.level === "warn"  ? "bg-amber-950/40 text-amber-300" :
                          "bg-[#13131e] text-[#6e6e8a]"
                        }`}>
                          <span className="text-[10px] text-[#3a3a55] shrink-0 font-mono mt-0.5">
                            {new Date(log.timestamp).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="leading-snug">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safety gates */}
                <div className="bg-[#18182a] border border-[#252538] rounded-2xl p-4">
                  <h4 className="text-xs font-semibold text-[#6e6e8a] uppercase tracking-wide flex items-center gap-1.5 mb-3">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#c9a84c]/70" />4 שערי בטיחות לפני כל הפעלה
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[["דלת סגורה","חיישן דלת"],["Remote Start","אישור מהמכשיר"],["אין תוכנית פעילה","ללא התנגשות"],["תוכנית נתמכת","API validation"]].map(([h,d]) => (
                      <div key={h} className="bg-[#0d0d18] rounded-xl p-2.5 border border-[#252538]">
                        <p className="font-semibold text-emerald-400 text-[11px]">{h}</p>
                        <p className="text-[#3a3a55] text-[10px] mt-0.5">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Developer area — collapsible */}
                <details className="group bg-[#13131e] border border-[#252538] rounded-2xl overflow-hidden">
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-xs font-semibold text-[#4e4e6a] hover:text-[#6e6e8a] transition-colors list-none">
                    <span className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" />אזור מפתחים</span>
                    <span className="group-open:rotate-180 transition-transform text-[#3a3a55]">▾</span>
                  </summary>
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#252538]">
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => { setDeveloperMode(!developerMode); if (!developerMode) fetchDebugStatus(); }}
                        className={`px-3 py-1.5 text-xs rounded-xl font-semibold cursor-pointer transition-all border ${
                          developerMode ? "bg-[#18182a] text-[#e8e4f0] border-[#252538]" : "bg-transparent text-[#4e4e6a] border-[#252538] hover:bg-[#18182a]"
                        }`}>
                        {developerMode ? "הסתר Debug" : "הצג Debug"}
                      </button>
                    </div>
                    {developerMode && (
                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2 bg-[#0d0d18] p-3 rounded-xl">
                          <div>
                            <p className="text-[10px] text-[#3a3a55] mb-1">שרת UTC</p>
                            <code className="text-[#a0a0bc] font-mono text-[11px]">{debugData?.serverTimeUtc || "—"}</code>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#3a3a55] mb-1">ישראל</p>
                            <code className="text-emerald-400 font-mono text-[11px]">
                              {debugData?.israelTime?.timeStr || "—"} {debugData?.israelTime?.success ? "✓" : ""}
                            </code>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {schedules.map(s => {
                            const days = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
                            const t = s.status === "pending"
                              ? s.dayOfWeek === -1 ? `ממתין ל-${s.oneTimeDate} ${s.time}` : `ממתין ליום ${days[s.dayOfWeek]} ${s.time}`
                              : s.status;
                            return (
                              <div key={s.id} className="flex justify-between items-center px-2 py-1.5 bg-[#0d0d18] rounded-lg text-[11px]">
                                <span className="text-[#c9a84c] font-semibold">{s.name}</span>
                                <span className="text-[#4e4e6a]">{t}</span>
                              </div>
                            );
                          })}
                        </div>
                        {programs.length > 0 && (
                          <div>
                            <p className="text-[10px] text-[#3a3a55] mb-1.5">תוכניות API</p>
                            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                              {programs.map(p => (
                                <div key={p.key} className="bg-[#0d0d18] rounded-lg p-2">
                                  <p className="text-[11px] text-[#a0a0bc] font-semibold">{p.name}</p>
                                  <p className="text-[9px] text-[#4e4e6a] font-mono mt-0.5">{p.key.split(".").pop()}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* ── Config tab ── */}
        {activeTab === "config" && (
          <div className="max-w-2xl mx-auto animate-fade-in">
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

        {/* ── Logs tab ── */}
        {activeTab === "logs" && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <LogsPanel logs={logs} onClear={handleClearLogs} />
          </div>
        )}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 inset-x-0 md:hidden z-40 bg-[#090910]/98 backdrop-blur-md border-t border-[#1e1e2e] pb-safe">
        <div className="flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 relative flex flex-col items-center pt-2.5 pb-3 gap-1 text-[11px] font-semibold transition-colors cursor-pointer min-h-[56px] ${
                activeTab === t.id ? "text-[#c9a84c]" : "text-[#3a3a55] hover:text-[#6e6e8a]"
              }`}>
              {t.id === "logs" && hasLogError && (
                <span className="absolute top-2 right-1/2 -translate-x-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
              )}
              {t.icon}
              {t.label}
              {activeTab === t.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#c9a84c] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <footer className="hidden md:block border-t border-[#1a1a28] py-4 text-center text-[11px] text-[#2e2e48]">
        ShabbatDish · Client Secret בשרת בלבד · תקשורת מוצפנת עם BSH Group
      </footer>
    </div>
  );
}
