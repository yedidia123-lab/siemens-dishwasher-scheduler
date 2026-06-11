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
  RefreshCw, 
  Smartphone, 
  Layers, 
  Eye, 
  EyeOff 
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
  
  // Local notification banners
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Diagnostic states
  const [debugStatus, setDebugStatus] = useState<any>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);

  // Load and sync settings from prop
  useEffect(() => {
    if (config) {
      setClientId(config.clientId || "");
      setClientSecret(config.clientSecret || "");
      setLiveApiUrl(config.liveApiUrl || "https://api.home-connect.com");
    }
  }, [config]);

  // Continuously poll debug details from server to keep track of connection status live
  const fetchDiagnostics = async () => {
    try {
      const res = await fetch("/api/debug/status");
      if (res.ok) {
        const data = await res.json();
        setDebugStatus(data);
      }
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
      const success = await onUpdate({
        clientId,
        clientSecret: clientSecret || undefined,
        liveApiUrl,
      });
      if (success) {
        setBanner({ type: "success", message: "הגדרות ההתחברות ומפתחות ה-API נשמרו בהצלחה בשרת המאובטח!" });
        fetchDiagnostics();
      }
    } catch (err: any) {
      setBanner({ type: "error", message: "נכשל לשמור את ההגדרות: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const runTestConnection = async () => {
    setBanner(null);
    try {
      await onTestConnection();
      setBanner({ type: "success", message: "בדיקת החיבור בוצעה בהצלחה!" });
      fetchDiagnostics();
    } catch (err: any) {
      setBanner({ type: "error", message: "בדיקת החיבור נכשלה: " + err.message });
    }
  };

  const runRefreshDevices = async () => {
    setBanner(null);
    try {
      await onRefreshAppliances();
      setBanner({ type: "success", message: "רשימת המדיחים עודכנה בהצלחה משרתי Siemens API!" });
      fetchDiagnostics();
    } catch (err: any) {
      setBanner({ type: "error", message: "עדכון המדיחים נכשל: " + err.message });
    }
  };

  if (!config) return null;

  return (
    <div id="config-panel" className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6 font-sans animate-fade-in text-right" dir="rtl">
      
      {/* Settings Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="p-2 bg-slate-100 text-[#005f7a] rounded-lg">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#005f7a]">הגדרות חיבור ל-Home Connect</h3>
          <p className="text-[11px] text-slate-500 font-semibold">אבטח ונהל מפתחות API, קישוריות למכונה ונתוני סימולציה</p>
        </div>
      </div>

      {/* Inline success or error banners */}
      {banner && (
        <div className={`p-4 rounded border text-xs leading-relaxed flex items-start gap-2.5 font-bold transition-all ${
          banner.type === "success" 
            ? "bg-emerald-50 border-emerald-250 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {banner.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{banner.message}</span>
        </div>
      )}

      {/* Simulator Switch */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-800 mb-1">פעל במצב סימולטור (Simulator Mode)</h4>
          <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed font-semibold">
            מאפשר להתנסות מיידית במערכת בדיקות הבטיחות, התזמון וההפעלות ללא הגדרת מפתחות אמיתיים ובצורה בטוחה לגמרי. היא מעולה לפיתוח ובדיקה.
          </p>
        </div>
        <div className="mr-4">
          <button
            onClick={() => onUpdate({ useSimulator: !config.useSimulator })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-hidden ${
              config.useSimulator ? "bg-[#005f7a]" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ${
                config.useSimulator ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Warn if live and without credentials */}
      {!config.useSimulator && (
        <div className="bg-amber-50 border border-amber-200 text-amber-850 p-3.5 rounded text-xs leading-relaxed flex items-start gap-2 font-bold">
          <Info className="w-4 h-4 text-amber-650 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-amber-900">חיבור API רשמי פעיל:</span>
            <p className="mt-1 font-semibold text-amber-800">
              יש להזין Client ID ו-Secret מאזור המפתחים של Siemens Home Connect, להזין את ה-Redirect URL בממשק שלהם, ולבצע התחברות לחשבון להלן.
            </p>
          </div>
        </div>
      )}

      {/* Integration details form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-600 font-bold mb-1.5 flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-[#005f7a]" /> Client ID:
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="הזן מזהה לקוח (Client ID)"
              className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-3.5 py-2 text-sm text-slate-800 outline-hidden font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 font-bold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-[#005f7a]" /> Client Secret:
              </span>
              <button 
                type="button" 
                onClick={() => setShowSecret(!showSecret)}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showSecret ? "הסתר" : "הצג מפתח"}
              </button>
            </label>
            <input
              type={showSecret ? "text" : "password"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={config.clientId ? "••••••••••••••••" : "הזן מפתח לקוח מוגן"}
              className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-3.5 py-2 text-sm text-slate-800 outline-hidden font-mono font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-600 font-bold mb-1.5 flex items-center gap-1">
            <Link2 className="w-3.5 h-3.5 text-[#005f7a]" /> Siemens Home Connect API Server base URL:
          </label>
          <select
            value={liveApiUrl}
            onChange={(e) => setLiveApiUrl(e.target.value)}
            className="w-full bg-white border border-slate-300 focus:border-[#005f7a] focus:ring-1 focus:ring-[#005f7a] rounded px-3.5 py-2 text-sm text-slate-800 outline-hidden transition-all font-bold cursor-pointer"
          >
            <option value="https://api.home-connect.com">Production Server (https://api.home-connect.com)</option>
            <option value="https://simulator.home-connect.com">Sandbox/Simulator Server (https://simulator.home-connect.com)</option>
          </select>
        </div>

        {/* Home Connect developer manual settings info */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs text-slate-600 font-bold mb-1">
            <span>כתובת ה-Callback להעתקה ברישום ה-API שלך:</span>
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 text-[10px] bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded flex items-center gap-1 transition-all font-bold cursor-pointer"
            >
              <Copy className="w-3 h-3 text-[#005f7a]" />
              {copied ? "הועתק!" : "העתק כתובת"}
            </button>
          </div>
          <div className="font-mono text-xs text-[#005f7a] break-all select-all p-2.5 bg-white rounded border border-slate-200 font-bold">
            {callbackUrl}
          </div>
        </div>

        {/* Buttons and actions */}
        <div className="flex flex-wrap items-center gap-3.5 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded bg-[#005f7a] hover:bg-[#00465a] text-white font-bold text-sm transition-all shadow-sm cursor-pointer border-0"
          >
            {saving ? "שומר..." : "שמור הגדרות מפתח"}
          </button>

          {!config.useSimulator && (
            <>
              {config.hasToken ? (
                <div className="flex items-center gap-3 mr-auto">
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-250 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    מחובר לחשבון Siemens
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onDisconnect();
                      setBanner({ type: "success", message: "החיבור לשרתי Siemens נותק בהצלחה!" });
                    }}
                    className="p-2 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-md transition-colors cursor-pointer border-0"
                    title="נתק חיבור"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onConnect}
                  className="px-5 py-2.5 mr-auto rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all cursor-pointer shadow-sm border-0"
                >
                  התחבר לחשבון Siemens Home Connect 🔌
                </button>
              )}
            </>
          )}
        </div>
      </form>

      {/* Real-time Diagnostics Center (Requirement 5) */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-[#005f7a]" />
            <h4 className="text-xs font-bold text-[#005f7a]">מרכז בקרה וארכיטקטורת רשת (בזמן אמת)</h4>
          </div>
          <span className="text-[9px] bg-[#005f7a]/10 text-[#005f7a] border border-[#005f7a]/20 px-2 py-0.5 rounded-full font-bold animate-pulse">
            LIVE TELEMETRY
          </span>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Grid indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Credentials Status */}
            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/60 leading-relaxed font-semibold">
              <span className="text-[10px] text-slate-400 block font-bold mb-1">סטטוס מפתחות (Credentials)</span>
              {debugStatus?.credentialsStatus?.hasClientId && debugStatus?.credentialsStatus?.hasClientSecret ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  מפתחות מוגדרים ומאובטחים
                </span>
              ) : (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  חסרים מפתחות לקוח
                </span>
              )}
            </div>

            {/* OAuth status */}
            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/60 leading-relaxed font-semibold">
              <span className="text-[10px] text-slate-400 block font-bold mb-1">סטטוס אישור (OAuth Status)</span>
              {debugStatus?.config?.useSimulator ? (
                <span className="text-slate-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  מצב סימולטור (מסולץ)
                </span>
              ) : debugStatus?.tokenStatus?.hasToken && !debugStatus?.tokenStatus?.tokenExpired ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  חיבור רשת חוקי וסונכרן
                </span>
              ) : (
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  לא מחובר / פג התוקף
                </span>
              )}
            </div>

            {/* Token status indicators */}
            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/60 leading-relaxed font-semibold col-span-1 sm:col-span-2 md:col-span-1">
              <span className="text-[10px] text-slate-400 block font-bold mb-1">אסימון גישה (Tokens)</span>
              {debugStatus?.config?.useSimulator ? (
                <span className="text-slate-500 font-bold">לא רלוונטי בסימולטור</span>
              ) : debugStatus?.tokenStatus?.hasAccessToken ? (
                <div className="text-[10px] space-y-0.5 text-slate-700 font-bold">
                  <div>Access Token: <span className="text-emerald-700 font-bold">קיים בשרת</span></div>
                  <div>Refresh Token: <span className="text-emerald-700 font-bold">{debugStatus?.tokenStatus?.hasRefreshToken ? "קיים" : "חסר"}</span></div>
                </div>
              ) : (
                <span className="text-slate-500 font-bold">לא קיים אסימון</span>
              )}
            </div>
          </div>

          {/* Last API error feedback block */}
          {(!debugStatus?.config?.useSimulator) && (
            <div className={`p-3 rounded-lg border leading-relaxed font-semibold ${
              debugStatus?.lastApiError && debugStatus.lastApiError !== "אין שגיאות API רשומות."
                ? "bg-rose-50 border-rose-100 text-rose-800"
                : "bg-emerald-50/40 border-emerald-100/60 text-emerald-800"
            }`}>
              <span className="text-[10px] text-slate-400 block font-bold mb-1">הודעת שגיאה אחרונה מה-API:</span>
              <p className="font-mono text-xs select-all break-words leading-relaxed text-slate-700 max-h-24 overflow-y-auto">
                {debugStatus?.lastApiError || "אין פקודות שגיאה מעניינות רשומות כרגע."}
              </p>
              {debugStatus?.lastApiError && debugStatus?.lastApiError.includes("429") && (
                <p className="text-[10px] text-amber-800/90 mt-1.5 font-bold">
                  💡 <strong>המלצת מערכת (Rate-limit 429):</strong> שרתי Siemens Home Connect מגבילים את בדיקת השרתים במקרה של קריאות תכופות. המערכת עושה שימוש כרגע בשחזורי מטמון בטיחותיים על מנת לאפשר המשך פעילות סדירה.
                </p>
              )}
              {debugStatus?.lastApiError && debugStatus?.lastApiError.includes("401") && (
                <p className="text-[10px] text-rose-800 mt-1.5 font-bold">
                  🔐 <strong>המלצת מערכת (401 Unauthorized):</strong> אסימון הגישה פג או שה-Client Secret מוגדר בצורה לא תואמת במערכת המפתחים. מומלץ לבצע התחברות מחודשת באמצעות כפתור ה-OAuth.
                </p>
              )}
            </div>
          )}

          {/* Connected physical devices list with error handling in Hebrew (Requirement 6) */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <h5 className="font-bold text-slate-750 flex items-center gap-1.5 text-xs">
              <Smartphone className="w-4 h-4 text-[#005f7a]" />
              מדיחי כלים מקושרים שהתקבלו (Appliance Diagnostics):
            </h5>
            
            {(!debugStatus?.lastFetchedAppliances || debugStatus.lastFetchedAppliances.length === 0) ? (
              <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-[11px] text-amber-800 leading-relaxed font-semibold">
                ⚠️ <strong>שגיאה: לא נמצאו מדיחי כלים מחוברים בחשבון Siemens שלך.</strong>
                <ul className="list-disc mr-4 mt-1.5 space-y-1">
                  <li>ודא שהמדיח הפיזי שלך דולק, מחובר ל-WiFi ומשויך כהלכה לאפליקציית Home Connect הביתית שלך.</li>
                  <li>אם אתה משתמש בשרת הסימולטור / Sandbox, ודא שהוספת מדיח כלים מדומיין ב-Developer Portal של Siemens.</li>
                  <li>אם המפתחות שהזנת שגויים או שאין הרשאות מתאימות, הקריאה תיכשל; בדוק את היומן.</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2">
                {debugStatus.lastFetchedAppliances.map((app: any) => (
                  <div key={app.haId} className="p-3 border rounded-lg border-slate-200 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-semibold">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#005f7a] text-sm">{app.name}</span>
                        <span className="text-[9px] bg-slate-200 rounded px-1.5 py-0.5 font-mono select-all text-slate-600">
                          {app.haId}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 space-x-reverse space-x-2">
                        <span>מותג: <strong>{app.brand}</strong></span>
                        <span>•</span>
                        <span>מצב פעולה: <strong className="text-slate-800">{app.operationState || "Ready"}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:self-center">
                      <span className={`px-2 py-0.5 rounded font-bold border ${
                        app.doorState === "Closed" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border-rose-100"
                      }`}>
                        דלת {app.doorState === "Closed" ? "סגורה" : "פתוחה"}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold border ${
                        app.remoteStartAllowed 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                        Remote Start: {app.remoteStartAllowed ? "מאושר ✓" : "חסום ✗"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Supported Dishwasher Programs displaying English and Hebrew in custom view (Requirement 12) */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <h5 className="font-bold text-slate-750 flex items-center gap-1.5 text-xs">
              <Layers className="w-4 h-4 text-[#005f7a]" />
              תוכניות הדחה מתושאלות ישירות מחשבון ה-API (English Name — Hebrew Name):
            </h5>
            
            {(!debugStatus?.lastFetchedPrograms || debugStatus.lastFetchedPrograms.length === 0) ? (
              <p className="text-[11px] text-slate-500 italic leading-normal font-semibold">לא נטענו תוכניות חיות מהשרת. ודא חיבור API תקין לחלוטין לקבלת הרשימה מהמדיח הפיזי.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {debugStatus.lastFetchedPrograms.map((p: any) => (
                  <div key={p.key || p.name} className="py-2 px-3 border rounded border-slate-150 bg-white shadow-3xs hover:bg-slate-50">
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-bold text-slate-800 text-[11px]">{p.name}</span>
                      <span className="text-[9px] bg-slate-250 text-slate-600 px-1 py-0.5 rounded font-bold font-mono">
                        {p.durationMin} Min
                      </span>
                    </div>
                    <code className="text-[9px] text-slate-400 select-all font-mono block mt-0.5">{p.key}</code>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Connection Test Controls Panel */}
      <div id="test-connection-panel" className="bg-sky-50/40 p-4.5 rounded-lg border border-sky-100/70 flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-sky-100 pb-2">
          <Activity className="w-4.5 h-4.5 text-[#005f7a]" />
          <h4 className="text-xs font-bold text-[#005f7a]">בקרת בדיקות וצימוד מכשירים</h4>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
          בצע בדיקת תקשורת חיה על מנת לוודא תקינות אסימונים (Tokens), או טען מחדש את רשימת מדיחי הכלים שלך מחשבון ה-Home Connect.
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={runTestConnection}
            disabled={testingConnection}
            className="px-4 py-2 bg-[#005f7a] text-white hover:bg-[#004d64] rounded text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs border-0 flex items-center gap-1.5"
          >
            🔌 {testingConnection ? "בודק חיבור מול Siemens..." : "בדוק חיבור API"}
          </button>
          
          <button
            type="button"
            onClick={runRefreshDevices}
            disabled={loadingAppliances}
            className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs border-0 flex items-center gap-1.5"
          >
            🔄 {loadingAppliances ? "טוען מדיחים..." : "טען מדיחים מחוברים"}
          </button>
        </div>
      </div>

      {/* Disclaimer on Security & Safety */}
      <div className="bg-slate-50 border border-slate-205 rounded-lg p-4.5 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 text-[#005f7a] font-bold">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>אזהרת בטיחות והסרת אחריות רשמית:</span>
        </div>
        <p className="leading-relaxed text-[11px] text-slate-600 font-semibold">
          אפליקציה זו פותחה בהסתמך על תקנון הבטיחות הקשיח של Siemens ו-Home Connect API. היא אינה מיועדת לעקוף או להתעלם מחיישני המדיח הפיזיים!
        </p>
        <ul className="list-disc leading-relaxed text-[11.5px] text-slate-500 mr-4 space-y-1 font-semibold">
          <li>חסימת הפעלה במקרה של דלת פתוחה מיושמת ברמת השרת, ובשירות הפיזי במכונה.</li>
          <li>הרשאת Remote Start מושבתת ברגע שפתחת את הדלת פעם נוספת, ומחייבת הפעלה ידנית במדיח - מגבלה זו נעולה לחלוטין ברמת החומרה לעשרות מנגנוני בטיחות.</li>
          <li>האפליקציה בודקת תקינות ועמידה מלאה בתקנים בכל שלב של ה-Scheduler.</li>
        </ul>
      </div>

    </div>
  );
};
