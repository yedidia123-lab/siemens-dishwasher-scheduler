# 🫧 מדיח שבת — Siemens Dishwasher Scheduler

אפליקציית Web ב-React + Express לתזמון הפעלת מדיח Siemens דרך Home Connect API.
ניתן להתקין כ-PWA בטלפון ולגשת דרך URL רגיל בדפדפן.

---

## ארכיטקטורה

```
React 19 + Vite 6 + TypeScript + Tailwind v4   ← Frontend (PWA, RTL, עברית)
Express 4 + Node.js                             ← Backend (OAuth, API Proxy, Scheduler)
JSON files (DATA_DIR)                           ← Storage (schedules, logs, config)
```

- **Client Secret** — נשמר בצד שרת בלבד, לעולם לא חשוף ל-browser
- **Scheduler** — רץ כל 15 שניות ב-Node.js עם אזור זמן `Asia/Jerusalem`
- **OAuth flow** — callback ב-server → token → postMessage לחלון הראשי
- **Safety gates** — דלת / Remote Start / מצב פעיל / תוכנית נתמכת — נבדקים לפני כל הפעלה

---

## הרצה מקומית

```bash
# 1. התקן תלויות
cd siemens-dishwasher-scheduler
npm install

# 2. הגדר env
cp .env.example .env
# ערוך .env:
#   APP_URL=http://localhost:3000

# 3. הפעל שרת פיתוח
npm run dev
# → http://localhost:3000
```

> **טיפ**: אם פורט 3000 תפוס, הרץ: `PORT=3099 npm run dev`

---

## OAuth — Redirect URIs

### מקומי
```
http://localhost:3000/auth/callback
```

### פרודקשן
```
https://YOUR-DOMAIN.railway.app/auth/callback
```

> יש להזין את ה-Redirect URI ב-[Siemens Developer Portal](https://developer.home-connect.com) בהגדרות ה-Application שלך.

---

## Build לפרודקשן

```bash
npm run build
# dist/           ← קבצי React + Service Worker + manifest
# dist/server.cjs ← שרת Express מבונה
```

---

## פריסה — שלב אחר שלב

### שלב 1: GitHub

```bash
cd siemens-dishwasher-scheduler
git init
git add .
git commit -m "initial commit"
# צור repo ב-GitHub ואז:
git remote add origin https://github.com/YOUR_USERNAME/siemens-dishwasher-scheduler.git
git push -u origin main
```

### שלב 2: Railway (מומלץ — חינמי לשימוש בסיסי)

1. כנס ל- **https://railway.app** → **New Project**
2. בחר **Deploy from GitHub Repo** → בחר את הריפו שיצרת
3. Railway יזהה אוטומטית את `nixpacks.toml` ויריץ `npm install && npm run build && npm start`
4. עבור ל-**Settings → Variables** והוסף:
   ```
   APP_URL    = https://your-app.up.railway.app   ← העתק מ-Railway Deployment URL
   NODE_ENV   = production
   PORT       = 3000
   ```
   (CLIENT_ID ו-CLIENT_SECRET ניתן להגדיר גם דרך ממשק האפליקציה)
5. **חשוב** — הוסף **Volume** לאחסון קבוע:
   - Railway → Storage → **Add Volume**
   - Mount Path: `/data`
   - הוסף משתנה: `DATA_DIR = /data`

### שלב 3: Siemens Developer Portal

1. כנס ל- **https://developer.home-connect.com**
2. התחבר עם חשבון Home Connect שלך
3. **Applications → Create Application**:
   - Name: `מדיח שבת`
   - Redirect URIs: הוסף `https://your-app.up.railway.app/auth/callback`
4. העתק את **Client ID** ו-**Client Secret**
5. חזור לאפליקציה → **הגדרות** → הזן Client ID ו-Client Secret → **שמור**
6. לחץ **התחבר ל-Siemens Home Connect** → OAuth popup יפתח

### שלב 4: אחרי חיבור OAuth מוצלח

הדף יאשר אוטומטית ויטען:
- ✅ המדיח שלך
- ✅ התוכניות הזמינות (מהמדיח עצמו)
- ✅ מוכן לתזמון

---

## אחסון נתונים (חשוב לפריסה!)

הנתונים (טוקנים, תזמונים, לוגים) נשמרים בקבצי JSON ב-`DATA_DIR`.

| פלטפורמה | פתרון |
|----------|--------|
| Railway | הוסף Volume בMount Path `/data`, הגדר `DATA_DIR=/data` |
| Render | Disk מתמיד ב-Mount Path `/var/data`, הגדר `DATA_DIR=/var/data` |
| מקומי | `./data/` (ברירת מחדל) |

> ⚠️ **ללא Volume**: בכל פריסה מחדש הטוקנים נמחקים ויש לבצע OAuth מחדש.

---

## Environment Variables

| משתנה | תיאור | חובה |
|-------|-------|------|
| `APP_URL` | URL מלא של האפליקציה (ללא `/`) | כן |
| `NODE_ENV` | `production` בפריסה | כן |
| `PORT` | פורט (ברירת מחדל: 3000) | לא |
| `DATA_DIR` | נתיב לתיקיית נתונים (ברירת מחדל: `./data`) | לא |
| `CLIENT_ID` | Home Connect Client ID (אופציונלי — ניתן דרך UI) | לא |
| `CLIENT_SECRET` | Home Connect Client Secret (אופציונלי — ניתן דרך UI) | לא |

---

## התקנת PWA בטלפון

### Android (Chrome)
1. פתח את ה-URL ב-Chrome
2. תפריט ⋮ → **"הוסף למסך הבית"**
3. אשר → האפליקציה תופיע כאייקון עצמאי

### iPhone (Safari)
1. פתח את ה-URL ב-Safari
2. כפתור שיתוף □↑ → **"הוסף למסך הבית"**
3. אשר → האפליקציה תיפתח ב-fullscreen

---

## פונקציונליות

- ✅ תזמון שבועי (לפי יום) ו-חד-פעמי (לפי תאריך)
- ✅ עד 7 תזמונים פעילים במקביל
- ✅ טעינת תוכניות אמיתיות מהמדיח דרך API
- ✅ בדיקת 4 שערי בטיחות לפני כל הפעלה
- ✅ יומן אירועים בזמן אמת
- ✅ מצב סימולטור לבדיקה ללא מדיח אמיתי
- ✅ אזור זמן Asia/Jerusalem
- ✅ Refresh Token אוטומטי
- ✅ PWA — ניתן להתקנה בטלפון

---

## אבטחה

- `CLIENT_SECRET` נשמר בקובץ `data/config.json` בצד שרת בלבד
- קבצי `data/*.json` ב-gitignore — לא יועלו ל-GitHub
- תקשורת מוצפנת מול שרתי BSH Group
