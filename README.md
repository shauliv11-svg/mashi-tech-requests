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

4. Users must exist and be active in `app_users` before they can create a password or log in.
5. First-time users use the "יצירת סיסמה" flow. Existing users use "כניסה".
6. Password reset uses the "איפוס סיסמה" flow.

