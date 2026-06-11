import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// DATA_DIR: configurable via env for persistent volumes (Railway, Render, etc.)
// Default: ./data relative to process.cwd()
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const SCHEDULES_FILE = path.join(DATA_DIR, "schedules.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");

// Helper to write JSON files
const writeJson = (file: string, data: any) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Failed to write file ${file}:`, err);
  }
};

// Helper to read JSON files
const readJson = (file: string, fallback: any) => {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (err) {
    console.error(`Failed to read file ${file}:`, err);
  }
  return fallback;
};

// State store
const defaultConfig = {
  clientId: process.env.CLIENT_ID || "",
  clientSecret: process.env.CLIENT_SECRET || "",
  useSimulator: true,
  liveApiUrl: "https://api.home-connect.com",
  hasToken: false,
  accessToken: "",
  refreshToken: "",
  tokenExpiry: 0,
};

let loadedConfig = readJson(CONFIG_FILE, null);
if (loadedConfig) {
  if (!loadedConfig.clientId && process.env.CLIENT_ID) {
    loadedConfig.clientId = process.env.CLIENT_ID;
  }
  if (!loadedConfig.clientSecret && process.env.CLIENT_SECRET) {
    loadedConfig.clientSecret = process.env.CLIENT_SECRET;
  }
} else {
  loadedConfig = defaultConfig;
}
let config = loadedConfig;

let schedules = readJson(SCHEDULES_FILE, [
  {
    id: "sch-1",
    name: "הדחת לילה חסכונית - ראשון",
    dayOfWeek: 1, // Monday
    time: "23:00",
    program: "Dishcare.Dishwasher.Program.Eco50",
    status: "pending",
    applianceId: "SIEMENS-DISHER-SIM-123",
  },
  {
    id: "sch-2",
    name: "הדחה מהירה בסופ\"ש",
    dayOfWeek: 5, // Friday
    time: "14:30",
    program: "Dishcare.Dishwasher.Program.Auto4565",
    status: "pending",
    applianceId: "SIEMENS-DISHER-SIM-123",
  }
]);

let logs = readJson(LOGS_FILE, [
  {
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    level: "success",
    message: "הסימולטור פעיל. מערכת תזמון המדיח אותחלה בהצלחה.",
  }
]);

// Simulated dishwasher appliance state
let shimAppliance = {
  haId: "SIEMENS-DISHER-SIM-123",
  name: "Siemens iQ500 Series Dishwasher (Simulator)",
  brand: "Siemens",
  type: "Dishwasher",
  connected: true,
  doorState: "Closed" as "Closed" | "Open" | "Unknown",
  remoteStartAllowed: true,
  operationState: "Ready", // Ready, Run, Finished, Aborting
  activeProgram: undefined as string | undefined,
  programTimeRemaining: 0, // in seconds
};

// Global telemetry for debug screen
let lastApiError = "";
let lastFetchedAppliances: any[] = [];
let lastFetchedPrograms: any[] = [];

// Log helper
const addLog = (level: "info" | "warn" | "error" | "success", message: string, scheduleId?: string) => {
  const newLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    scheduleId,
  };
  logs.unshift(newLog);
  // Max 200 logs
  if (logs.length > 200) {
    logs = logs.slice(0, 200);
  }
  writeJson(LOGS_FILE, logs);
  return newLog;
};

// Active Home Connect cache to prevent HTTP 429 Rate Limiting
const homeConnectCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 60000; // Increased to 60 seconds (1 minute) of in-memory caching for GET requests to remain safe with limits

// Active Home Connect requests
const fetchHomeConnect = async (endpoint: string, method = "GET", body: any = null, bypassCache = false) => {
  if (config.useSimulator) {
    return null;
  }

  // Handle GET request cache hits
  if (method === "GET" && !bypassCache) {
    const cached = homeConnectCache.get(endpoint);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      console.log(`[Home Connect Cache] Cache hit for endpoint: ${endpoint}`);
      return cached.data;
    }
  }

  // Clear cache for write actions to ensure fresh data subsequently
  if (method !== "GET") {
    homeConnectCache.clear();
    console.log(`[Home Connect Cache] Invalidated entire cache due to write operation: ${method} ${endpoint}`);
  }

  if (!config.accessToken) {
    throw new Error("אין אסימון גישה (Access Token) זמין. יש להתחבר קודם.");
  }

  // Helper to run refresh
  const doTokenRefresh = async () => {
    console.log("Access token expiring or invalid. Requesting refresh...");
    const refreshParams = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
    const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    
    const refResponse = await fetch(`${config.liveApiUrl}/security/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: refreshParams,
    });

    if (refResponse.ok) {
      const tokenData = await refResponse.json();
      config.accessToken = tokenData.access_token;
      config.refreshToken = tokenData.refresh_token || config.refreshToken;
      config.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
      config.hasToken = true;
      writeJson(CONFIG_FILE, config);
      addLog("info", "אסימון הגישה של Home Connect חודש באופן אוטומטי.");
    } else {
      const errorText = await refResponse.text();
      addLog("error", `שגיאה בחידוש אסימון הגישה: ${errorText}`);
      throw new Error(`Failed to refresh token: ${refResponse.statusText}. Details: ${errorText}`);
    }
  };

  // Basic Token auto refresh check
  if (config.refreshToken && Date.now() > (config.tokenExpiry || 0) - 60000) {
    try {
      await doTokenRefresh();
    } catch (err: any) {
      console.error("Token refresh failed:", err);
      config.hasToken = false;
      writeJson(CONFIG_FILE, config);
      throw err;
    }
  }

  const url = `${config.liveApiUrl}/api${endpoint}`;
  try {
    let response = await fetch(url, {
      method,
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Accept": "application/vnd.bsh.sdk.v1+json",
        ...(body ? { "Content-Type": "application/vnd.bsh.sdk.v1+json" } : {}),
      },
      body: body ? JSON.stringify(body) : null,
    });

    // If 401 Unauthorized, attempt active mid-request token refresh once as a rescue layer
    if (response.status === 401 && config.refreshToken) {
      try {
        await doTokenRefresh();
        // Retry request once with the new token
        response = await fetch(url, {
          method,
          headers: {
            "Authorization": `Bearer ${config.accessToken}`,
            "Accept": "application/vnd.bsh.sdk.v1+json",
            ...(body ? { "Content-Type": "application/vnd.bsh.sdk.v1+json" } : {}),
          },
          body: body ? JSON.stringify(body) : null,
        });
      } catch (refreshErr) {
        console.error("Rescue token refresh failed:", refreshErr);
      }
    }

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error(`HomeConnect API Error [${method} ${endpoint}]:`, errorDetails);
      const errMsg = `שגיאת API של Siemens (${response.status}): ${errorDetails}`;
      lastApiError = errMsg;
      throw new Error(errMsg);
    }

    // Handle No Content (204)
    if (response.status === 204) {
      return true;
    }

    const result = await response.json();
    if (method === "GET") {
      homeConnectCache.set(endpoint, {
        timestamp: Date.now(),
        data: result
      });
    }
    return result;
  } catch (err: any) {
    lastApiError = err.message || err.toString();
    // Graceful rate-limit or network offline fallback for GET queries
    if (method === "GET") {
      const cached = homeConnectCache.get(endpoint);
      if (cached) {
        console.warn(`[Home Connect Fallback] API request failed (${err.message}) for GET ${endpoint}. Reverting to last-known cached data.`);
        return cached.data;
      }
    }
    throw err;
  }
};

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Get configuration
app.get("/api/config", (req, res) => {
  res.json({
    clientId: config.clientId,
    clientSecret: config.clientSecret ? "••••••••••••••••" : "",
    useSimulator: config.useSimulator,
    liveApiUrl: config.liveApiUrl,
    hasToken: config.hasToken,
  });
});

// Update configuration
app.post("/api/config", (req, res) => {
  const { clientId, clientSecret, useSimulator, liveApiUrl } = req.body;
  
  if (clientId !== undefined) config.clientId = clientId;
  if (clientSecret !== undefined && clientSecret !== "••••••••••••••••") {
    config.clientSecret = clientSecret;
  }
  if (useSimulator !== undefined) {
    config.useSimulator = useSimulator;
    addLog("info", `עבר למצב ${useSimulator ? "סימולטור" : "Home Connect API רשמי"}`);
  }
  if (liveApiUrl !== undefined) config.liveApiUrl = liveApiUrl;

  writeJson(CONFIG_FILE, config);
  res.json({ success: true, config: {
    clientId: config.clientId,
    clientSecret: config.clientSecret ? "••••••••••••••••" : "",
    useSimulator: config.useSimulator,
    liveApiUrl: config.liveApiUrl,
    hasToken: config.hasToken,
  }});
});

// Clear token connection
app.post("/api/auth/disconnect", (req, res) => {
  config.accessToken = "";
  config.refreshToken = "";
  config.tokenExpiry = 0;
  config.hasToken = false;
  writeJson(CONFIG_FILE, config);
  addLog("warn", "חיבור החשבון של Home Connect נותק.");
  res.json({ success: true });
});

// Test Connection Endpoint
app.get("/api/auth/test", async (req, res) => {
  try {
    if (config.useSimulator) {
      return res.json({
        success: true,
        useSimulator: true,
        message: "מערכת פועלת במצב סימולטור. בדיקת החיבור המדומה עברה בהצלחה! הבטיחות מאופשרת במלואה.",
        hasToken: false,
      });
    }

    if (!config.clientId) {
      return res.status(400).json({
        success: false,
        error: "חסר Client ID בהגדרות. נא להוסיף Client ID ולשמור."
      });
    }

    if (!config.hasToken || !config.accessToken) {
      return res.status(400).json({
        success: false,
        error: "אסימון גישה חסר או לא בתוקף. נא לבצע התחברות ל-Home Connect תחילה."
      });
    }

    // Call /homeappliances to verify token and reachability
    addLog("info", "מריץ בדיקת חיבור יזומה מול שרת Siemens Home Connect API...");
    try {
      const result = await fetchHomeConnect("/homeappliances", "GET", null, true);
      if (result && result.data && result.data.homeappliances) {
        const dishwashers = result.data.homeappliances.filter((app: any) => app.type === "Dishwasher");
        addLog("success", `בדיקת חיבור הצליחה! הגישה לשרת תקינה. נמצאו ${dishwashers.length} מדיחי כלים.`);
        return res.json({
          success: true,
          useSimulator: false,
          hasToken: true,
          message: `החיבור לשרת Home Connect תקין לחלוטין! הגישה פועלת. נמצאו ${dishwashers.length} מדיחי כלים בחשבון.`,
          appliancesCount: dishwashers.length,
        });
      } else {
        throw new Error("התקבלה תגובה לא מזוהה מהשרת.");
      }
    } catch (apiErr: any) {
      console.error("Test API Connection Error:", apiErr);
      addLog("error", `בדיקת חיבור ל-Siemens נכשלה: ${apiErr.message}`);
      return res.status(500).json({
        success: false,
        error: `שגיאה בגישה ל-API: ${apiErr.message}`,
        advice: "ייתכן שאסימון הגישה פג או שמפתחות הלקוח (Client ID / Secret) אינם תואמים. נסה להיכנס מחדש.",
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// OAuth: Get Authorization URL
app.get("/api/auth/url", (req, res) => {
  if (!config.clientId) {
    return res.status(400).json({ error: "נא להזין Client ID בהגדרות החיבור תחילה." });
  }

  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  const redirectUri = `${appUrl}/auth/callback`;

  // Scopes required for Siemens Dishwashers: IdentifyAppliance, Dishwasher, Settings, Control
  const scopes = ["IdentifyAppliance", "Dishwasher", "Settings", "Control"];
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
  });

  const authUrl = `${config.liveApiUrl}/security/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl });
});

// OAuth Callback receiver
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    addLog("error", `צימוד ל-Home Connect נכשל: ${error}`);
    return res.send(`
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fafafa;">
          <h2 style="color: #dc2626;">שגיאת התחברות</h2>
          <p>שגיאה מהאינטגרציה: ${error}</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #e11d48; color: white; border: none; border-radius: 4px; cursor: pointer;">סגור חלון</button>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("No authorization code provided");
  }

  try {
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/auth/callback`;

    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code as string,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(`${config.liveApiUrl}/security/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams,
    });

    if (response.ok) {
      const tokenData = await response.json();
      config.accessToken = tokenData.access_token;
      config.refreshToken = tokenData.refresh_token;
      config.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
      config.hasToken = true;
      writeJson(CONFIG_FILE, config);

      addLog("success", "חיבור החשבון ל-Home Connect בוצע בהצלחה! המדיח מוכן לפעולה.");

      res.send(`
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #0f172a; color: #f8fafc; direction: rtl; }
              .card { background: #1e293b; padding: 30px; border-radius: 12px; max-width: 500px; margin: auto; border: 1px solid #334155; }
              .icon { font-size: 48px; color: #22c55e; margin-bottom: 20px; }
              button { padding: 12px 24px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin-top: 20px; }
              button:hover { background: #0369a1; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">✓</div>
              <h2>החיבור ל-Siemens בוצע בהצלחה!</h2>
              <p>חשבון ה-Home Connect שלך סונכרן עם האפליקציה.</p>
              <p>חלון זה ייסגר באופן אוטומטי כעת.</p>
              <button onclick="window.close()">חזור לאפליקציה</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                setTimeout(() => { window.close(); }, 2000);
              }
            </script>
          </body>
        </html>
      `);
    } else {
      const errorText = await response.text();
      addLog("error", `החלפת קוד באסימון נכשלה: ${errorText}`);
      res.send(`שגיאת קבלת אסימון מהשרת: ${errorText}`);
    }
  } catch (err: any) {
    console.error("Auth callback error:", err);
    addLog("error", `חיבור OAuth נכשל: ${err.message}`);
    res.status(500).send(`שגיאת שרת פנימית: ${err.message}`);
  }
});

// Get dishwasher devices
app.get("/api/appliances", async (req, res) => {
  try {
    if (config.useSimulator) {
      lastFetchedAppliances = [shimAppliance];
      res.json([shimAppliance]);
    } else {
      // Connect to Siemens Home Connect API to fetch dishwasher devices with rate-limit resiliency
      let result;
      try {
        result = await fetchHomeConnect("/homeappliances");
      } catch (apiErr: any) {
        console.warn("[Appliances Fallback] /homeappliances request failed:", apiErr.message);
        const cached = homeConnectCache.get("/homeappliances");
        if (cached) {
          result = cached.data;
        } else {
          // Dynamically reconstruct appliance using first known appliance ID in database schedules
          const knownHaId = schedules.find((s: any) => s.applianceId)?.applianceId || "SIEMENS-REAL-DISHWASHER-ID";
          result = {
            data: {
              homeappliances: [
                {
                  haId: knownHaId,
                  brand: "Siemens",
                  name: "מדיח כלים (שחזור זמני)",
                  type: "Dishwasher",
                  connected: true
                }
              ]
            }
          };
          addLog("warn", `תקשורת ראשונית מול Siemens נכשלה עקב קצב פניות (429) או חיבור. בוצע שחזור מכשיר אוטומטי למזהה '${knownHaId}' על מנת לשמור על יציבות.`);
        }
      }

      if (result && result.data && result.data.homeappliances) {
        // Filter only dishwashers
        const rawAppliances = result.data.homeappliances;
        const dishwashers = rawAppliances.filter((app: any) => app.type === "Dishwasher");

        // Enhance with real-time status data for each dishwasher
        const devices = [];
        for (const app of dishwashers) {
          try {
            const statusDetail = await fetchHomeConnect(`/homeappliances/${app.haId}/status`);
            const settingsDetail = await fetchHomeConnect(`/homeappliances/${app.haId}/settings`);
            
            let doorState = "Unknown" as any;
            let remoteStartAllowed = false;
            let operationState = "Ready";

            if (statusDetail && statusDetail.data && statusDetail.data.status) {
              const statusList = statusDetail.data.status;
              const doorObj = statusList.find((s: any) => s.key === "BSH.Common.Status.DoorState");
              const remoteObj = statusList.find((s: any) => s.key === "BSH.Common.Status.RemoteControlStartAllowed");
              const opObj = statusList.find((s: any) => s.key === "BSH.Common.Status.OperationState");

              if (doorObj) {
                doorState = doorObj.value.endsWith("Closed") ? "Closed" : "Open";
              }
              if (remoteObj) {
                remoteStartAllowed = remoteObj.value === true;
              }
              if (opObj) {
                operationState = opObj.value.replace("BSH.Common.EnumType.OperationState.", "");
              }
            }

            devices.push({
              haId: app.haId,
              name: `${app.brand} ${app.name || "מדיח כלים"}`,
              brand: app.brand,
              type: app.type,
              connected: app.connected,
              doorState,
              remoteStartAllowed,
              operationState,
            });
          } catch (err) {
            console.warn(`Failed to fetch status for appliance ${app.haId}`, err);
            devices.push({
              haId: app.haId,
              name: `${app.brand} ${app.name || "מדיח כלים"}`,
              brand: app.brand,
              type: app.type,
              connected: app.connected,
              doorState: "Unknown",
              remoteStartAllowed: false,
              operationState: "Unknown",
            });
          }
        }
        lastFetchedAppliances = devices;
        res.json(devices);
      } else {
        lastFetchedAppliances = [];
        res.json([]);
      }
    }
  } catch (err: any) {
    console.error("Failed to get appliances:", err);
    res.status(500).json({ error: err.message });
  }
});

// Trigger manual dishwasher actions in simulator mode (interactive debugging!)
app.post("/api/simulator/action", (req, res) => {
  if (!config.useSimulator) {
    return res.status(400).json({ error: "הפעולה מותרת רק במצב סימולטור." });
  }

  const { action, value } = req.body;
  if (action === "toggleDoor") {
    shimAppliance.doorState = shimAppliance.doorState === "Closed" ? "Open" : "Closed";
    addLog("info", `[סימולטור] דלת המדיח שונתה למצב: ${shimAppliance.doorState === "Closed" ? "סגורה" : "פתוחה"}`);
  } else if (action === "toggleRemote") {
    shimAppliance.remoteStartAllowed = !shimAppliance.remoteStartAllowed;
    addLog("info", `[סימולטור] Remote Start שונתה למצב: ${shimAppliance.remoteStartAllowed ? "פעיל" : "מושבת"}`);
  } else if (action === "toggleConnected") {
    shimAppliance.connected = !shimAppliance.connected;
    addLog("info", `[סימולטור] חיבור המדיח שונה למצב: ${shimAppliance.connected ? "מחובר ל-WiFi" : "מנותק"}`);
  } else if (action === "resetState") {
    shimAppliance.operationState = "Ready";
    shimAppliance.activeProgram = undefined;
    shimAppliance.programTimeRemaining = 0;
    addLog("info", "[סימולטור] מצב המדיח אופס חזרה למוכן.");
  }

  res.json({ success: true, appliance: shimAppliance });
});

const getProgramTranslation = (key: string): { english: string; hebrew: string } => {
  const k = key.toLowerCase();
  if (k.includes("intensiv70") || k.includes("intensive70") || k.includes("heavy")) {
    return { english: "Heavy", hebrew: "הדחה חזקה" };
  }
  if (k.includes("auto4565") || k.includes("auto")) {
    return { english: "Auto", hebrew: "אוטומטי" };
  }
  if (k.includes("eco50") || k.includes("eco")) {
    return { english: "Eco", hebrew: "חסכונית" };
  }
  if (k.includes("prerinse") || k.includes("pre-rinse") || k.includes("pre_rinse")) {
    return { english: "Pre-rinse", hebrew: "שטיפה מקדימה" };
  }
  if (k.includes("quick65") || k.includes("speed65") || k.includes("quickspeed65")) {
    return { english: "Speed 65°", hebrew: "מהירה 65°" };
  }
  if (k.includes("machinecare") || k.includes("machine-care") || k.includes("machine_care")) {
    return { english: "Machine Care", hebrew: "ניקוי מכונה" };
  }

  // Fallbacks for other known keys
  if (k.includes("quick45")) {
    return { english: "Quick 45°C", hebrew: "הדחה מהירה 45°C" };
  }
  if (k.includes("glas40") || k.includes("glass40")) {
    return { english: "Glass 40°C", hebrew: "זכוכית עדינה 40°C" };
  }
  if (k.includes("silence") || k.includes("nightwash")) {
    return { english: "Silence / Night Wash", hebrew: "הדחת לילה שקטה" };
  }

  // For any totally untranslated program returned from API
  const cleanKey = key.replace("Dishcare.Dishwasher.Program.", "");
  const spaced = cleanKey.replace(/([A-Z])/g, ' $1').trim();
  return { english: spaced, hebrew: `${spaced} (לא מתורגם)` };
};

const translateProgramKey = (key: string): string => {
  const trans = getProgramTranslation(key);
  return `${trans.english} — ${trans.hebrew}`;
};

// Get list of programs suitable for Siemens dishwashers
app.get("/api/programs", async (req, res) => {
  const standardPrograms = [
    { key: "Dishcare.Dishwasher.Program.Intensiv70", name: translateProgramKey("Dishcare.Dishwasher.Program.Intensiv70"), durationMin: 135 },
    { key: "Dishcare.Dishwasher.Program.Auto4565", name: translateProgramKey("Dishcare.Dishwasher.Program.Auto4565"), durationMin: 140 },
    { key: "Dishcare.Dishwasher.Program.Eco50", name: translateProgramKey("Dishcare.Dishwasher.Program.Eco50"), durationMin: 195 },
    { key: "Dishcare.Dishwasher.Program.PreRinse", name: translateProgramKey("Dishcare.Dishwasher.Program.PreRinse"), durationMin: 15 },
    { key: "Dishcare.Dishwasher.Program.Quick65", name: translateProgramKey("Dishcare.Dishwasher.Program.Quick65"), durationMin: 59 },
    { key: "Dishcare.Dishwasher.Program.MachineCare", name: translateProgramKey("Dishcare.Dishwasher.Program.MachineCare"), durationMin: 90 },
  ];

  let appId = req.query.applianceId as string;
  
  // Smart Autodetect appliance ID if user didn't specify one
  if (!appId && !config.useSimulator && config.hasToken) {
    try {
      const appResult = await fetchHomeConnect("/homeappliances");
      if (appResult && appResult.data && Array.isArray(appResult.data.homeappliances)) {
        const dishwashers = appResult.data.homeappliances.filter((app: any) => app.type === "Dishwasher");
        if (dishwashers.length > 0) {
          appId = dishwashers[0].haId;
        }
      }
    } catch (e: any) {
      console.warn("Could not auto-fetch appliance ID for program retrieval:", e.message);
    }
  }

  if (!appId || config.useSimulator || !config.hasToken) {
    lastFetchedPrograms = standardPrograms;
    return res.json(standardPrograms);
  }

  try {
    console.log(`Fetching specific programs list from Siemens API for appliance: ${appId}...`);
    const apiResult = await fetchHomeConnect(`/homeappliances/${appId}/programs`);
    if (apiResult && apiResult.data && Array.isArray(apiResult.data.programs)) {
      const mappedPrograms = apiResult.data.programs.map((p: any) => {
        let durationMin = 120;
        const pk = p.key;
        if (pk.includes("Eco50")) durationMin = 195;
        else if (pk.includes("Auto")) durationMin = 140;
        else if (pk.includes("Intensiv") || pk.includes("Intensive") || pk.includes("Heavy")) durationMin = 135;
        else if (pk.includes("Quick65") || pk.includes("Speed65")) durationMin = 59;
        else if (pk.includes("PreRinse") || pk.includes("Prerinse") || pk.includes("Pre-rinse")) durationMin = 15;
        else if (pk.includes("Glas40") || pk.includes("Glass40")) durationMin = 90;
        else if (pk.includes("MachineCare")) durationMin = 90;
        else if (pk.includes("Silence50") || pk.includes("Silence") || pk.includes("NightWash")) durationMin = 240;

        return {
          key: pk,
          name: translateProgramKey(pk),
          durationMin,
          raw: p
        };
      });
      
      console.log(`Loaded ${mappedPrograms.length} custom programs from physical Siemens dishwasher for appId ${appId}.`);
      lastFetchedPrograms = mappedPrograms;
      return res.json(mappedPrograms);
    }
  } catch (err: any) {
    console.error("Error fetching appliance program list from Home Connect API:", err);
  }

  lastFetchedPrograms = standardPrograms;
  return res.json(standardPrograms);
});

// Get scheduled items
app.get("/api/schedules", (req, res) => {
  res.json(schedules);
});

// Edit/Add scheduled items (Max 50 schedules)
app.post("/api/schedules", (req, res) => {
  const { id, name, dayOfWeek, oneTimeDate, time, program, applianceId } = req.body;

  if (!name || dayOfWeek === undefined || !time || !program || !applianceId) {
    return res.status(400).json({ error: "נא למלא את כל שדות החובה." });
  }

  // Enforce Max 7 active schedules limits
  const activeCount = schedules.filter((s: any) => s.status === "pending").length;
  if (!id && activeCount >= 50) {
    return res.status(400).json({ error: "הגעת למכסת התזמונים המרבית (50). מחק תזמון קיים כדי להוסיף חדש." });
  }

  if (id) {
    // Edit schedule
    const index = schedules.findIndex((s: any) => s.id === id);
    if (index !== -1) {
      const originalStatus = schedules[index].status;
      const newStatus = req.body.status || "pending";
      
      schedules[index] = {
        ...schedules[index],
        name,
        dayOfWeek,
        oneTimeDate,
        time,
        program,
        applianceId,
        status: newStatus,
        errorLog: newStatus === "pending" ? undefined : (newStatus === originalStatus ? schedules[index].errorLog : undefined),
      };
      addLog("info", `התזמון '${name}' עודכן בהצלחה לסטטוס ${newStatus === "pending" ? "פעיל" : "לא פעיל"}.`);
    } else {
      return res.status(404).json({ error: "תזמון לא נמצא." });
    }
  } else {
    // Create new schedule
    const newSchedule = {
      id: "sch-" + Date.now(),
      name,
      dayOfWeek,
      oneTimeDate,
      time,
      program,
      status: "pending" as const,
      applianceId,
    };
    schedules.push(newSchedule);
    addLog("info", `התזמון החדש '${name}' נוסף לרשימה.`);
  }

  writeJson(SCHEDULES_FILE, schedules);
  res.json({ success: true, schedules });
});

// Delete or cancel a scheduled item
app.delete("/api/schedules/:id", (req, res) => {
  const { id } = req.params;
  const originalCount = schedules.length;
  const scheduleToDelete = schedules.find((s: any) => s.id === id);
  
  schedules = schedules.filter((s: any) => s.id !== id);

  if (schedules.length !== originalCount) {
    if (scheduleToDelete) {
      addLog("warn", `התזמון '${scheduleToDelete.name}' בוטל והוסר מהרשימה.`);
    }
    writeJson(SCHEDULES_FILE, schedules);
    res.json({ success: true, schedules });
  } else {
    res.status(404).json({ error: "התזמון לא נמצא." });
  }
});

// Stop active program — DELETE /homeappliances/{haId}/programs/active
app.post("/api/appliances/:haId/stop", async (req, res) => {
  const { haId } = req.params;
  try {
    if (config.useSimulator) {
      shimAppliance.operationState = "Ready";
      shimAppliance.activeProgram = undefined;
      addLog("info", `[סימולטור] בקשת עצירה: המדיח אופס למצב Ready.`);
      return res.json({ success: true, message: "נשלחה בקשת עצירה (סימולטור)" });
    }

    if (!config.accessToken) {
      return res.status(401).json({ error: "לא מחובר. נא לבצע אימות OAuth." });
    }

    await fetchHomeConnect(`/homeappliances/${encodeURIComponent(haId)}/programs/active`, "DELETE");
    addLog("info", `בקשת עצירת תוכנית נשלחה בהצלחה למדיח ${haId}.`);
    return res.json({ success: true, message: "הפעולה הופסקה" });
  } catch (err: any) {
    const httpStatus = err?.status || 500;
    addLog("error", `כשלון בעצירת המדיח ${haId}: ${err.message}`);
    return res.status(httpStatus >= 400 ? httpStatus : 500).json({
      error: "העצירה נכשלה",
      httpStatus,
      debug: err.message,
    });
  }
});

// Get recent log items
app.get("/api/logs", (req, res) => {
  res.json(logs);
});

// Clear all logs
app.post("/api/logs/clear", (req, res) => {
  logs = [
    {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "יומן האירועים אופס על ידי המשתמש.",
    }
  ];
  writeJson(LOGS_FILE, logs);
  res.json({ success: true, logs });
});

// ----------------------------------------------------
// CORES SCHEDULER & PIPELINE ACTION ENGINE
// Runs continuously every 15 seconds to evaluate schedules with strict safety rules.
// ----------------------------------------------------

// Helper to compute local time information in Israel (Asia/Jerusalem timezone)
const getIsraelTime = () => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(new Date());
    const partMap: Record<string, string> = {};
    for (const part of parts) {
      partMap[part.type] = part.value;
    }

    const year = partMap.year;
    const month = partMap.month;
    const day = partMap.day;
    const hour = partMap.hour;
    const minute = partMap.minute;
    const second = partMap.second;

    const dateStr = `${year}-${month}-${day}`; // "YYYY-MM-DD"
    const timeStr = `${hour}:${minute}`; // "HH:MM"

    // Construct exact date representation
    const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday, etc.

    return {
      dateStr,
      timeStr,
      dayOfWeek,
      fullString: `${dateStr} ${timeStr}:${second}`,
      timestamp: d.getTime(),
      success: true,
    };
  } catch (err: any) {
    console.error("Error formatting Israel Time:", err);
    // Safe fallback if for any reason the environment has limited timezone DB, fallback to normal local server parameters
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return {
      dateStr,
      timeStr,
      dayOfWeek: now.getDay(),
      fullString: now.toString(),
      timestamp: now.getTime(),
      success: false,
    };
  }
};

// Calculate if a schedule is matching this current local time.
// Since timezone issues can shift hours, we evaluate based on local Israel time.
const checkAndTriggerSchedules = async () => {
  const isr = getIsraelTime();
  const currentDateStr = isr.dateStr;
  const currentTimeStr = isr.timeStr;
  const currentDayOfWeek = isr.dayOfWeek;

  console.log(`[SCHEDULER TICK] Server Time: ${new Date().toISOString()} | Israel Time: ${currentDateStr} ${currentTimeStr} (Day ${currentDayOfWeek})`);

  // Scan through schedules
  for (const schedule of schedules) {
    // 1. Handle expired/missed one-time schedules
    if (schedule.status === "pending" && schedule.dayOfWeek === -1 && schedule.oneTimeDate) {
      try {
        const schedTimeParts = schedule.oneTimeDate.split("-");
        const schedHourParts = schedule.time.split(":");
        const schedDateObj = new Date(
          Number(schedTimeParts[0]),
          Number(schedTimeParts[1]) - 1,
          Number(schedTimeParts[2]),
          Number(schedHourParts[0]),
          Number(schedHourParts[1]),
          0
        );

        // If current time is past the scheduled time by more than 1 minute (60,000 ms) and wasn't triggered
        if (isr.timestamp > schedDateObj.getTime() + 60000) {
          schedule.status = "missed";
          schedule.errorLog = "מועד ההפעלה חלף מבלי שהמדיח הופעל בפועל (לשלל סיבות כגון שרת כבוי, בעיית חיבור או דלת פתוחה).";
          schedule.lastRun = new Date().toISOString();
          addLog("warn", `תזמון חד-פעמי '${schedule.name}' עבר ללא הפעלה (חלף חלון ההזדמנות).`, schedule.id);
          writeJson(SCHEDULES_FILE, schedules);
          continue;
        }
      } catch (e) {
        console.error("Failed to check expiration for schedule:", schedule.name, e);
      }
    }

    if (schedule.status !== "pending") {
      continue;
    }

    // Prevent double triggering in the same minute window (since interval runs every 15 seconds)
    if (schedule.lastRun) {
      const lastRunTime = new Date(schedule.lastRun).getTime();
      if (isr.timestamp - lastRunTime < 90000) { // skip if run within the last 1.5 minutes
        continue;
      }
    }

    let isMatch = false;

    if (schedule.dayOfWeek === -1) {
      // One-time execution: Match specific date and time
      if (schedule.oneTimeDate === currentDateStr && schedule.time === currentTimeStr) {
        isMatch = true;
      }
    } else {
      // Recurring schedule: Matches day of week and exact HH:MM
      if (schedule.dayOfWeek === currentDayOfWeek && schedule.time === currentTimeStr) {
        isMatch = true;
      }
    }

    if (isMatch) {
      console.log(`[SCHEDULER] Trigger match found for schedule: ${schedule.name} at ${currentTimeStr}`);
      addLog("info", `תזמון הגיע למועד ההפעלה: '${schedule.name}' (${schedule.time}). מעביר לסטטוס 'בתהליך הפעלה' ומפעיל בדיקות בטיחות...`, schedule.id);

      // Temporarily mark status as "triggering" and save to avoid double triggers in async process
      schedule.status = "triggering";
      writeJson(SCHEDULES_FILE, schedules);

      try {
        let applianceStatus: typeof shimAppliance;
        let appliancePrograms: string[] = [];

        if (config.useSimulator) {
          applianceStatus = shimAppliance;
          appliancePrograms = [
            "Dishcare.Dishwasher.Program.Eco50",
            "Dishcare.Dishwasher.Program.Auto4565",
            "Dishcare.Dishwasher.Program.Intensiv70",
            "Dishcare.Dishwasher.Program.Quick65",
            "Dishcare.Dishwasher.Program.PreRinse",
            "Dishcare.Dishwasher.Program.MachineCare"
          ];
        } else {
          // 1. Fetch live status from Siemens Home Connect
          const apiStatus = await fetchHomeConnect(`/homeappliances/${schedule.applianceId}/status`);
          if (!apiStatus) {
            throw new Error("Appliance unavailable/offline");
          }

          // Fetch programs list to verify program support
          try {
            const apiProgs = await fetchHomeConnect(`/homeappliances/${schedule.applianceId}/programs`);
            if (apiProgs && apiProgs.data && Array.isArray(apiProgs.data.programs)) {
              appliancePrograms = apiProgs.data.programs.map((p: any) => p.key);
            }
          } catch (progErr) {
            console.warn("Could not check current supported programs from API", progErr);
          }

          // Convert backend payload
          const statusList = apiStatus.data.status;
          const doorObj = statusList.find((s: any) => s.key === "BSH.Common.Status.DoorState");
          const remoteObj = statusList.find((s: any) => s.key === "BSH.Common.Status.RemoteControlStartAllowed");
          const opObj = statusList.find((s: any) => s.key === "BSH.Common.Status.OperationState");

          let doorState: "Closed" | "Open" | "Unknown" = "Unknown";
          if (doorObj) {
            doorState = doorObj.value.endsWith("Closed") ? "Closed" : "Open";
          }

          applianceStatus = {
            haId: schedule.applianceId,
            name: "מדיח כלים Siemens",
            brand: "Siemens",
            type: "Dishwasher",
            connected: true, 
            doorState,
            remoteStartAllowed: remoteObj ? remoteObj.value === true : false,
            operationState: opObj ? opObj.value.replace("BSH.Common.EnumType.OperationState.", "") : "Ready",
            activeProgram: undefined,
            programTimeRemaining: 0,
          };
        }

        // --- PRE-EXECUTION PROGRAM VALIDATION (Requirement 7 & 8) ---
        if (appliancePrograms.length > 0 && !appliancePrograms.includes(schedule.program)) {
          throw new Error("UnsupportedProgram");
        }

        // --- SAFETY GATES CHECK (DO NOT BYPASS OR IGNORE!) ---
        
        // Safety Gate A: Appliance Connection
        if (!applianceStatus.connected) {
          throw new Error("Appliance unavailable/offline");
        }

        // Safety Gate B: Door Closed check
        if (applianceStatus.doorState !== "Closed") {
          throw new Error("Door open");
        }

        // Safety Gate C: Remote Start Permission Allowed check
        if (!applianceStatus.remoteStartAllowed) {
          throw new Error("Remote Start disabled");
        }

        // Safety Gate D: Active Running program check
        if (applianceStatus.operationState === "Run") {
          throw new Error("המדיח פעיל כבר בתוכנית אחרת");
        }

        // --- ALL SAFETY GATES PASSED! EXECUTE THE PROGRAM ---
        const progDisplayName = translateProgramKey(schedule.program);
        const logMsg = `מנסה להפעיל מדיח:
- מזהה מכשיר (Dishwasher ID): ${schedule.applianceId}
- מפתח תוכנית (Program Key): ${schedule.program}
- שם תוכנית (Program Display Name): ${progDisplayName}
- שעת תזמון (Scheduled Time): ${schedule.time}
- שעה נוכחית (Current Time): ${isr.fullString}`;
        
        console.log(`[SCHEDULER LOGGING PRE-RUN] ${logMsg}`);
        addLog("info", logMsg, schedule.id);

        if (config.useSimulator) {
          // Simulator simulation trigger
          shimAppliance.operationState = "Run";
          shimAppliance.activeProgram = schedule.program;
          shimAppliance.programTimeRemaining = 120; // 2 minutes visual feedback simulation
        } else {
          // Call live Siemens Home Connect API to start program
          const bodyData = {
            data: {
              key: schedule.program,
              options: []
            }
          };
          await fetchHomeConnect(`/homeappliances/${schedule.applianceId}/programs/active`, "PUT", bodyData);
        }

        // Update schedule status
        if (schedule.dayOfWeek === -1) {
          schedule.status = "triggered"; // One-time becomes fully triggered
        } else {
          schedule.status = "pending"; // Recurring returns to pending
          schedule.lastRunStatus = "success";
        }
        
        schedule.lastRun = new Date().toISOString();
        schedule.errorLog = undefined;
        schedule.technicalError = undefined;
        addLog("success", `✓ סיום מושלם: תוכנית המדיח '${schedule.name}' הופעלה בהצלחה ועובדת כעת כצפוי.`, schedule.id);

      } catch (err: any) {
        console.error(`[SCHEDULER ERROR] for schedule: ${schedule.name}`, err);
        
        // Map the Home Connect error mapping correctly (Requirement 11)
        const norm = (err.message || "").toLowerCase();
        let clientFriendlyMessage = "שגיאה בלתי צפויה בהפעלת המדיח";
        let technicalError: string | undefined = err.message;

        if (norm.includes("unsupportedprogram") || norm.includes("unsupported program") || norm.includes("unknown program feature key")) {
          clientFriendlyMessage = "התוכנית שנבחרה אינה נתמכת על ידי המדיח הזה";
          technicalError = undefined;
        } else if (norm.includes("unauthorized") || norm.includes("token expired") || norm.includes("401") || norm.includes("credentials")) {
          clientFriendlyMessage = "נדרש חיבור מחדש ל-Home Connect";
          technicalError = undefined;
        } else if (norm.includes("remote start") || norm.includes("remotecontrolstartallowed") || norm.includes("remotestate") || norm.includes("שלט")) {
          clientFriendlyMessage = "יש להפעיל Remote Start במדיח או באפליקציית Home Connect";
          technicalError = undefined;
        } else if (norm.includes("door open") || norm.includes("doorstate") || norm.includes("דלת")) {
          clientFriendlyMessage = "דלת המדיח פתוחה";
          technicalError = undefined;
        } else if (norm.includes("unavailable") || norm.includes("offline") || norm.includes("לא זמין")) {
          clientFriendlyMessage = "המדיח לא זמין כרגע";
          technicalError = undefined;
        }

        // Handle failure
        if (schedule.dayOfWeek === -1) {
          schedule.status = "failed"; // One-time becomes failed
        } else {
          schedule.status = "pending"; // Recurring returns to pending 
          schedule.lastRunStatus = "failed";
        }
        
        schedule.errorLog = clientFriendlyMessage;
        if (technicalError) {
          schedule.technicalError = `${technicalError}`;
        } else {
          schedule.technicalError = undefined;
        }
        schedule.lastRun = new Date().toISOString();
        addLog("error", `✗ תזמון '${schedule.name}' נכשל: ${clientFriendlyMessage}`, schedule.id);
      }

      writeJson(SCHEDULES_FILE, schedules);
    }
  }
};

// Test trigger check manually
app.post("/api/debug/trigger-check", async (req, res) => {
  addLog("info", "בדיקת תזמונים יזומה הופעלה באופן ידני מהממשק.");
  try {
    await checkAndTriggerSchedules();
    res.json({ success: true, schedules });
  } catch (err: any) {
    console.error("Manual check error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Debug schedules status overview
app.get("/api/debug/status", (req, res) => {
  const isr = getIsraelTime();
  res.json({
    serverTimeUtc: new Date().toISOString(),
    serverTimeLocal: new Date().toString(),
    israelTime: isr,
    config: {
      useSimulator: config.useSimulator,
      hasToken: config.hasToken,
    },
    credentialsStatus: {
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
      liveApiUrl: config.liveApiUrl,
    },
    tokenStatus: {
      hasToken: config.hasToken,
      hasAccessToken: !!config.accessToken,
      hasRefreshToken: !!config.refreshToken,
      tokenExpiryUtc: config.tokenExpiry ? new Date(config.tokenExpiry).toISOString() : null,
      tokenExpired: config.tokenExpiry ? (Date.now() > config.tokenExpiry) : true,
    },
    lastApiError: lastApiError || "אין שגיאות API רשומות.",
    lastFetchedAppliances,
    lastFetchedPrograms,
    schedules,
  });
});

// Scheduler tickers
setInterval(checkAndTriggerSchedules, 15000);

// Simulator countdown simulator
setInterval(() => {
  if (config.useSimulator && shimAppliance.operationState === "Run") {
    if (shimAppliance.programTimeRemaining > 15) {
      shimAppliance.programTimeRemaining -= 15;
    } else {
      shimAppliance.operationState = "Ready";
      shimAppliance.activeProgram = undefined;
      shimAppliance.programTimeRemaining = 0;
      addLog("success", "[סימולטור] מחזור ההדחה הסתיים בהצלחה. המדיח שוב מוכן ודלת סגורה.");
    }
  }
}, 15000);


// ----------------------------------------------------
// VITE DEV SERVER OR STATIC SERVING MIDDLEWARE
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Siemens Scheduler server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
