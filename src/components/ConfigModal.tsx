import React, { useState, useEffect } from "react";
import { AuthConfig } from "../types";
import {
  Settings,
  Info,
  Copy,
  ShieldAlert,
  Key,
  Link2,
  LogOut,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";

interface ConfigModalProps {
  config: AuthConfig | null;
  onUpdate: (data: Partial<AuthConfig>) => Promise<boolean>;
  onConnect: () => void;
  onDisconnect: () => void;
  callbackUrl: string;
  onTestConnection: () => Promise<void>;
  testingConnection: boolean;
  onRefreshAppliances: () => Promise<void>;
  loadingAppliances: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  config,
  onUpdate,
  onConnect,
  onDisconnect,
  callbackUrl,
  onTestConnection,
  testingConnection,
  onRefreshAppliances,
  loadingAppliances,
}) => {
  const [clientId, setClientId] = useState(config?.clientId || "");
  const [clientSecret, setClientSecret] = useState(config?.clientSecret || "");
  const [liveApiUrl, setLiveApiUrl] = useState(config?.liveApiUrl || "https://api.home-connect.com");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [debugStatus, setDebugStatus] = useState<any>(null);

  useEffect(() => {
    if (config) {
      setClientId(config.clientId || "");
      setClientSecret(config.clientSecret || "");
      setLiveApiUrl(config.liveApiUrl || "https://api.home-connect.com");
    }
  }, [config]);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch("/api/debug/status");
      if (res.ok) setDebugStatus(await res.json());
    } catch (e) {
      console.error("Failed to query live diagnostics inside settings:", e);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const success = await onUpdate({ clientId, clientSecret: clientSecret || undefined, liveApiUrl });
      if (success) {
        setBanner({ type: "success", message: "הגדרות נשמרו בהצלחה בשרת המאובטח." });
        fetchDiagnostics();
      }
    } catch (err: any) {
      setBanner({ type: "error", message: "נכשל לשמור: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const runTestConnection = async () => {
    setBanner(null);
    try {
      await onTestConnection();
      setBanner({ type: "success", message: "בדיקת החיבור הצליחה!" });
      fetchDiagnostics();
    } catch (err: any) {
      setBanner({ type: "error", message: "בדיקת החיבור נכשלה: " + err.message });
    }
  };

  const runRefreshDevices = async () => {
    setBanner(null);
    try {
      await onRefreshAppliances();
      setBanner({ type: "success", message: "רשימת המדיחים עודכנה בהצלחה." });
      fetchDiagnostics();
    } catch (err: any) {
      setBanner({ type: "error", message: "עדכון המדיחים נכשל: " + err.message });
    }
  };

  if (!config) return null;

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">

      {/* Banner */}
      {banner && (
        <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
          banner.type === "success"
            ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-300"
            : "bg-rose-950/30 border-rose-900/50 text-rose-300"
        }`}>
          {banner.type === "success"
            ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
          <span>{banner.message}</span>
        </div>
      )}

      {/* Simulator Toggle */}
      <div className="bg-[#18182a] border border-[#252538] rounded-2xl p-4 flex items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-[#e8e4f0] mb-0.5">מצב סימולטור</h4>
          <p className="text-xs text-[#4e4e6a] leading-relaxed max-w-xs">
            מאפשר בדיקה מלאה ללא מפתחות API אמיתיים.
          </p>
        </div>
        <button
          onClick={() => onUpdate({ useSimulator: !config.useSimulator })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
            config.useSimulator ? "bg-[#c9a84c]" : "bg-[#252538]"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              config.useSimulator ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Live API warning */}
      {!config.useSimulator && (
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3.5 text-xs leading-relaxed flex items-start gap-2.5 text-amber-300/80">
          <Info className="w-4 h-4 text-amber-500/70 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-amber-200">חיבור API רשמי פעיל.</span>{" "}
            יש להזין Client ID ו-Secret מפורטל המפתחים של Home Connect ולהגדיר את ה-Redirect URL.
          </div>
        </div>
      )}

      {/* Credentials form */}
      <div className="bg-[#18182a] border border-[#252538] rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#e8e4f0] flex items-center gap-2">
          <Key className="w-4 h-4 text-[#c9a84c]" />
          הגדרות חיבור
        </h3>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <Key className="w-3 h-3" /> Client ID
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="הזן מזהה לקוח (Client ID)"
              className="input-dark font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Key className="w-3 h-3" /> Client Secret
              </span>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-[10px] text-[#4e4e6a] hover:text-[#8b8aa0] font-medium flex items-center gap-0.5 cursor-pointer transition-colors"
              >
                {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showSecret ? "הסתר" : "הצג"}
              </button>
            </label>
            <input
              type={showSecret ? "text" : "password"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={config.clientId ? "••••••••••••••••" : "הזן מפתח לקוח"}
              className="input-dark font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#6e6e8a] font-semibold mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <Link2 className="w-3 h-3" /> שרת API
            </label>
            <select
              value={liveApiUrl}
              onChange={(e) => setLiveApiUrl(e.target.value)}
              className="input-dark cursor-pointer"
            >
              <option value="https://api.home-connect.com">Production (api.home-connect.com)</option>
              <option value="https://simulator.home-connect.com">Sandbox (simulator.home-connect.com)</option>
            </select>
          </div>

          {/* Callback URL */}
          <div className="bg-[#0d0d18] border border-[#1e1e2e] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#6e6e8a] font-semibold uppercase tracking-wide">Redirect URL</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] px-2.5 py-1 bg-[#18182a] hover:bg-[#1e1e30] text-[#6e6e8a] border border-[#252538] rounded-lg transition-colors cursor-pointer font-medium"
              >
                <Copy className="w-3 h-3 text-[#c9a84c]" />
                {copied ? "הועתק!" : "העתק"}
              </button>
            </div>
            <div className="font-mono text-xs text-[#c9a84c]/80 break-all select-all">{callbackUrl}</div>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#c9a84c] hover:bg-[#d4b55a] disabled:opacity-50 text-[#0b0b12] font-semibold text-sm transition-colors cursor-pointer shadow-lg shadow-[#c9a84c]/15 min-h-[44px]"
            >
              {saving ? "שומר..." : "שמור הגדרות"}
            </button>

            {!config.useSimulator && (
              <>
                {config.hasToken ? (
                  <div className="flex items-center gap-2.5 mr-auto">
                    <span className="text-xs text-emerald-300 font-medium bg-emerald-950/30 border border-emerald-900/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-pulse-green" />
                      מחובר
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onDisconnect();
                        setBanner({ type: "success", message: "החיבור נותק בהצלחה." });
                      }}
                      className="p-2 bg-[#13131e] hover:bg-rose-950/40 border border-[#252538] hover:border-rose-900/50 text-[#6e6e8a] hover:text-rose-400 rounded-xl transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="נתק"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onConnect}
                    className="px-5 py-2.5 mr-auto rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors cursor-pointer shadow-lg shadow-emerald-950/40 min-h-[44px]"
                  >
                    התחבר לחשבון Home Connect
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </div>

      {/* Diagnostics */}
      <div className="bg-[#18182a] border border-[#252538] rounded-2xl overflow-hidden">
        <div className="border-b border-[#252538] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#c9a84c]" />
            <h4 className="text-xs font-semibold text-[#e8e4f0]">אבחון בזמן אמת</h4>
          </div>
          <span className="text-[9px] bg-[#c9a84c]/10 text-[#c9a84c]/70 border border-[#c9a84c]/20 px-2 py-0.5 rounded-full font-semibold animate-pulse">
            LIVE
          </span>
        </div>

        <div className="p-4 space-y-3">
          {/* Status grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0d0d18] rounded-xl p-3 border border-[#1e1e2e]">
              <span className="text-[10px] text-[#4e4e6a] font-semibold block mb-1 uppercase tracking-wide">מפתחות</span>
              {debugStatus?.credentialsStatus?.hasClientId && debugStatus?.credentialsStatus?.hasClientSecret ? (
                <span className="text-emerald-300 font-medium text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />מוגדרים
                </span>
              ) : (
                <span className="text-amber-300 font-medium text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />חסרים
                </span>
              )}
            </div>

            <div className="bg-[#0d0d18] rounded-xl p-3 border border-[#1e1e2e]">
              <span className="text-[10px] text-[#4e4e6a] font-semibold block mb-1 uppercase tracking-wide">OAuth</span>
              {debugStatus?.config?.useSimulator ? (
                <span className="text-[#6e6e8a] font-medium text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3e3e58]" />סימולטור
                </span>
              ) : debugStatus?.tokenStatus?.hasToken && !debugStatus?.tokenStatus?.tokenExpired ? (
                <span className="text-emerald-300 font-medium text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-pulse-green" />פעיל
                </span>
              ) : (
                <span className="text-rose-300 font-medium text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />לא מחובר
                </span>
              )}
            </div>

            <div className="bg-[#0d0d18] rounded-xl p-3 border border-[#1e1e2e]">
              <span className="text-[10px] text-[#4e4e6a] font-semibold block mb-1 uppercase tracking-wide">Token</span>
              {debugStatus?.config?.useSimulator ? (
                <span className="text-[#4e4e6a] font-medium text-xs">—</span>
              ) : debugStatus?.tokenStatus?.hasAccessToken ? (
                <span className="text-emerald-300 font-medium text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />קיים
                </span>
              ) : (
                <span className="text-[#4e4e6a] font-medium text-xs">אין</span>
              )}
            </div>
          </div>

          {/* Last API error */}
          {!debugStatus?.config?.useSimulator && debugStatus?.lastApiError && debugStatus.lastApiError !== "אין שגיאות API רשומות." && (
            <div className="bg-rose-950/25 border border-rose-900/40 rounded-xl p-3">
              <span className="text-[10px] text-[#4e4e6a] font-semibold block mb-1 uppercase tracking-wide">שגיאת API אחרונה</span>
              <p className="font-mono text-xs text-rose-300/80 select-all break-words leading-relaxed max-h-20 overflow-y-auto">
                {debugStatus.lastApiError}
              </p>
              {debugStatus.lastApiError.includes("429") && (
                <p className="text-[10px] text-amber-400/70 mt-1.5 font-medium">
                  Rate-limit: המערכת משתמשת במטמון עד שהמגבלה תוסר.
                </p>
              )}
              {debugStatus.lastApiError.includes("401") && (
                <p className="text-[10px] text-rose-400/70 mt-1.5 font-medium">
                  Token פג תוקף — בצע התחברות מחדש.
                </p>
              )}
            </div>
          )}

          {/* Appliances */}
          <div className="border-t border-[#1e1e2e] pt-3">
            <h5 className="font-semibold text-[#6e6e8a] flex items-center gap-1.5 text-xs mb-2 uppercase tracking-wide">
              <Smartphone className="w-3.5 h-3.5 text-[#c9a84c]" />
              מדיחים מחוברים
            </h5>
            {(!debugStatus?.lastFetchedAppliances || debugStatus.lastFetchedAppliances.length === 0) ? (
              <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-3 text-xs text-amber-300/70 leading-relaxed font-medium">
                לא נמצאו מדיחים. ודא שהמדיח מחובר ב-Home Connect ומשויך לחשבון.
              </div>
            ) : (
              <div className="space-y-2">
                {debugStatus.lastFetchedAppliances.map((app: any) => (
                  <div key={app.haId} className="p-3 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#e8e4f0] text-sm">{app.name}</span>
                        <span className="text-[9px] bg-[#18182a] rounded px-1.5 py-0.5 font-mono text-[#4e4e6a] select-all border border-[#252538]">
                          {app.haId}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#4e4e6a] mt-0.5 font-medium">
                        {app.brand} · {app.operationState || "Ready"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-lg font-semibold border ${
                        app.doorState === "Closed"
                          ? "bg-emerald-950/30 text-emerald-300 border-emerald-900/40"
                          : "bg-rose-950/30 text-rose-300 border-rose-900/40"
                      }`}>
                        דלת {app.doorState === "Closed" ? "סגורה" : "פתוחה"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg font-semibold border ${
                        app.remoteStartAllowed
                          ? "bg-emerald-950/30 text-emerald-300 border-emerald-900/40"
                          : "bg-amber-950/30 text-amber-300 border-amber-900/40"
                      }`}>
                        Remote {app.remoteStartAllowed ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Programs */}
          {debugStatus?.lastFetchedPrograms?.length > 0 && (
            <div className="border-t border-[#1e1e2e] pt-3">
              <h5 className="font-semibold text-[#6e6e8a] flex items-center gap-1.5 text-xs mb-2 uppercase tracking-wide">
                <Layers className="w-3.5 h-3.5 text-[#c9a84c]" />
                תוכניות הדחה
              </h5>
              <div className="grid grid-cols-2 gap-1.5">
                {debugStatus.lastFetchedPrograms.map((p: any) => (
                  <div key={p.key || p.name} className="py-2 px-3 bg-[#0d0d18] border border-[#1e1e2e] rounded-xl">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-medium text-[#ccc8dc] text-[11px]">{p.name}</span>
                      <span className="text-[9px] text-[#4e4e6a] font-mono shrink-0">{p.durationMin}′</span>
                    </div>
                    <code className="text-[9px] text-[#3a3a55] select-all font-mono block mt-0.5 truncate">{p.key}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test buttons */}
          <div className="border-t border-[#1e1e2e] pt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runTestConnection}
              disabled={testingConnection}
              className="px-4 py-2 bg-[#c9a84c]/15 hover:bg-[#c9a84c]/25 disabled:opacity-50 text-[#c9a84c] border border-[#c9a84c]/25 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 min-h-[36px]"
            >
              {testingConnection ? "בודק..." : "בדוק חיבור API"}
            </button>
            <button
              type="button"
              onClick={runRefreshDevices}
              disabled={loadingAppliances}
              className="px-4 py-2 bg-emerald-950/30 hover:bg-emerald-950/50 disabled:opacity-50 text-emerald-300 border border-emerald-900/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 min-h-[36px]"
            >
              {loadingAppliances ? "טוען..." : "טען מדיחים"}
            </button>
          </div>
        </div>
      </div>

      {/* Safety disclaimer */}
      <div className="bg-[#18182a] border border-[#252538] rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-[#6e6e8a] font-semibold text-xs uppercase tracking-wide">
          <ShieldAlert className="w-4 h-4 text-amber-500/60 shrink-0" />
          אזהרת בטיחות
        </div>
        <ul className="text-[11px] text-[#4e4e6a] leading-relaxed space-y-1 font-medium list-disc mr-4">
          <li>חסימת הפעלה בדלת פתוחה מיושמת ברמת השרת ובחומרת המדיח.</li>
          <li>הרשאת Remote Start מתבטלת אוטומטית בפתיחת הדלת.</li>
          <li>האפליקציה בודקת תנאי בטיחות בכל שלב של ה-Scheduler.</li>
        </ul>
      </div>
    </div>
  );
};
