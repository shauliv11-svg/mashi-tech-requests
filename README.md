# מערכת בקשות טכנולוגיה מסייעת - משי

MVP ראשוני למערכת ווב לניהול בקשות טכנולוגיה מסייעת בבית ספר משי.

## מה קיים ב-MVP

- מסך התחברות דמו לפי משתמשים ותפקידים
- הרשאות בסיסיות לצוות, מטפל/ת בבקשות ואדמין
- הגשת בקשה חדשה
- בחירת תלמיד/ה מרשימה נגללת ומילוי כיתה אוטומטי
- צפייה בבקשות לפי משתמשת וכיתות משויכות
- ניהול בקשות למטפל/ת ולאדמין
- סגירת בקשה עם הודעה למגישה
- ניהול משתמשים וכיתות משויכות
- ניהול תלמידים עם פרטי מכשיר והנגשה ניהוליים בלבד

## הרצה מקומית

```bash
npm install
npm run dev
```

לאחר מכן פותחים את:

```text
http://localhost:3000
```

## הערה חשובה

כרגע זה MVP עם נתוני דמו בצד הלקוח. לגרסה אמיתית צריך לחבר בסיס נתונים, התחברות אמיתית ושליחת מיילים.

## חיבור Supabase

1. יוצרים פרויקט חדש ב-Supabase.
2. נכנסים ל-SQL Editor ומריצים את הקובץ:

```text
supabase/schema.sql
```

3. מעתיקים את Project URL ואת anon public key מתוך Project Settings -> API.
4. מוסיפים ל-Vercel תחת Project Settings -> Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

5. מפעילים Redeploy ב-Vercel.

אם משתני הסביבה לא מוגדרים, האפליקציה ממשיכה לעבוד עם נתוני הדמו המקומיים.

## Supabase Auth - email and password

The production app uses Supabase Auth with email/password login.

Recommended Supabase settings:

1. Go to Authentication -> URL Configuration.
2. Set Site URL:

```text
https://mashi-tech-requests.vercel.app
```

3. Add Redirect URLs:

```text
https://mashi-tech-requests.vercel.app
http://localhost:3000
http://localhost:3001
```

4. Admins create staff users from the app and set their initial password.
5. `SUPABASE_SERVICE_ROLE_KEY` is required for admin-created passwords and deleting Auth users. Keep it server-only; never prefix it with `NEXT_PUBLIC_`.
6. Existing users use "כניסה". Password reset uses the "איפוס סיסמה" flow.



## Email sending

Closed-request emails are sent server-side through SMTP. For Gmail or Google Workspace, add these Vercel Environment Variables and redeploy:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-sender@gmail.com
SMTP_PASS=your-google-app-password
EMAIL_FROM=בקשות טכנולוגיה משי <your-sender@gmail.com>
EMAIL_REPLY_TO=your-reply-address@example.com
```

Use a Google App Password, not the regular Gmail password.

## Health check and daily keep-alive

The app exposes a lightweight health endpoint:

```text
/api/health
```

It performs a minimal Supabase database read and returns only general status, for example:

```json
{ "ok": true, "database": "ok", "checkedAt": "2026-07-22T06:00:00.000Z" }
```

`vercel.json` registers a daily Vercel Cron Job that calls this endpoint once per day. On the Vercel Hobby plan, cron jobs are limited to once per day, which is enough for a basic availability check.

After deployment, the cron can be viewed in Vercel Project Settings -> Cron Jobs.
