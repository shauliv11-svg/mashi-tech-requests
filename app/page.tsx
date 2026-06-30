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

function studentPayload(student: Student) {
  return {
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
  const [toast, setToast] = useState("");

  const currentUser = users.find((user) => user.id === currentUserId) ?? null;
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

  async function sendMagicLink(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const approvedUser = users.find((user) => user.email.toLowerCase() === normalizedEmail && user.active);

    if (!approvedUser) {
      showToast("המייל לא רשום במערכת או שהמשתמשת אינה פעילה. פנו לאדמין.");
      return;
    }

    if (!supabase) {
      showToast("Supabase לא מוגדר בסביבה הזו.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      showToast("שליחת קישור הכניסה נכשלה. נסו שוב בעוד רגע.");
      return;
    }

    showToast("שלחנו קישור כניסה למייל.");
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setAuthEmail(data.session?.user.email ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user.email ?? null);
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
      return;
    }

    const approvedUser = users.find((user) => user.email.toLowerCase() === authEmail.toLowerCase() && user.active);
    if (!approvedUser) {
      showToast("המשתמשת מחוברת ב-Supabase אך אינה פעילה במערכת. פנו לאדמין.");
      supabase?.auth.signOut();
      return;
    }

    setCurrentUserId(approvedUser.id);
    setView((currentView) => currentView === "login" ? (approvedUser.role === "staff" ? "myRequests" : "manageRequests") : currentView);
  }, [authEmail, authLoading, dataLoaded, users]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    async function loadData() {
      const [usersResult, studentsResult, requestsResult] = await Promise.all([
        supabase!.from("app_users").select("*").order("id"),
        supabase!.from("students").select("*").order("full_name"),
        supabase!.from("tech_requests").select("*").order("created_at", { ascending: false })
      ]);

      if (usersResult.error || studentsResult.error || requestsResult.error) {
        showToast("לא הצלחתי לטעון נתונים מ-Supabase, מוצגים נתוני דמו מקומיים.");
        setDataLoaded(true);
        return;
      }

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

  async function createUser(user: User) {
    if (!isSupabaseConfigured || !supabase) {
      setUsers((items) => [...items, user]);
      showToast("המשתמשת נוספה לרשימת ההזמנות.");
      return;
    }
    const { data, error } = await supabase.from("app_users").insert(userPayload(user)).select("*").single();
    if (error) {
      showToast("שמירת המשתמשת בדאטה בייס נכשלה.");
      return;
    }
    setUsers((items) => [...items, mapUser(data)]);
    showToast("המשתמשת נשמרה בדאטה בייס.");
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

  async function createStudent(student: Student) {
    if (!isSupabaseConfigured || !supabase) {
      setStudents((items) => [...items, student]);
      showToast("התלמיד/ה נוספו לרשימה.");
      return;
    }
    const { data, error } = await supabase.from("students").insert(studentPayload(student)).select("*").single();
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
    const { data, error } = await supabase.from("students").update(studentPayload(student)).eq("id", student.id).select("*").single();
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
    const { data, error } = await supabase.from("students").insert(newStudents.map(studentPayload)).select("*");
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
          <div className="brand-mark">משי</div>
          <h1>בקשות טכנולוגיה מסייעת</h1>
          <p>ניהול פניות צוות לבית ספר משי</p>
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
            onMagicLink={sendMagicLink}
            isMagicLinkMode={isSupabaseConfigured}
            isLoading={authLoading || (isSupabaseConfigured && !dataLoaded)}
          />
        )}
        {view === "myRequests" && currentUser && (
          <MyRequests
            currentUser={currentUser}
            requests={requests}
            users={users}
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
        {view === "users" && role === "admin" && (
          <UsersAdmin
            users={users}
            onInvite={createUser}
            onRoleChange={(id, nextRole) => patchUser(id, { role: nextRole })}
            onClassChange={(id, classNamesText) => patchUser(id, { classNames: parseClassList(classNamesText) })}
          />
        )}
        {view === "students" && role === "admin" && (
          <StudentsAdmin
            students={students}
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
  onMagicLink,
  isMagicLinkMode,
  isLoading
}: {
  users: User[];
  onLogin: (userId: number) => void;
  onMagicLink: (email: string) => void | Promise<void>;
  isMagicLinkMode: boolean;
  isLoading: boolean;
}) {
  const activeUsers = users.filter((user) => user.active);
  const [selectedUserId, setSelectedUserId] = useState(activeUsers[0]?.id ?? 0);
  const selectedUser = activeUsers.find((user) => user.id === selectedUserId);
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function submitMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setIsSending(true);
    await onMagicLink(email);
    setIsSending(false);
  }

  if (isLoading) {
    return (
      <>
        <Topbar title="כניסה למערכת" subtitle="בודקים אם יש התחברות פעילה." />
        <section className="panel"><div className="empty">טוען...</div></section>
      </>
    );
  }

  if (isMagicLinkMode) {
    return (
      <>
        <Topbar title="כניסה למערכת" subtitle="הכניסו מייל רשום ונשלח קישור כניסה חד פעמי." />
        <section className="panel">
          <div className="panel-body">
            <form className="form-grid" onSubmit={submitMagicLink}>
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
              <div className="field full">
                <button className="btn primary" type="submit" disabled={isSending}>
                  {isSending ? "שולח..." : "שליחת קישור כניסה"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Topbar title="כניסה למערכת" subtitle="מצב דמו מקומי: בחירת המשתמש מדמה התחברות." />
      <section className="panel">
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
  onNew,
  onOpen
}: {
  currentUser: User;
  requests: TechRequest[];
  users: User[];
  onNew: () => void;
  onOpen: (id: number) => void;
}) {
  const myRequests = requests.filter((request) => {
    const isOwnRequest = request.requesterId === currentUser.id;
    const isClassRequest = currentUser.classNames?.includes(request.className) ?? false;
    return isOwnRequest || isClassRequest;
  });
  const subtitle = currentUser.classNames?.length
    ? `בקשות שפתחת ובקשות עבור הכיתות: ${formatClassList(currentUser.classNames)}.`
    : "מעקב פשוט אחרי הבקשות שפתחת.";

  return (
    <>
      <Topbar title="הבקשות שלי" subtitle={subtitle} action={<button className="btn primary" onClick={onNew}>בקשה חדשה</button>} />
      <RequestsTable requests={myRequests} users={users} onOpen={onOpen} />
    </>
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
      <Topbar title="בקשה חדשה" subtitle="טופס קצר שמיועד לעודד שימוש יומיומי." />
      <section className="panel">
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
                </div>
              </>
            ) : (
              <div className="field full">
                <label htmlFor="classSubject">שם הכיתה / הקבוצה</label>
                <input id="classSubject" value={classSubject} onChange={(event) => setClassSubject(event.target.value)} placeholder="לדוגמה: כיתה ג׳ תקשורת" />
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
              <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} required />
            </div>
            <div className="field full">
              <label htmlFor="attempted">מה כבר נוסה?</label>
              <textarea id="attempted" value={attempted} onChange={(event) => setAttempted(event.target.value)} />
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
  const [closingRequest, setClosingRequest] = useState<TechRequest | null>(null);

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      const requester = users.find((user) => user.id === request.requesterId);
      const searchText = `${request.subjectName} ${request.className} ${request.requestType} ${request.description} ${requester?.name ?? ""}`;
      return searchText.includes(query) && (status === "all" || request.status === status);
    });
  }, [query, requests, status, users]);

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
        <Stat label="חדשות" value={stats.new} />
        <Stat label="בטיפול" value={stats.progress} />
        <Stat label="ממתינות למידע" value={stats.waiting} />
        <Stat label="נסגרו" value={stats.closed} />
      </div>

      <div className="request-detail">
        <section className="panel">
          <div className="panel-header">
            <h3>כל הבקשות</h3>
          </div>
          <div className="panel-body">
            <div className="filters two">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי תלמיד, כיתה או מגישה" />
              <select value={status} onChange={(event) => setStatus(event.target.value as RequestStatus | "all")}>
                <option value="all">כל הסטטוסים</option>
                <option value="new">חדשה</option>
                <option value="progress">בטיפול</option>
                <option value="waiting">ממתינה למידע</option>
                <option value="closed">נסגרה</option>
              </select>
            </div>
            <RequestsTable requests={filtered} users={users} onOpen={onSelect} />
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
        </div>
        <div className="detail-item">
          <span>סוג הבקשה</span>
          <strong>{request.requestType}</strong>
        </div>
        <div className="detail-item">
          <span>תיאור הצורך</span>
          <p>{request.description}</p>
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
              <textarea id="internalClose" value={internalNote} onChange={(event) => setInternalNote(event.target.value)} />
            </div>
            <div className="field full">
              <label htmlFor="closeMessage">הודעה למגישה</label>
              <textarea id="closeMessage" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="לדוגמה: הטאבלט הוגדר ונמסר לכיתה. אפשר לפנות אלינו אם יש צורך בהתאמה נוספת." />
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
  onInvite,
  onRoleChange,
  onClassChange
}: {
  users: User[];
  onInvite: (user: User) => void | Promise<void>;
  onRoleChange: (id: number, role: Role) => void | Promise<void>;
  onClassChange: (id: number, classNamesText: string) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [classNamesText, setClassNamesText] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onInvite({
      id: Date.now(),
      name,
      email,
      role,
      classNames: role === "staff" ? parseClassList(classNamesText) : undefined,
      active: true
    });
    setName("");
    setEmail("");
    setRole("staff");
    setClassNamesText("");
  }

  return (
    <>
      <Topbar title="ניהול משתמשים" subtitle="לאדמין בלבד: הזמנת צוות ושינוי תפקידים." />
      <section className="panel">
        <div className="panel-header">
          <h3>הזמנת משתמשת</h3>
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
            <div className="field full">
              <button className="btn primary" type="submit">
                שליחת הזמנה
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
  onAdd,
  onUpdate,
  onImport
}: {
  students: Student[];
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
  const [accessories, setAccessories] = useState("");
  const [appleId, setAppleId] = useState("");
  const [applePassword, setApplePassword] = useState("");
  const [bulk, setBulk] = useState("");

  function loadStudent(student: Student) {
    setEditingStudentId(student.id);
    setFullName(student.fullName);
    setClassName(student.className);
    setDeviceType(student.deviceType ?? "מחשב");
    setCareProvider(student.careProvider ?? "משרד החינוך");
    setAccessibilityDate(student.accessibilityDate ?? "");
    setDeviceResponsibility(student.deviceResponsibility ?? "");
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
              <input id="deviceResponsibility" value={deviceResponsibility} onChange={(event) => setDeviceResponsibility(event.target.value)} />
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>שם תלמיד/ה</th>
                <th>כיתה</th>
                <th>סוג מכשיר</th>
                <th>גורם מטפל</th>
                <th>תאריך הנגשה</th>
                <th>סטטוס</th>
                <th>פעולה</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td data-label="שם תלמיד/ה">{student.fullName}</td>
                  <td data-label="כיתה">{student.className}</td>
                  <td data-label="סוג מכשיר">{student.deviceType ?? "-"}</td>
                  <td data-label="גורם מטפל">{student.careProvider ?? "-"}</td>
                  <td data-label="תאריך הנגשה">{student.accessibilityDate ?? "-"}</td>
                  <td data-label="סטטוס">{student.active ? "פעיל" : "מושבת"}</td>
                  <td data-label="פעולה"><button className="btn" onClick={() => loadStudent(student)}>עריכה</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: RequestStatus }) {
  return <span className={`status ${status}`}>{statusLabels[status]}</span>;
}
