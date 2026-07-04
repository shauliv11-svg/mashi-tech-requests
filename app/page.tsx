"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Role = "staff" | "handler" | "admin";
type View = "login" | "myRequests" | "newRequest" | "manageRequests" | "users" | "students";
type SubjectType = "student" | "class";
type RequestStatus = "new" | "progress" | "waiting" | "closed";
type DeviceType = "מחשב" | "אייפד" | "מחשב מיקוד מבט" | "אייפד פרו";
type CareProvider = "משרד הבריאות" | "משרד החינוך";

type Student = {
  id: number;
  fullName: string;
  className: string;
  deviceType?: DeviceType;
  careProvider?: CareProvider;
  accessibilityDate?: string;
  deviceResponsibility?: string;
  deviceResponsibilityPhone?: string;
  deviceResponsibilityEmail?: string;
  accessories?: string;
  appleId?: string;
  applePassword?: string;
  active: boolean;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  classNames?: string[];
  active: boolean;
};

type TechRequest = {
  id: number;
  requesterId: number;
  subjectType: SubjectType;
  studentId?: number;
  subjectName: string;
  className: string;
  requestType: string;
  description: string;
  attempted: string;
  status: RequestStatus;
  createdAt: string;
  internalNote?: string;
  closingMessage?: string;
};

const roleLabels: Record<Role, string> = {
  staff: "צוות",
  handler: "מטפל/ת בבקשות",
  admin: "אדמין"
};

const statusLabels: Record<RequestStatus, string> = {
  new: "חדשה",
  progress: "בטיפול",
  waiting: "ממתינה למידע",
  closed: "נסגרה"
};

const requestTypes = [
  "התאמת טכנולוגיה מסייעת",
  "תקלה בציוד",
  "הדרכה לצוות",
  "בדיקת כלי / אפליקציה",
  "רכישה / הצטיידות",
  "אחר"
];

type RequestFilters = {
  id: string;
  subjectName: string;
  className: string;
  requestType: string;
  requesterId: string;
};

const emptyRequestFilters: RequestFilters = {
  id: "",
  subjectName: "",
  className: "",
  requestType: "all",
  requesterId: "all"
};

const deviceTypes: DeviceType[] = ["מחשב", "אייפד", "מחשב מיקוד מבט", "אייפד פרו"];
const careProviders: CareProvider[] = ["משרד הבריאות", "משרד החינוך"];

const initialStudents: Student[] = [
  {
    id: 1,
    fullName: "נועה לוי",
    className: "ג׳ תקשורת",
    deviceType: "אייפד",
    careProvider: "משרד החינוך",
    accessibilityDate: "09/25",
    deviceResponsibility: "רכזת תקשוב",
    deviceResponsibilityPhone: "03-0000000",
    deviceResponsibilityEmail: "tikshuv@mashi.school",
    accessories: "מגן קשיח, מקלדת בלוטות׳",
    appleId: "noa.apple@mashi.school",
    applePassword: "נשמר בכספת בית הספר",
    active: true
  },
  {
    id: 2,
    fullName: "יואב כהן",
    className: "ד׳1",
    deviceType: "מחשב מיקוד מבט",
    careProvider: "משרד הבריאות",
    accessibilityDate: "11/25",
    deviceResponsibility: "קלינאית תקשורת",
    deviceResponsibilityPhone: "03-0000001",
    deviceResponsibilityEmail: "clinic@mashi.school",
    accessories: "מתקן שולחני, זרוע למסך",
    active: true
  },
  {
    id: 3,
    fullName: "מיכל אברהם",
    className: "ב׳2",
    deviceType: "מחשב",
    careProvider: "משרד החינוך",
    accessibilityDate: "02/26",
    deviceResponsibility: "מחנכת הכיתה",
    deviceResponsibilityPhone: "03-0000002",
    deviceResponsibilityEmail: "teacher@mashi.school",
    accessories: "עכבר מותאם",
    active: true
  },
  { id: 4, fullName: "כיתת הדרכה קבוצתית", className: "קבוצה רב גילית", active: true }
];

const initialUsers: User[] = [
  { id: 1, name: "דנה רוזן", email: "dana@mashi.school", role: "staff", classNames: ["ג׳ תקשורת", "ד׳1"], active: true },
  { id: 2, name: "רותם הדר", email: "rotem@mashi.school", role: "handler", active: true },
  { id: 3, name: "אורי מנהל", email: "admin@mashi.school", role: "admin", active: true }
];

const initialRequests: TechRequest[] = [
  {
    id: 101,
    requesterId: 1,
    subjectType: "student",
    studentId: 1,
    subjectName: "נועה לוי",
    className: "ג׳ תקשורת",
    requestType: "התאמת טכנולוגיה מסייעת",
    description: "נדרשת התאמת כלי תקשורת תומכת לשיעורי שפה.",
    attempted: "נוסה שימוש בלוח מודפס, אך נדרש פתרון דיגיטלי נגיש.",
    status: "new",
    createdAt: "23.06.2026"
  },
  {
    id: 102,
    requesterId: 1,
    subjectType: "class",
    subjectName: "כיתה ד׳1",
    className: "ד׳1",
    requestType: "הדרכה לצוות",
    description: "מבקשות הדרכה קצרה על שימוש בטאבלטים בפעילות קבוצתית.",
    attempted: "",
    status: "progress",
    createdAt: "20.06.2026",
    internalNote: "לתאם עם רותם לשבוע הבא."
  },
  {
    id: 103,
    requesterId: 2,
    subjectType: "student",
    studentId: 3,
    subjectName: "מיכל אברהם",
    className: "ב׳2",
    requestType: "תקלה בציוד",
    description: "המחשב התקשורתי לא נטען באופן יציב במהלך היום.",
    attempted: "הוחלף מטען, הבעיה נמשכת.",
    status: "waiting",
    createdAt: "24.06.2026"
  }
];

const navByRole: Record<Role, { view: View; label: string }[]> = {
  staff: [
    { view: "myRequests", label: "הבקשות שלי" },
    { view: "newRequest", label: "בקשה חדשה" }
  ],
  handler: [
    { view: "manageRequests", label: "ניהול בקשות" },
    { view: "myRequests", label: "הבקשות שלי" },
    { view: "newRequest", label: "בקשה חדשה" }
  ],
  admin: [
    { view: "manageRequests", label: "ניהול בקשות" },
    { view: "myRequests", label: "הבקשות שלי" },
    { view: "newRequest", label: "בקשה חדשה" },
    { view: "users", label: "משתמשים" },
    { view: "students", label: "תלמידים" }
  ]
};

function today() {
  return new Intl.DateTimeFormat("he-IL").format(new Date());
}

function displayDate(value?: string) {
  if (!value) return today();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("he-IL").format(parsed);
}

function parseClassList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatClassList(classNames?: string[]) {
  return classNames?.join(", ") ?? "";
}

function isAppleDevice(deviceType?: DeviceType) {
  return deviceType === "אייפד" || deviceType === "אייפד פרו";
}

function mapUser(row: any): User {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    classNames: row.class_names ?? [],
    active: row.active
  };
}

function mapStudent(row: any): Student {
  return {
    id: Number(row.id),
    fullName: row.full_name,
    className: row.class_name,
    deviceType: row.device_type ?? undefined,
    careProvider: row.care_provider ?? undefined,
    accessibilityDate: row.accessibility_date ?? undefined,
    deviceResponsibility: row.device_responsibility ?? undefined,
    deviceResponsibilityPhone: row.device_responsibility_phone ?? undefined,
    deviceResponsibilityEmail: row.device_responsibility_email ?? undefined,
    accessories: row.accessories ?? undefined,
    appleId: row.apple_id ?? undefined,
    applePassword: row.apple_password ?? undefined,
    active: row.active
  };
}

function mapRequest(row: any): TechRequest {
  return {
    id: Number(row.id),
    requesterId: Number(row.requester_id),
    subjectType: row.subject_type,
    studentId: row.student_id ? Number(row.student_id) : undefined,
    subjectName: row.subject_name,
    className: row.class_name,
    requestType: row.request_type,
    description: row.description,
    attempted: row.attempted ?? "",
    status: row.status,
    createdAt: displayDate(row.created_at),
    internalNote: row.internal_note ?? undefined,
    closingMessage: row.closing_message ?? undefined
  };
}

function userPayload(user: User) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    class_names: user.classNames ?? [],
    active: user.active
  };
}

function studentPayload(student: Student, includeResponsibilityContacts = true) {
  const payload: Record<string, unknown> = {
    full_name: student.fullName,
    class_name: student.className,
    device_type: student.deviceType ?? null,
    care_provider: student.careProvider ?? null,
    accessibility_date: student.accessibilityDate || null,
    device_responsibility: student.deviceResponsibility || null,
    accessories: student.accessories || null,
    apple_id: student.appleId || null,
    apple_password: student.applePassword || null,
    active: student.active
  };

  if (includeResponsibilityContacts) {
    payload.device_responsibility_phone = student.deviceResponsibilityPhone || null;
    payload.device_responsibility_email = student.deviceResponsibilityEmail || null;
  }

  return payload;
}

function requestPayload(request: TechRequest) {
  return {
    requester_id: request.requesterId,
    subject_type: request.subjectType,
    student_id: request.studentId ?? null,
    subject_name: request.subjectName,
    class_name: request.className,
    request_type: request.requestType,
    description: request.description,
    attempted: request.attempted,
    status: request.status,
    internal_note: request.internalNote ?? null,
    closing_message: request.closingMessage ?? null,
    updated_at: new Date().toISOString()
  };
}

export default function Home() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [view, setView] = useState<View>("login");
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [requests, setRequests] = useState<TechRequest[]>(initialRequests);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(101);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [dataLoaded, setDataLoaded] = useState(!isSupabaseConfigured);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [toast, setToast] = useState("");
  const [studentResponsibilityContactsSupported, setStudentResponsibilityContactsSupported] = useState(!isSupabaseConfigured);

  const authProfile = authEmail
    ? users.find((user) => user.email.toLowerCase() === authEmail.toLowerCase() && user.active) ?? null
    : null;
  const currentUser = (isSupabaseConfigured ? authProfile : users.find((user) => user.id === currentUserId)) ?? null;
  const role = currentUser?.role ?? "staff";
  const selectedRequest = requests.find((request) => request.id === selectedRequestId);
  const selectedRequestStudent = students.find((student) => student.id === selectedRequest?.studentId);
  const isAuthenticated = Boolean(currentUser);
  const canManage = currentUser?.role === "handler" || currentUser?.role === "admin";

  function navigate(nextView: View) {
    setView(nextView);
    setToast("");
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3600);
  }

  function login(userId: number) {
    const user = users.find((item) => item.id === userId);
    if (!user) return;
    setCurrentUserId(user.id);
    setView(user.role === "staff" ? "myRequests" : "manageRequests");
    showToast(`נכנסת בתור ${user.name} (${roleLabels[user.role]}).`);
  }

  async function logout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setAuthEmail(null);
    }
    setCurrentUserId(null);
    setView("login");
    setToast("");
  }

  async function ensureApprovedEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!supabase) {
      showToast("Supabase לא מוגדר בסביבה הזו.");
      return null;
    }

    const { data: approvedUsers, error: approvalError } = await supabase
      .from("app_users")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("active", true)
      .limit(1);

    if (approvalError) {
      showToast("לא הצלחנו לבדוק הרשאות משתמשת. נסו שוב בעוד רגע.");
      return null;
    }

    if (!approvedUsers?.length) {
      showToast("המייל לא רשום במערכת או שהמשתמשת אינה פעילה. פנו לאדמין.");
      return null;
    }

    return normalizedEmail;
  }

  async function signInWithPassword(email: string, password: string) {
    const normalizedEmail = await ensureApprovedEmail(email);
    if (!normalizedEmail || !supabase) return;

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error) {
      showToast("הכניסה נכשלה. בדקו מייל וסיסמה, או הגדירו סיסמה חדשה.");
      return;
    }

    showToast("נכנסת למערכת.");
  }

  async function createPassword(email: string, password: string) {
    const normalizedEmail = await ensureApprovedEmail(email);
    if (!normalizedEmail || !supabase) return;

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      showToast("לא הצלחנו ליצור סיסמה. אם כבר נוצר חשבון, השתמשו באיפוס סיסמה.");
      return;
    }

    showToast("החשבון נוצר. אם נשלח מייל אישור, אשרו אותו ואז התחברו עם הסיסמה.");
  }

  async function sendPasswordReset(email: string) {
    const normalizedEmail = await ensureApprovedEmail(email);
    if (!normalizedEmail || !supabase) return;

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: window.location.origin
    });

    if (error) {
      showToast("שליחת איפוס הסיסמה נכשלה. נסו שוב בעוד רגע.");
      return;
    }

    showToast("שלחנו קישור לאיפוס סיסמה למייל.");
  }

  async function updatePassword(password: string) {
    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      showToast("עדכון הסיסמה נכשל. פתחו שוב את קישור האיפוס ונסו שוב.");
      return;
    }

    setPasswordRecovery(false);
    showToast("הסיסמה עודכנה. אפשר להמשיך למערכת.");
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    const authClient = supabase;

    authClient.auth.getSession().then(async ({ data }) => {
      if (data.session?.user.email) {
        setAuthEmail(data.session.user.email);
        setAuthLoading(false);
        return;
      }

      const { data: userData } = await authClient.auth.getUser();
      setAuthEmail(userData.user?.email ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = authClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setView("login");
      }
      setAuthEmail(session?.user.email ?? null);
      if (session?.user.email) {
        setAuthNotice("");
      }
      if (!session) {
        setCurrentUserId(null);
        setView("login");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || authLoading || !dataLoaded) return;
    if (!authEmail) {
      setCurrentUserId(null);
      setView("login");
      setAuthNotice("");
      return;
    }

    const approvedUser = users.find((user) => user.email.toLowerCase() === authEmail.toLowerCase() && user.active);
    if (!approvedUser) {
      setCurrentUserId(null);
      setView("login");
      setAuthNotice(`המייל ${authEmail} מחובר ב-Supabase אבל לא מוגדר כמשתמש פעיל במערכת. פנו לאדמין.`);
      return;
    }

    setAuthNotice("");
    setCurrentUserId(approvedUser.id);
    setView((currentView) => currentView === "login" ? (approvedUser.role === "staff" ? "myRequests" : "manageRequests") : currentView);
  }, [authEmail, authLoading, dataLoaded, users]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    async function loadData() {
      const [usersResult, studentsResult, requestsResult, contactColumnsResult] = await Promise.all([
        supabase!.from("app_users").select("*").order("id"),
        supabase!.from("students").select("*").order("full_name"),
        supabase!.from("tech_requests").select("*").order("created_at", { ascending: false }),
        supabase!.from("students").select("device_responsibility_phone, device_responsibility_email").limit(1)
      ]);

      if (usersResult.error || studentsResult.error || requestsResult.error) {
        showToast("לא הצלחתי לטעון נתונים מ-Supabase, מוצגים נתוני דמו מקומיים.");
        setDataLoaded(true);
        return;
      }

      setStudentResponsibilityContactsSupported(!contactColumnsResult.error);
      setUsers((usersResult.data ?? []).map(mapUser));
      setStudents((studentsResult.data ?? []).map(mapStudent));
      setRequests((requestsResult.data ?? []).map(mapRequest));
      setSelectedRequestId(requestsResult.data?.[0]?.id ? Number(requestsResult.data[0].id) : null);
      setDataLoaded(true);
      showToast("הנתונים נטענו מהדאטה בייס.");
    }

    loadData();
  }, []);

  async function createRequest(request: TechRequest) {
    if (!isSupabaseConfigured || !supabase) {
      setRequests((items) => [request, ...items]);
      setSelectedRequestId(request.id);
      showToast("הבקשה נשלחה ונשמרה כבקשה חדשה.");
      navigate(canManage ? "manageRequests" : "myRequests");
      return;
    }

    const { data, error } = await supabase.from("tech_requests").insert(requestPayload(request)).select("*").single();
    if (error) {
      showToast("שמירת הבקשה בדאטה בייס נכשלה.");
      return;
    }
    const saved = mapRequest(data);
    setRequests((items) => [saved, ...items]);
    setSelectedRequestId(saved.id);
    showToast("הבקשה נשמרה בדאטה בייס.");
    navigate(canManage ? "manageRequests" : "myRequests");
  }

  async function updateRequest(updated: TechRequest, successMessage = "השינוי נשמר בדאטה בייס.") {
    if (!isSupabaseConfigured || !supabase) {
      setRequests((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedRequestId(updated.id);
      showToast(successMessage);
      return;
    }

    const { data, error } = await supabase
      .from("tech_requests")
      .update(requestPayload(updated))
      .eq("id", updated.id)
      .select("*")
      .single();
    if (error) {
      showToast("שמירת הבקשה בדאטה בייס נכשלה.");
      return;
    }
    const saved = mapRequest(data);
    setRequests((items) => items.map((item) => (item.id === saved.id ? saved : item)));
    setSelectedRequestId(saved.id);
    showToast(successMessage);
  }

  async function createUser(user: User, initialPassword?: string) {
    if (!isSupabaseConfigured || !supabase) {
      setUsers((items) => [...items, user]);
      showToast("המשתמשת נוספה לרשימת ההזמנות.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      showToast("צריך להתחבר מחדש כדי לנהל משתמשים.");
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        role: user.role,
        classNames: user.classNames ?? [],
        password: initialPassword
      })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.user) {
      const message = result?.error === "missing_service_role_key"
        ? "צריך להגדיר SUPABASE_SERVICE_ROLE_KEY ב-Vercel כדי שאדמין יוכל ליצור סיסמה."
        : "שמירת המשתמשת או הסיסמה הראשונית נכשלה.";
      showToast(message);
      return;
    }

    const saved = mapUser(result.user);
    setUsers((items) => {
      const exists = items.some((item) => item.email.toLowerCase() === saved.email.toLowerCase() || item.id === saved.id);
      return exists
        ? items.map((item) => item.email.toLowerCase() === saved.email.toLowerCase() || item.id === saved.id ? saved : item)
        : [...items, saved];
    });
    showToast("המשתמשת נשמרה והסיסמה הראשונית הוגדרה.");
  }

  async function patchUser(id: number, patch: Partial<User>) {
    const current = users.find((user) => user.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    if (!isSupabaseConfigured || !supabase) {
      setUsers((items) => items.map((item) => (item.id === id ? updated : item)));
      return;
    }
    const { data, error } = await supabase.from("app_users").update(userPayload(updated)).eq("id", id).select("*").single();
    if (error) {
      showToast("שמירת המשתמשת בדאטה בייס נכשלה.");
      return;
    }
    setUsers((items) => items.map((item) => (item.id === id ? mapUser(data) : item)));
  }

  async function deleteUser(user: User) {
    if (user.id === currentUser?.id) {
      showToast("אי אפשר למחוק את המשתמשת המחוברת כרגע.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      const hasRequests = requests.some((request) => request.requesterId === user.id);
      setUsers((items) => hasRequests
        ? items.map((item) => item.id === user.id ? { ...item, active: false } : item)
        : items.filter((item) => item.id !== user.id)
      );
      showToast(hasRequests ? "המשתמשת הושבתה כדי לשמור היסטוריית בקשות." : "המשתמשת נמחקה.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      showToast("צריך להתחבר מחדש כדי למחוק משתמשות.");
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ id: user.id, email: user.email })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      const message = result?.error === "cannot_delete_self"
        ? "אי אפשר למחוק את המשתמשת המחוברת כרגע."
        : result?.error === "missing_service_role_key"
          ? "צריך להגדיר SUPABASE_SERVICE_ROLE_KEY ב-Vercel כדי למחוק משתמשות מ-Auth."
          : "מחיקת המשתמשת נכשלה.";
      showToast(message);
      return;
    }

    if (result?.mode === "disabled" && result.user) {
      const saved = mapUser(result.user);
      setUsers((items) => items.map((item) => item.id === saved.id ? saved : item));
      showToast("המשתמשת הושבתה ונחסמה מכניסה, כדי לשמור היסטוריית בקשות.");
      return;
    }

    setUsers((items) => items.filter((item) => item.id !== user.id));
    showToast("המשתמשת נמחקה ונחסמה מכניסה.");
  }

  async function createStudent(student: Student) {
    if (!isSupabaseConfigured || !supabase) {
      setStudents((items) => [...items, student]);
      showToast("התלמיד/ה נוספו לרשימה.");
      return;
    }
    const { data, error } = await supabase.from("students").insert(studentPayload(student, studentResponsibilityContactsSupported)).select("*").single();
    if (error) {
      showToast("שמירת התלמיד/ה בדאטה בייס נכשלה.");
      return;
    }
    setStudents((items) => [...items, mapStudent(data)]);
    showToast("התלמיד/ה נשמרו בדאטה בייס.");
  }

  async function updateStudent(student: Student) {
    if (!isSupabaseConfigured || !supabase) {
      setStudents((items) => items.map((item) => (item.id === student.id ? student : item)));
      showToast("פרטי התלמיד/ה נשמרו.");
      return;
    }
    const { data, error } = await supabase.from("students").update(studentPayload(student, studentResponsibilityContactsSupported)).eq("id", student.id).select("*").single();
    if (error) {
      showToast("שמירת התלמיד/ה בדאטה בייס נכשלה.");
      return;
    }
    setStudents((items) => items.map((item) => (item.id === student.id ? mapStudent(data) : item)));
    showToast("פרטי התלמיד/ה נשמרו בדאטה בייס.");
  }

  async function importStudents(newStudents: Student[]) {
    if (!isSupabaseConfigured || !supabase) {
      setStudents((items) => [...items, ...newStudents]);
      showToast(`${newStudents.length} תלמידים נוספו מהרשימה שהודבקה.`);
      return;
    }
    const { data, error } = await supabase.from("students").insert(newStudents.map((student) => studentPayload(student, studentResponsibilityContactsSupported))).select("*");
    if (error) {
      showToast("יבוא התלמידים לדאטה בייס נכשל.");
      return;
    }
    setStudents((items) => [...items, ...(data ?? []).map(mapStudent)]);
    showToast(`${data?.length ?? 0} תלמידים נשמרו בדאטה בייס.`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src="/mashi-logo.png" alt="בית ספר משי" />
          </div>
          <h1>בקשות טכנולוגיה מסייעת</h1>
          <p>ניהול פניות צוות לבית ספר משי</p>
          <div className="brand-dots" aria-hidden="true">
            <span className="dot-yellow" />
            <span className="dot-lime" />
            <span className="dot-cyan" />
            <span className="dot-coral" />
          </div>
        </div>

        {isAuthenticated ? (
          <nav className="nav-list" aria-label="ניווט ראשי">
            {navByRole[role].map((item) => (
              <button
                key={item.view}
                className={`nav-button ${view === item.view ? "active" : ""}`}
                onClick={() => navigate(item.view)}
              >
                <span>{item.label}</span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </nav>
        ) : (
          <nav className="nav-list" aria-label="ניווט ראשי">
            <button className="nav-button active" onClick={() => navigate("login")}>
              <span>כניסה למערכת</span>
              <span aria-hidden="true">›</span>
            </button>
          </nav>
        )}

        {isAuthenticated && currentUser && (
          <div className="role-switcher">
            <label htmlFor={isSupabaseConfigured ? "currentUser" : "demoUser"}>משתמשת מחוברת</label>
            {isSupabaseConfigured ? (
              <div className="current-user" id="currentUser">
                <strong>{currentUser.name}</strong>
                <span>{currentUser.email}</span>
                <span>{roleLabels[currentUser.role]}</span>
              </div>
            ) : (
              <select id="demoUser" value={currentUser.id} onChange={(event) => login(Number(event.target.value))}>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {roleLabels[user.role]}
                  </option>
                ))}
              </select>
            )}
            <button className="nav-button" style={{ marginTop: 10 }} onClick={logout}>
              <span>יציאה</span>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}
      </aside>

      <section className="main">
        {toast && <div className="toast">{toast}</div>}

        {view === "login" && (
          <LoginScreen
            users={users}
            onLogin={login}
            onPasswordLogin={signInWithPassword}
            onCreatePassword={createPassword}
            onPasswordReset={sendPasswordReset}
            onUpdatePassword={updatePassword}
            isPasswordMode={isSupabaseConfigured}
            isPasswordRecovery={passwordRecovery}
            isLoading={authLoading || (isSupabaseConfigured && !dataLoaded)}
            authNotice={authNotice}
          />
        )}
        {view === "myRequests" && currentUser && (
          <MyRequests
            currentUser={currentUser}
            requests={requests}
            users={users}
            selectedRequestId={selectedRequestId}
            onNew={() => navigate("newRequest")}
            onOpen={(id) => {
              setSelectedRequestId(id);
              navigate(canManage ? "manageRequests" : "myRequests");
            }}
          />
        )}
        {view === "newRequest" && currentUser && (
          <NewRequest
            students={students}
            currentUser={currentUser}
            onCreate={createRequest}
          />
        )}
        {view === "manageRequests" && canManage && (
          <ManageRequests
            requests={requests}
            users={users}
            selectedRequest={selectedRequest}
            selectedRequestStudent={selectedRequestStudent}
            onSelect={setSelectedRequestId}
            onUpdate={(updated) => updateRequest(updated)}
            onClose={(updated) => updateRequest(updated, "הבקשה נסגרה ונשמרה בדאטה בייס.")}
          />
        )}
        {view === "users" && role === "admin" && currentUser && (
          <UsersAdmin
            users={users}
            currentUserId={currentUser.id}
            onInvite={createUser}
            onRoleChange={(id, nextRole) => patchUser(id, { role: nextRole })}
            onClassChange={(id, classNamesText) => patchUser(id, { classNames: parseClassList(classNamesText) })}
            onDelete={deleteUser}
          />
        )}
        {view === "students" && role === "admin" && (
          <StudentsAdmin
            students={students}
            requests={requests}
            onAdd={createStudent}
            onUpdate={updateStudent}
            onImport={importStudents}
          />
        )}
      </section>
    </main>
  );
}

function LoginScreen({
  users,
  onLogin,
  onPasswordLogin,
  onCreatePassword,
  onPasswordReset,
  onUpdatePassword,
  isPasswordMode,
  isPasswordRecovery,
  isLoading,
  authNotice
}: {
  users: User[];
  onLogin: (userId: number) => void;
  onPasswordLogin: (email: string, password: string) => void | Promise<void>;
  onCreatePassword: (email: string, password: string) => void | Promise<void>;
  onPasswordReset: (email: string) => void | Promise<void>;
  onUpdatePassword: (password: string) => void | Promise<void>;
  isPasswordMode: boolean;
  isPasswordRecovery: boolean;
  isLoading: boolean;
  authNotice: string;
}) {
  const activeUsers = users.filter((user) => user.active);
  const [selectedUserId, setSelectedUserId] = useState(activeUsers[0]?.id ?? 0);
  const selectedUser = activeUsers.find((user) => user.id === selectedUserId);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "create" | "reset">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    if (isPasswordRecovery) {
      await onUpdatePassword(password);
    } else if (mode === "login") {
      await onPasswordLogin(email, password);
    } else if (mode === "create") {
      await onCreatePassword(email, password);
    } else {
      await onPasswordReset(email);
    }

    setIsSubmitting(false);
  }

  if (isLoading) {
    return (
      <>
        <Topbar title="כניסה למערכת" subtitle="בודקים אם יש התחברות פעילה." />
        <section className="panel login-card"><div className="empty">טוען...</div></section>
      </>
    );
  }

  if (isPasswordMode) {
    const title = isPasswordRecovery ? "הגדרת סיסמה חדשה" : "כניסה למערכת";
    const subtitle = isPasswordRecovery
      ? "בחרו סיסמה חדשה לחשבון."
      : mode === "create"
        ? "הגדירו סיסמה למייל שכבר אושר במערכת."
        : mode === "reset"
          ? "הכניסו מייל ונשלח קישור לאיפוס סיסמה."
          : "היכנסו עם מייל וסיסמה.";

    return (
      <>
        <Topbar title={title} subtitle={subtitle} />
        <section className="panel login-card">
          <div className="panel-body">
            {authNotice && <div className="toast">{authNotice}</div>}
            <form className="form-grid" onSubmit={submitPassword}>
              {!isPasswordRecovery && (
                <div className="field full">
                  <label htmlFor="loginEmail">מייל בית ספרי</label>
                  <input
                    id="loginEmail"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@mashi.school"
                    autoComplete="email"
                    required
                  />
                </div>
              )}
              {mode !== "reset" && (
                <div className="field full">
                  <label htmlFor="loginPassword">סיסמה</label>
                  <input
                    id="loginPassword"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={isPasswordRecovery || mode === "create" ? "new-password" : "current-password"}
                    minLength={6}
                    required
                  />
                </div>
              )}
              <div className="field full">
                <button className="btn primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "שומר..."
                    : isPasswordRecovery
                      ? "עדכון סיסמה"
                      : mode === "create"
                        ? "יצירת סיסמה"
                        : mode === "reset"
                          ? "שליחת קישור איפוס"
                          : "כניסה"}
                </button>
              </div>
            </form>
            {!isPasswordRecovery && (
              <>
                <p className="inline-hint">המערכת פתוחה רק למיילים שאושרו מראש על ידי אדמין.</p>
                <div className="button-row login-actions" style={{ marginTop: 12 }}>
                  <button className="btn" type="button" onClick={() => setMode("login")}>כניסה</button>
                  <button className="btn" type="button" onClick={() => setMode("create")}>יצירת סיסמה</button>
                  <button className="btn" type="button" onClick={() => setMode("reset")}>איפוס סיסמה</button>
                </div>
              </>
            )}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Topbar title="כניסה למערכת" subtitle="מצב דמו מקומי: בחירת המשתמש מדמה התחברות." />
      <section className="panel login-card">
        <div className="panel-body">
          <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onLogin(selectedUserId); }}>
            <div className="field">
              <label htmlFor="demoLoginUser">משתמשת</label>
              <select id="demoLoginUser" value={selectedUserId} onChange={(event) => setSelectedUserId(Number(event.target.value))}>
                {activeUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {roleLabels[user.role]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="email">מייל בית ספרי</label>
              <input id="email" type="email" value={selectedUser?.email ?? ""} readOnly />
            </div>
            <div className="field full">
              <button className="btn primary" type="submit">
                כניסה למערכת
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

function MyRequests({
  currentUser,
  requests,
  users,
  selectedRequestId,
  onNew,
  onOpen
}: {
  currentUser: User;
  requests: TechRequest[];
  users: User[];
  selectedRequestId: number | null;
  onNew: () => void;
  onOpen: (id: number) => void;
}) {
  const ownRequests = requests.filter((request) => request.requesterId === currentUser.id);
  const classRequests = requests.filter((request) => {
    const isAssignedClass = currentUser.classNames?.includes(request.className) ?? false;
    return isAssignedClass && request.requesterId !== currentUser.id;
  });
  const visibleRequests = [...ownRequests, ...classRequests];
  const selectedStaffRequest = visibleRequests.find((request) => request.id === selectedRequestId) ?? null;
  const selectedRequester = users.find((user) => user.id === selectedStaffRequest?.requesterId);
  const openCount = visibleRequests.filter((request) => request.status !== "closed").length;
  const waitingCount = visibleRequests.filter((request) => request.status === "waiting").length;
  const closedCount = visibleRequests.filter((request) => request.status === "closed").length;

  const subtitle = currentUser.classNames?.length
    ? `מעקב אחרי בקשות שפתחת ובקשות עבור הכיתות: ${formatClassList(currentUser.classNames)}.`
    : "מעקב פשוט אחרי הבקשות שפתחת.";

  return (
    <>
      <Topbar title="הבקשות שלי" subtitle={subtitle} action={<button className="btn primary" onClick={onNew}>בקשה חדשה</button>} />

      <div className="staff-overview" aria-label="תקציר בקשות">
        <div className="staff-overview-item tone-progress">
          <strong>{openCount}</strong>
          <span>פתוחות למעקב</span>
        </div>
        <div className="staff-overview-item tone-waiting">
          <strong>{waitingCount}</strong>
          <span>ממתינות למידע</span>
        </div>
        <div className="staff-overview-item tone-closed">
          <strong>{closedCount}</strong>
          <span>נסגרו</span>
        </div>
      </div>

      <div className="staff-request-grid">
        <StaffRequestSection
          title="בקשות שפתחתי"
          subtitle="כל הפניות שנשלחו מהמשתמשת שלך."
          emptyText="עדיין לא פתחת בקשות. אפשר להתחיל מבקשה חדשה."
          requests={ownRequests}
          users={users}
          selectedId={selectedRequestId}
          onOpen={onOpen}
        />
        <StaffRequestSection
          title="בקשות של הכיתות שלי"
          subtitle={currentUser.classNames?.length ? formatClassList(currentUser.classNames) : "לא הוגדרו כיתות למשתמשת הזו."}
          emptyText="אין כרגע בקשות נוספות לכיתות שלך."
          requests={classRequests}
          users={users}
          selectedId={selectedRequestId}
          onOpen={onOpen}
        />
      </div>

      <StaffRequestPreview request={selectedStaffRequest} requester={selectedRequester} currentUser={currentUser} />
    </>
  );
}

function StaffRequestSection({
  title,
  subtitle,
  emptyText,
  requests,
  users,
  selectedId,
  onOpen
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  requests: TechRequest[];
  users: User[];
  selectedId: number | null;
  onOpen: (id: number) => void;
}) {
  return (
    <section className="panel staff-request-section">
      <div className="panel-header staff-section-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="section-count">{requests.length}</span>
      </div>
      <div className="panel-body">
        {requests.length ? (
          <RequestCards requests={requests} users={users} selectedId={selectedId} onOpen={onOpen} />
        ) : (
          <div className="empty soft-empty">{emptyText}</div>
        )}
      </div>
    </section>
  );
}

function StaffRequestPreview({
  request,
  requester,
  currentUser
}: {
  request: TechRequest | null;
  requester?: User;
  currentUser: User;
}) {
  if (!request) {
    return (
      <section className="panel staff-preview-panel">
        <div className="empty soft-empty">בחרי בקשה מהרשימות כדי לראות את התוכן המלא שלה כאן.</div>
      </section>
    );
  }

  const isOwnRequest = request.requesterId === currentUser.id;

  return (
    <section className="panel staff-preview-panel">
      <div className="panel-header staff-preview-header">
        <div>
          <h3>פנייה #{request.id}</h3>
          <p>{isOwnRequest ? "בקשה שפתחת" : `בקשה מהכיתה ${request.className}`}</p>
        </div>
        <StatusPill status={request.status} />
      </div>
      <div className="panel-body staff-preview-body">
        <div className="staff-preview-summary">
          <div>
            <span>עבור</span>
            <strong>{request.subjectName}</strong>
          </div>
          <div>
            <span>כיתה</span>
            <strong>{request.className}</strong>
          </div>
          <div>
            <span>סוג</span>
            <strong>{request.requestType}</strong>
          </div>
          <div>
            <span>תאריך פתיחה</span>
            <strong>{request.createdAt}</strong>
          </div>
        </div>
        {!isOwnRequest && requester && (
          <div className="staff-preview-note">
            <span>נפתחה על ידי</span>
            <strong>{requester.name}</strong>
          </div>
        )}
        <div className="staff-readable-block">
          <span>תיאור הבקשה</span>
          <p>{request.description}</p>
        </div>
        <div className="staff-readable-block">
          <span>מה כבר נוסה</span>
          <p>{request.attempted || "לא הוזן מידע נוסף."}</p>
        </div>
        {request.closingMessage && (
          <div className="staff-readable-block closing">
            <span>הודעת סגירה</span>
            <p>{request.closingMessage}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function NewRequest({
  students,
  currentUser,
  onCreate
}: {
  students: Student[];
  currentUser: User;
  onCreate: (request: TechRequest) => void | Promise<void>;
}) {
  const activeStudents = students.filter((student) => student.active);
  const [subjectType, setSubjectType] = useState<SubjectType>("student");
  const [studentId, setStudentId] = useState(activeStudents[0]?.id ?? 0);
  const [classSubject, setClassSubject] = useState("");
  const [requestType, setRequestType] = useState(requestTypes[0]);
  const [description, setDescription] = useState("");
  const [attempted, setAttempted] = useState("");

  const selectedStudent = activeStudents.find((student) => student.id === studentId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request: TechRequest = {
      id: Date.now(),
      requesterId: currentUser.id,
      subjectType,
      studentId: subjectType === "student" ? selectedStudent?.id : undefined,
      subjectName: subjectType === "student" ? selectedStudent?.fullName ?? "" : classSubject,
      className: subjectType === "student" ? selectedStudent?.className ?? "" : classSubject,
      requestType,
      description,
      attempted,
      status: "new",
      createdAt: today()
    };

    if (!request.subjectName || !description.trim()) return;
    onCreate(request);
  }

  return (
    <>
      <Topbar title="בקשה חדשה" subtitle="בחרו תלמיד/ה או כיתה, תארו בקצרה את הצורך, והבקשה תעבור לטיפול." />
      <section className="panel new-request-panel">
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <div className="field full">
              <label>עבור מי הבקשה?</label>
              <div className="segmented">
                <button type="button" className={`segment ${subjectType === "student" ? "active" : ""}`} onClick={() => setSubjectType("student")}>
                  תלמיד/ה
                </button>
                <button type="button" className={`segment ${subjectType === "class" ? "active" : ""}`} onClick={() => setSubjectType("class")}>
                  כיתה / קבוצה
                </button>
              </div>
            </div>

            {subjectType === "student" ? (
              <>
                <div className="field">
                  <label htmlFor="student">שם תלמיד/ה</label>
                  <select id="student" value={studentId} onChange={(event) => setStudentId(Number(event.target.value))}>
                    {activeStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="studentClass">כיתה</label>
                  <input id="studentClass" value={selectedStudent?.className ?? ""} readOnly />
                  <span className="field-help">הכיתה מתמלאת אוטומטית לפי רשימת התלמידים.</span>
                </div>
              </>
            ) : (
              <div className="field full">
                <label htmlFor="classSubject">שם הכיתה / הקבוצה</label>
                <input id="classSubject" value={classSubject} onChange={(event) => setClassSubject(event.target.value)} placeholder="לדוגמה: כיתה ג׳ תקשורת או קבוצת קריאה" />
              </div>
            )}

            <div className="field full">
              <label htmlFor="requestType">סוג הבקשה</label>
              <select id="requestType" value={requestType} onChange={(event) => setRequestType(event.target.value)}>
                {requestTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="description">תיאור הצורך</label>
              <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="מה הצורך? מתי זה קורה? מה יעזור לנו להבין את הבקשה?" required />
            </div>
            <div className="field full">
              <label htmlFor="attempted">מה כבר נוסה?</label>
              <textarea id="attempted" value={attempted} onChange={(event) => setAttempted(event.target.value)} placeholder="אם כבר ניסיתם פתרון, החלפתם ציוד או יש מידע נוסף - כתבו כאן." />
            </div>
            <div className="field full">
              <button className="btn primary" type="submit">
                שליחת בקשה
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

function ManageRequests({
  requests,
  users,
  selectedRequest,
  selectedRequestStudent,
  onSelect,
  onUpdate,
  onClose
}: {
  requests: TechRequest[];
  users: User[];
  selectedRequest?: TechRequest;
  selectedRequestStudent?: Student;
  onSelect: (id: number) => void;
  onUpdate: (request: TechRequest) => void | Promise<void>;
  onClose: (request: TechRequest) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RequestStatus | "all">("all");
  const [requestFilters, setRequestFilters] = useState<RequestFilters>(emptyRequestFilters);
  const [closingRequest, setClosingRequest] = useState<TechRequest | null>(null);

  function updateRequestFilter(field: keyof RequestFilters, value: string) {
    setRequestFilters((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setRequestFilters(emptyRequestFilters);
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const idFilter = requestFilters.id.trim();
    const subjectFilter = requestFilters.subjectName.trim().toLowerCase();
    const classFilter = requestFilters.className.trim().toLowerCase();
    const requesterFilterId = requestFilters.requesterId === "all" ? null : Number(requestFilters.requesterId);

    return requests.filter((request) => {
      const requester = users.find((user) => user.id === request.requesterId);
      const searchText = [
        request.id,
        request.subjectName,
        request.className,
        request.requestType,
        request.description,
        request.attempted,
        request.internalNote,
        requester?.name,
        requester?.email,
        statusLabels[request.status]
      ].filter(Boolean).join(" ").toLowerCase();

      const matchesGlobalSearch = !normalizedQuery || searchText.includes(normalizedQuery);
      const matchesId = !idFilter || String(request.id).includes(idFilter);
      const matchesSubject = !subjectFilter || request.subjectName.toLowerCase().includes(subjectFilter);
      const matchesClass = !classFilter || request.className.toLowerCase().includes(classFilter);
      const matchesType = requestFilters.requestType === "all" || request.requestType === requestFilters.requestType;
      const matchesRequester = requesterFilterId === null || request.requesterId === requesterFilterId;
      const matchesStatus = status === "all" || request.status === status;

      return matchesGlobalSearch && matchesId && matchesSubject && matchesClass && matchesType && matchesRequester && matchesStatus;
    });
  }, [query, requestFilters, requests, status, users]);

  const hasActiveFilters = Boolean(
    query.trim() ||
    status !== "all" ||
    requestFilters.id.trim() ||
    requestFilters.subjectName.trim() ||
    requestFilters.className.trim() ||
    requestFilters.requestType !== "all" ||
    requestFilters.requesterId !== "all"
  );

  const stats = {
    new: requests.filter((request) => request.status === "new").length,
    progress: requests.filter((request) => request.status === "progress").length,
    waiting: requests.filter((request) => request.status === "waiting").length,
    closed: requests.filter((request) => request.status === "closed").length
  };

  return (
    <>
      <Topbar title="ניהול בקשות" subtitle="לוח עבודה למעקב, טיפול וסגירת בקשות." />
      <div className="stats-grid">
        <Stat label="חדשות" value={stats.new} tone="new" active={status === "new"} onClick={() => setStatus("new")} />
        <Stat label="בטיפול" value={stats.progress} tone="progress" active={status === "progress"} onClick={() => setStatus("progress")} />
        <Stat label="ממתינות למידע" value={stats.waiting} tone="waiting" active={status === "waiting"} onClick={() => setStatus("waiting")} />
        <Stat label="נסגרו" value={stats.closed} tone="closed" active={status === "closed"} onClick={() => setStatus("closed")} />
      </div>

      <div className="request-detail">
        <section className="panel">
          <div className="panel-header">
            <h3>{status === "all" ? "כל הבקשות" : `בקשות בסטטוס ${statusLabels[status]}`}</h3>
          </div>
          <div className="panel-body">
            <div className="filters request-filters">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי מס׳ פנייה, תלמיד, כיתה, סוג, מגישה או תוכן הבקשה" />
              <div className="filter-chips" aria-label="סינון לפי סטטוס">
                <button type="button" className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>הכול</button>
                <button type="button" className={status === "new" ? "active" : ""} onClick={() => setStatus("new")}>חדשה</button>
                <button type="button" className={status === "progress" ? "active" : ""} onClick={() => setStatus("progress")}>בטיפול</button>
                <button type="button" className={status === "waiting" ? "active" : ""} onClick={() => setStatus("waiting")}>ממתינה</button>
                <button type="button" className={status === "closed" ? "active" : ""} onClick={() => setStatus("closed")}>נסגרה</button>
              </div>
            </div>
            <div className="advanced-filter-grid" aria-label="סינון ממוקד לפי שדות">
              <div className="field compact">
                <label htmlFor="filterRequestId">מס׳ פנייה</label>
                <input id="filterRequestId" inputMode="numeric" value={requestFilters.id} onChange={(event) => updateRequestFilter("id", event.target.value)} placeholder="לדוגמה: 103" />
              </div>
              <div className="field compact">
                <label htmlFor="filterSubjectName">תלמיד/ה או כיתה</label>
                <input id="filterSubjectName" value={requestFilters.subjectName} onChange={(event) => updateRequestFilter("subjectName", event.target.value)} placeholder="שם הפנייה" />
              </div>
              <div className="field compact">
                <label htmlFor="filterClassName">כיתה</label>
                <input id="filterClassName" value={requestFilters.className} onChange={(event) => updateRequestFilter("className", event.target.value)} placeholder="לדוגמה: ד׳1" />
              </div>
              <div className="field compact">
                <label htmlFor="filterRequestType">סוג בקשה</label>
                <select id="filterRequestType" value={requestFilters.requestType} onChange={(event) => updateRequestFilter("requestType", event.target.value)}>
                  <option value="all">כל הסוגים</option>
                  {requestTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="field compact">
                <label htmlFor="filterRequester">מגישה</label>
                <select id="filterRequester" value={requestFilters.requesterId} onChange={(event) => updateRequestFilter("requesterId", event.target.value)}>
                  <option value="all">כל המגישות</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </div>
            </div>
            <div className="filter-footer">
              <span>{filtered.length} מתוך {requests.length} בקשות</span>
              {hasActiveFilters && <button className="btn" type="button" onClick={clearFilters}>איפוס סינון</button>}
            </div>
            <RequestCards requests={filtered} users={users} selectedId={selectedRequest?.id ?? null} onOpen={onSelect} />
          </div>
        </section>

        <RequestDetails
          request={selectedRequest}
          requester={users.find((user) => user.id === selectedRequest?.requesterId)}
          student={selectedRequestStudent}
          onUpdate={onUpdate}
          onClose={setClosingRequest}
        />
      </div>

      {closingRequest && (
        <CloseRequestModal
          request={closingRequest}
          onCancel={() => setClosingRequest(null)}
          onClose={(updated) => {
            setClosingRequest(null);
            onClose(updated);
          }}
        />
      )}
    </>
  );
}

function RequestCards({
  requests,
  users,
  selectedId,
  onOpen
}: {
  requests: TechRequest[];
  users: User[];
  selectedId: number | null;
  onOpen: (id: number) => void;
}) {
  if (!requests.length) {
    return <div className="empty">אין בקשות שתואמות לחיפוש כרגע.</div>;
  }

  return (
    <div className="request-card-list">
      {requests.map((request) => {
        const requester = users.find((user) => user.id === request.requesterId);
        const isSelected = selectedId === request.id;
        return (
          <button
            key={request.id}
            type="button"
            className={`request-card ${isSelected ? "selected" : ""}`}
            onClick={() => onOpen(request.id)}
          >
            <span className="request-card-topline">
              <span>#{request.id}</span>
              <StatusPill status={request.status} />
            </span>
            <strong>{request.subjectName}</strong>
            <span className="request-card-meta">{request.className} · {request.requestType}</span>
            <span className="request-card-desc">{request.description}</span>
            <span className="request-card-footer">
              <span>{requester?.name ?? "לא ידוע"}</span>
              <span>{request.createdAt}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RequestDetails({
  request,
  requester,
  student,
  onUpdate,
  onClose
}: {
  request?: TechRequest;
  requester?: User;
  student?: Student;
  onUpdate: (request: TechRequest) => void | Promise<void>;
  onClose: (request: TechRequest) => void | Promise<void>;
}) {
  const [note, setNote] = useState("");

  if (!request) {
    return (
      <section className="panel">
        <div className="empty">בחרו בקשה מהרשימה כדי לראות פרטים.</div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>בקשה #{request.id}</h3>
        <StatusPill status={request.status} />
      </div>
      <div className="panel-body detail-list">
        <div className="detail-item">
          <span>עבור</span>
          <strong>{request.subjectName}</strong>
        </div>
        <div className="detail-item">
          <span>כיתה</span>
          <strong>{request.className}</strong>
        </div>
        <div className="detail-item">
          <span>מגישה</span>
          <strong>{requester?.name ?? "לא ידוע"}</strong>
          {requester?.email && <p>{requester.email}</p>}
        </div>
        <div className="detail-item">
          <span>סוג הבקשה</span>
          <strong>{request.requestType}</strong>
        </div>
        <div className="detail-item">
          <span>תיאור הצורך</span>
          <p>{request.description}</p>
        </div>
        <div className="detail-item">
          <span>מה כבר נוסה</span>
          <p>{request.attempted || "לא הוזן מידע נוסף."}</p>
        </div>
        {student && <StudentDeviceDetails student={student} />}
        <div className="field">
          <label htmlFor="status">סטטוס</label>
          <select id="status" value={request.status} onChange={(event) => onUpdate({ ...request, status: event.target.value as RequestStatus })}>
            <option value="new">חדשה</option>
            <option value="progress">בטיפול</option>
            <option value="waiting">ממתינה למידע</option>
            <option value="closed">נסגרה</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="note">הערה פנימית</label>
          <textarea id="note" value={note || request.internalNote || ""} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="button-row">
          <button className="btn" onClick={() => onUpdate({ ...request, internalNote: note || request.internalNote })}>
            שמירת הערה
          </button>
          <button className="btn primary" onClick={() => onClose(request)}>
            סגירת בקשה
          </button>
        </div>
        {request.closingMessage && (
          <div className="detail-item">
            <span>הודעת סגירה שנשלחה</span>
            <p>{request.closingMessage}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function StudentDeviceDetails({ student }: { student: Student }) {
  return (
    <div className="detail-item">
      <span>פרטי הנגשה ומכשיר</span>
      <div className="mini-grid">
        <strong>סוג מכשיר: {student.deviceType || "לא הוזן"}</strong>
        <strong>גורם מטפל: {student.careProvider || "לא הוזן"}</strong>
        <strong>תאריך הנגשה: {student.accessibilityDate || "לא הוזן"}</strong>
        <strong>אחריות מכשיר: {student.deviceResponsibility || "לא הוזן"}</strong>
        <strong>טלפון אחריות: {student.deviceResponsibilityPhone || "לא הוזן"}</strong>
        <strong>אימייל אחריות: {student.deviceResponsibilityEmail || "לא הוזן"}</strong>
        <strong>עזרים נלווים: {student.accessories || "לא הוזן"}</strong>
        {isAppleDevice(student.deviceType) && (
          <>
            <strong>אפל איידי: {student.appleId || "לא הוזן"}</strong>
            <strong>סיסמה: {student.applePassword || "לא הוזן"}</strong>
          </>
        )}
      </div>
    </div>
  );
}

function CloseRequestModal({
  request,
  onCancel,
  onClose
}: {
  request: TechRequest;
  onCancel: () => void;
  onClose: (request: TechRequest) => void | Promise<void>;
}) {
  const [internalNote, setInternalNote] = useState(request.internalNote ?? "");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="סגירת בקשה">
      <section className="modal">
        <div className="panel-header">
          <h3>סגירת בקשה #{request.id}</h3>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="internalClose">סיכום טיפול פנימי</label>
              <textarea id="internalClose" value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="מה נעשה בפועל? מה חשוב שיישאר מתועד לצוות הטכנולוגיה?" />
            </div>
            <div className="field full">
              <label htmlFor="closeMessage">הודעה למגישה</label>
              <textarea id="closeMessage" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="לדוגמה: הבקשה טופלה, הציוד הוגדר ונמסר לכיתה. אפשר לפנות אלינו אם יש צורך בהתאמה נוספת." />
            </div>
            <label className="field full">
              <span>שליחת מייל למגישה</span>
              <select value={sendEmail ? "yes" : "no"} onChange={(event) => setSendEmail(event.target.value === "yes")}>
                <option value="yes">כן, לשלוח מייל</option>
                <option value="no">לא, רק לסגור פנימית</option>
              </select>
            </label>
            <div className="button-row">
              <button className="btn" type="button" onClick={onCancel}>
                ביטול
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() =>
                  onClose({
                    ...request,
                    status: "closed",
                    internalNote,
                    closingMessage: sendEmail ? message : ""
                  })
                }
              >
                סגירה ושמירה
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function UsersAdmin({
  users,
  currentUserId,
  onInvite,
  onRoleChange,
  onClassChange,
  onDelete
}: {
  users: User[];
  currentUserId: number;
  onInvite: (user: User, initialPassword: string) => void | Promise<void>;
  onRoleChange: (id: number, role: Role) => void | Promise<void>;
  onClassChange: (id: number, classNamesText: string) => void | Promise<void>;
  onDelete: (user: User) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [classNamesText, setClassNamesText] = useState("");
  const [initialPassword, setInitialPassword] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || initialPassword.length < 6) return;
    onInvite({
      id: Date.now(),
      name,
      email,
      role,
      classNames: role === "staff" ? parseClassList(classNamesText) : undefined,
      active: true
    }, initialPassword);
    setName("");
    setEmail("");
    setRole("staff");
    setClassNamesText("");
    setInitialPassword("");
  }

  function confirmDelete(user: User) {
    if (user.id === currentUserId) return;
    const approved = window.confirm(`למחוק את ${user.name}? אם יש לה בקשות היסטוריות היא תושבת במקום להימחק.`);
    if (approved) {
      onDelete(user);
    }
  }

  return (
    <>
      <Topbar title="ניהול משתמשים" subtitle="לאדמין בלבד: הוספת צוות, הגדרת סיסמה ראשונית ושינוי תפקידים." />
      <section className="panel">
        <div className="panel-header">
          <h3>הוספת משתמשת</h3>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label htmlFor="inviteName">שם</label>
              <input id="inviteName" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="inviteEmail">מייל</label>
              <input id="inviteEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="inviteRole">תפקיד</label>
              <select id="inviteRole" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                <option value="staff">צוות</option>
                <option value="handler">מטפל/ת בבקשות</option>
                <option value="admin">אדמין</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="inviteClass">כיתות משויכות</label>
              <input id="inviteClass" value={classNamesText} onChange={(event) => setClassNamesText(event.target.value)} placeholder="לדוגמה: ג׳ תקשורת, ד׳1" disabled={role !== "staff"} />
            </div>
            <div className="field">
              <label htmlFor="invitePassword">סיסמה ראשונית</label>
              <input id="invitePassword" type="password" value={initialPassword} onChange={(event) => setInitialPassword(event.target.value)} minLength={6} placeholder="לפחות 6 תווים" autoComplete="new-password" />
              <span className="field-help">האדמין מוסר את הסיסמה הראשונית לאשת הצוות. היא לא נשמרת בטבלה.</span>
            </div>
            <div className="field full">
              <button className="btn primary" type="submit">
                יצירת משתמשת
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header">
          <h3>משתמשים קיימים</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>מייל</th>
                <th>תפקיד</th>
                <th>כיתות משויכות</th>
                <th>סטטוס</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td data-label="שם">{user.name}</td>
                  <td data-label="מייל">{user.email}</td>
                  <td data-label="תפקיד">
                    <select value={user.role} onChange={(event) => onRoleChange(user.id, event.target.value as Role)}>
                      <option value="staff">צוות</option>
                      <option value="handler">מטפל/ת בבקשות</option>
                      <option value="admin">אדמין</option>
                    </select>
                  </td>
                  <td data-label="כיתות משויכות">
                    <input
                      value={formatClassList(user.classNames)}
                      onChange={(event) => onClassChange(user.id, event.target.value)}
                      placeholder={user.role === "staff" ? "כיתות מופרדות בפסיק" : "לא נדרש"}
                      disabled={user.role !== "staff"}
                    />
                  </td>
                  <td data-label="סטטוס">{user.active ? "פעיל" : "מושבת"}</td>
                  <td data-label="פעולות">
                    <button className="btn danger" type="button" onClick={() => confirmDelete(user)} disabled={user.id === currentUserId}>
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function StudentsAdmin({
  students,
  requests,
  onAdd,
  onUpdate,
  onImport
}: {
  students: Student[];
  requests: TechRequest[];
  onAdd: (student: Student) => void | Promise<void>;
  onUpdate: (student: Student) => void | Promise<void>;
  onImport: (students: Student[]) => void | Promise<void>;
}) {
  const [editingStudentId, setEditingStudentId] = useState<number | "new">("new");
  const editingStudent = students.find((student) => student.id === editingStudentId);

  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType>("מחשב");
  const [careProvider, setCareProvider] = useState<CareProvider>("משרד החינוך");
  const [accessibilityDate, setAccessibilityDate] = useState("");
  const [deviceResponsibility, setDeviceResponsibility] = useState("");
  const [deviceResponsibilityPhone, setDeviceResponsibilityPhone] = useState("");
  const [deviceResponsibilityEmail, setDeviceResponsibilityEmail] = useState("");
  const [accessories, setAccessories] = useState("");
  const [appleId, setAppleId] = useState("");
  const [applePassword, setApplePassword] = useState("");
  const [bulk, setBulk] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [historyStudentId, setHistoryStudentId] = useState<number | null>(null);

  const studentRequestCounts = useMemo(() => {
    const counts = new Map<number, number>();
    requests.forEach((request) => {
      if (!request.studentId) return;
      counts.set(request.studentId, (counts.get(request.studentId) ?? 0) + 1);
    });
    return counts;
  }, [requests]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase();
    if (!normalizedSearch) return students;

    return students.filter((student) => {
      const requestCount = studentRequestCounts.get(student.id) ?? 0;
      const searchText = [
        student.fullName,
        student.className,
        student.deviceType,
        student.careProvider,
        student.accessibilityDate,
        student.deviceResponsibility,
        student.deviceResponsibilityPhone,
        student.deviceResponsibilityEmail,
        student.accessories,
        requestCount
      ].filter(Boolean).join(" ").toLowerCase();

      return searchText.includes(normalizedSearch);
    });
  }, [studentRequestCounts, studentSearch, students]);

  const historyStudent = historyStudentId ? students.find((student) => student.id === historyStudentId) : null;
  const historyRequests = useMemo(() => {
    if (!historyStudentId) return [];
    return requests.filter((request) => request.studentId === historyStudentId);
  }, [historyStudentId, requests]);

  function loadStudent(student: Student) {
    setEditingStudentId(student.id);
    setFullName(student.fullName);
    setClassName(student.className);
    setDeviceType(student.deviceType ?? "מחשב");
    setCareProvider(student.careProvider ?? "משרד החינוך");
    setAccessibilityDate(student.accessibilityDate ?? "");
    setDeviceResponsibility(student.deviceResponsibility ?? "");
    setDeviceResponsibilityPhone(student.deviceResponsibilityPhone ?? "");
    setDeviceResponsibilityEmail(student.deviceResponsibilityEmail ?? "");
    setAccessories(student.accessories ?? "");
    setAppleId(student.appleId ?? "");
    setApplePassword(student.applePassword ?? "");
  }

  function resetForm() {
    setEditingStudentId("new");
    setFullName("");
    setClassName("");
    setDeviceType("מחשב");
    setCareProvider("משרד החינוך");
    setAccessibilityDate("");
    setDeviceResponsibility("");
    setDeviceResponsibilityPhone("");
    setDeviceResponsibilityEmail("");
    setAccessories("");
    setAppleId("");
    setApplePassword("");
  }

  function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName.trim() || !className.trim()) return;
    const student: Student = {
      id: editingStudent?.id ?? Date.now(),
      fullName,
      className,
      deviceType,
      careProvider,
      accessibilityDate,
      deviceResponsibility,
      deviceResponsibilityPhone,
      deviceResponsibilityEmail,
      accessories,
      appleId: isAppleDevice(deviceType) ? appleId : undefined,
      applePassword: isAppleDevice(deviceType) ? applePassword : undefined,
      active: editingStudent?.active ?? true
    };

    if (editingStudent) {
      onUpdate(student);
    } else {
      onAdd(student);
    }
    resetForm();
  }

  function importStudents() {
    const parsed = bulk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [name, classValue] = line.split(/\t|,| {2,}/).map((part) => part.trim());
        return name && classValue ? { id: Date.now() + index, fullName: name, className: classValue, active: true } : null;
      })
      .filter((student): student is Student => Boolean(student));

    if (!parsed.length) return;
    onImport(parsed);
    setBulk("");
  }

  return (
    <>
      <Topbar title="ניהול תלמידים" subtitle="המידע הטכני מוצג רק לאדמין, מטפל/ת בבקשות ובפרטי בקשה ניהוליים." />
      <section className="panel">
        <div className="panel-header">
          <h3>{editingStudent ? "עריכת תלמיד/ה" : "הוספת תלמיד/ה"}</h3>
          {editingStudent && <button className="btn" onClick={resetForm}>תלמיד/ה חדש/ה</button>}
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={saveStudent}>
            <div className="field">
              <label htmlFor="studentName">שם תלמיד/ה</label>
              <input id="studentName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="className">כיתה</label>
              <input id="className" value={className} onChange={(event) => setClassName(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="deviceType">סוג המכשיר</label>
              <select id="deviceType" value={deviceType} onChange={(event) => setDeviceType(event.target.value as DeviceType)}>
                {deviceTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="careProvider">מי הגורם המטפל</label>
              <select id="careProvider" value={careProvider} onChange={(event) => setCareProvider(event.target.value as CareProvider)}>
                {careProviders.map((provider) => <option key={provider}>{provider}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="accessibilityDate">תאריך הנגשה</label>
              <input id="accessibilityDate" value={accessibilityDate} onChange={(event) => setAccessibilityDate(event.target.value)} placeholder="MM/YY" pattern="[0-9]{2}/[0-9]{2}" />
            </div>
            <div className="field">
              <label htmlFor="deviceResponsibility">גורם אחריות מכשיר</label>
              <input id="deviceResponsibility" value={deviceResponsibility} onChange={(event) => setDeviceResponsibility(event.target.value)} placeholder="שם / תפקיד / גורם אחראי" />
            </div>
            <div className="field">
              <label htmlFor="deviceResponsibilityPhone">טלפון גורם אחריות</label>
              <input id="deviceResponsibilityPhone" value={deviceResponsibilityPhone} onChange={(event) => setDeviceResponsibilityPhone(event.target.value)} inputMode="tel" placeholder="לדוגמה: 03-0000000" />
            </div>
            <div className="field">
              <label htmlFor="deviceResponsibilityEmail">אימייל גורם אחריות</label>
              <input id="deviceResponsibilityEmail" type="email" value={deviceResponsibilityEmail} onChange={(event) => setDeviceResponsibilityEmail(event.target.value)} placeholder="name@example.com" />
            </div>
            <div className="field full">
              <label htmlFor="accessories">עזרים נלווים</label>
              <textarea id="accessories" value={accessories} onChange={(event) => setAccessories(event.target.value)} />
            </div>
            {isAppleDevice(deviceType) && (
              <>
                <div className="field">
                  <label htmlFor="appleId">אפל איידי</label>
                  <input id="appleId" type="email" value={appleId} onChange={(event) => setAppleId(event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="applePassword">סיסמה</label>
                  <input id="applePassword" value={applePassword} onChange={(event) => setApplePassword(event.target.value)} />
                </div>
              </>
            )}
            <div className="field full">
              <button className="btn primary" type="submit">
                שמירה
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header">
          <h3>יבוא מהיר מטבלה</h3>
        </div>
        <div className="panel-body">
          <div className="field">
            <label htmlFor="bulk">הדבקת שורות מאקסל: שם תלמיד ואז כיתה</label>
            <textarea id="bulk" value={bulk} onChange={(event) => setBulk(event.target.value)} placeholder={"נועה לוי\tג׳ תקשורת\nיואב כהן\tד׳1"} />
          </div>
          <div className="button-row" style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={importStudents}>
              יבוא תלמידים
            </button>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-header">
          <h3>רשימת תלמידים</h3>
        </div>
        <div className="panel-body compact-panel-body">
          <div className="filters two">
            <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="חיפוש תלמיד/ה לפי שם, כיתה, מכשיר או גורם מטפל" />
            <div className="result-count">{filteredStudents.length} מתוך {students.length} תלמידים</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>שם תלמיד/ה</th>
                <th>כיתה</th>
                <th>סוג מכשיר</th>
                <th>גורם מטפל</th>
                <th>תאריך הנגשה</th>
                <th>פניות</th>
                <th>סטטוס</th>
                <th>פעולה</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const requestCount = studentRequestCounts.get(student.id) ?? 0;
                return (
                  <tr key={student.id}>
                    <td data-label="שם תלמיד/ה">{student.fullName}</td>
                    <td data-label="כיתה">{student.className}</td>
                    <td data-label="סוג מכשיר">{student.deviceType ?? "-"}</td>
                    <td data-label="גורם מטפל">{student.careProvider ?? "-"}</td>
                    <td data-label="תאריך הנגשה">{student.accessibilityDate ?? "-"}</td>
                    <td data-label="פניות">
                      <button className="count-pill" type="button" onClick={() => setHistoryStudentId(student.id)}>
                        {requestCount}
                      </button>
                    </td>
                    <td data-label="סטטוס">{student.active ? "פעיל" : "מושבת"}</td>
                    <td data-label="פעולה">
                      <div className="button-row compact-actions">
                        <button className="btn" onClick={() => loadStudent(student)}>עריכה</button>
                        <button className="btn" type="button" onClick={() => setHistoryStudentId(student.id)}>פניות</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {historyStudent && (
        <section className="panel student-history-panel">
          <div className="panel-header">
            <h3>היסטוריית פניות - {historyStudent.fullName}</h3>
            <button className="btn" type="button" onClick={() => setHistoryStudentId(null)}>סגירה</button>
          </div>
          <div className="panel-body">
            {historyRequests.length ? (
              <div className="student-history-list">
                {historyRequests.map((request) => (
                  <article key={request.id} className="student-history-card">
                    <div className="request-card-topline">
                      <span>#{request.id} · {request.createdAt}</span>
                      <StatusPill status={request.status} />
                    </div>
                    <strong>{request.requestType}</strong>
                    <span className="request-card-meta">{request.className}</span>
                    <p>{request.description}</p>
                    {request.attempted && <p><b>מה נוסה:</b> {request.attempted}</p>}
                    {request.closingMessage && <p><b>הודעת סגירה:</b> {request.closingMessage}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">אין פניות מתועדות לתלמיד/ה הזה כרגע.</div>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function RequestsTable({
  requests,
  users,
  onOpen
}: {
  requests: TechRequest[];
  users: User[];
  onOpen: (id: number) => void;
}) {
  if (!requests.length) {
    return (
      <section className="panel">
        <div className="empty">אין בקשות להצגה כרגע.</div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>מס׳</th>
              <th>עבור</th>
              <th>כיתה</th>
              <th>סוג</th>
              <th>מגישה</th>
              <th>סטטוס</th>
              <th>נפתחה</th>
              <th>פעולה</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => {
              const requester = users.find((user) => user.id === request.requesterId);
              return (
                <tr key={request.id}>
                  <td data-label="מס׳">#{request.id}</td>
                  <td data-label="עבור">{request.subjectName}</td>
                  <td data-label="כיתה">{request.className}</td>
                  <td data-label="סוג">{request.requestType}</td>
                  <td data-label="מגישה">{requester?.name ?? "לא ידוע"}</td>
                  <td data-label="סטטוס"><StatusPill status={request.status} /></td>
                  <td data-label="נפתחה">{request.createdAt}</td>
                  <td data-label="פעולה">
                    <button className="btn" onClick={() => onOpen(request.id)}>
                      צפייה
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Topbar({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <header className="topbar">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && <div className="button-row">{action}</div>}
    </header>
  );
}

function Stat({
  label,
  value,
  tone,
  active,
  onClick
}: {
  label: string;
  value: number;
  tone?: RequestStatus;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `stat-card ${tone ? `tone-${tone}` : ""} ${active ? "active" : ""}`;

  if (onClick) {
    return (
      <button className={className} type="button" onClick={onClick} aria-pressed={active}>
        <strong>{value}</strong>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className={className}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: RequestStatus }) {
  return <span className={`status ${status}`}>{statusLabels[status]}</span>;
}
