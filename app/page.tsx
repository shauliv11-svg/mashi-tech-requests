"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Role = "staff" | "handler" | "admin";
type View = "login" | "myRequests" | "newRequest" | "manageRequests" | "updates" | "equipment" | "users" | "students";
type PortalSystem = "requests" | "equipment" | "admin";
type EquipmentPage = "devices" | "mine" | "maintenance" | "log" | "manage";
type SubjectType = "student" | "class";
type RequestStatus = "new" | "progress" | "waiting" | "closed";
type DeviceType = "מחשב" | "אייפד" | "אייפד אייר" | "מחשב מיקוד מבט" | "אייפד פרו";
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
  createdAtIso?: string;
  internalNote?: string;
  closingMessage?: string;
  handlerId?: number;
};

type TreatmentUpdate = {
  id: number;
  requestId: number;
  authorId: number;
  note: string;
  createdAt: string;
  createdAtIso?: string;
};

type SchoolDeviceStatus = "available" | "checked_out" | "repair" | "inactive";
type SchoolDeviceType = "אייפד" | "אייפד אייר" | "אייפד פרו" | "מחשב" | "ציוד אחר";
type DeviceLoanStatus = "open" | "returned";
type MaintenanceStatus = "open" | "progress" | "closed";

type SchoolDevice = {
  id: number;
  name: string;
  deviceType: SchoolDeviceType;
  serialNumber?: string;
  location?: string;
  status: SchoolDeviceStatus;
  notes?: string;
  active: boolean;
};

type DeviceLoan = {
  id: number;
  deviceId: number;
  borrowerId: number;
  checkedOutAt: string;
  checkedOutAtIso?: string;
  expectedReturn?: string;
  returnedAt?: string;
  returnedAtIso?: string;
  checkoutNote?: string;
  returnNote?: string;
  status: DeviceLoanStatus;
};

type DeviceMaintenance = {
  id: number;
  deviceId: number;
  loanId?: number;
  reporterId?: number;
  handlerId?: number;
  note: string;
  status: MaintenanceStatus;
  createdAt: string;
  createdAtIso?: string;
  closedAt?: string;
};

type DeviceAvailabilityBlock = {
  id: number;
  deviceId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  note?: string;
  active: boolean;
};

const roleLabels: Record<Role, string> = {
  staff: "צוות",
  handler: "מטפל/ת בבקשות",
  admin: "אדמין"
};

const statusLabels: Record<RequestStatus, string> = {
  new: "חדשה",
  progress: "בטיפול",
  waiting: "נשלח לתיקון",
  closed: "נסגרה"
};

const schoolDeviceStatusLabels: Record<SchoolDeviceStatus, string> = {
  available: "זמין",
  checked_out: "מושאל",
  repair: "בתחזוקה",
  inactive: "לא פעיל"
};

const maintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  open: "פתוח",
  progress: "בטיפול",
  closed: "נסגר"
};

const hebrewWeekdays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const requestTypes = [
  "התאמת טכנולוגיה מסייעת",
  "תקלה בציוד",
  "הדרכה לצוות",
  "בדיקת כלי / אפליקציה",
  "רכישה / הצטיידות",
  "אחר"
];

const deviceTypes: DeviceType[] = ["מחשב", "אייפד", "אייפד אייר", "מחשב מיקוד מבט", "אייפד פרו"];
const schoolDeviceTypes: SchoolDeviceType[] = ["אייפד", "אייפד אייר", "אייפד פרו", "מחשב", "ציוד אחר"];
const careProviders: CareProvider[] = ["משרד הבריאות", "משרד החינוך"];
const studentImportHeaders = [
  "שם תלמיד/ה",
  "כיתה",
  "סוג מכשיר",
  "גורם מטפל",
  "תאריך הנגשה",
  "גורם אחריות מכשיר",
  "טלפון גורם אחריות",
  "אימייל גורם אחריות",
  "עזרים נלווים",
  "אפל איידי",
  "סיסמה",
  "פעיל"
];
const studentImportExampleRows = [
  ["נועה לוי", "ג׳ תקשורת", "אייפד", "משרד החינוך", "09/25", "רכזת תקשוב", "03-0000000", "tikshuv@mashi.school", "מגן קשיח, מקלדת בלוטות׳", "noa.apple@mashi.school", "", "כן"],
  ["יואב כהן", "ד׳1", "מחשב מיקוד מבט", "משרד הבריאות", "11/25", "קלינאית תקשורת", "03-0000001", "clinic@mashi.school", "מתקן שולחני", "", "", "כן"]
];

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
    handlerId: 2,
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

const initialTreatmentUpdates: TreatmentUpdate[] = [
  {
    id: 1,
    requestId: 102,
    authorId: 2,
    note: "תואם טיפול ראשוני עם צוות הכיתה. נדרש לבדוק זמינות טאבלטים להדרכה.",
    createdAt: "20.06.2026, 09:30"
  },
  {
    id: 2,
    requestId: 103,
    authorId: 2,
    note: "נבדק מטען חלופי. התקלה נמשכת ולכן הבקשה סומנה כנשלחה לתיקון.",
    createdAt: "24.06.2026, 13:15"
  }
];

const initialSchoolDevices: SchoolDevice[] = [
  { id: 1, name: "אייפד בית ספרי 01", deviceType: "אייפד", serialNumber: "MSHI-IPAD-01", location: "ארון תקשוב", status: "available", notes: "כולל מגן ומטען", active: true },
  { id: 2, name: "אייפד אייר 02", deviceType: "אייפד אייר", serialNumber: "MSHI-AIR-02", location: "ארון תקשוב", status: "available", notes: "מיועד להשאלה לפעילות כיתתית", active: true },
  { id: 3, name: "אייפד פרו 03", deviceType: "אייפד פרו", serialNumber: "MSHI-PRO-03", location: "חדר טיפול", status: "repair", notes: "בדיקת עט ומקלדת", active: true }
];

const initialDeviceLoans: DeviceLoan[] = [];

const initialDeviceMaintenance: DeviceMaintenance[] = [
  { id: 1, deviceId: 3, reporterId: 2, note: "בדיקה יזומה: לוודא שהעט נטען והמקלדת מתחברת.", status: "open", createdAt: "24.06.2026, 12:00" }
];

const initialDeviceAvailabilityBlocks: DeviceAvailabilityBlock[] = [];

const systemLabels: Record<PortalSystem, { title: string; subtitle: string; mobileLabel: string }> = {
  requests: {
    title: "בקשות עבור ציוד תלמידים",
    subtitle: "ציוד אישי של תלמידים, התאמות, תקלות ותיקי תלמיד.",
    mobileLabel: "בקשות"
  },
  equipment: {
    title: "שימוש בציוד בית ספרי",
    subtitle: "השאלה, החזרה ותחזוקה של מכשירים משותפים.",
    mobileLabel: "ציוד"
  },
  admin: {
    title: "ניהול מערכת",
    subtitle: "משתמשות, תלמידים והגדרות בסיס משותפות.",
    mobileLabel: "ניהול"
  }
};

const navBySystem: Record<PortalSystem, Record<Role, { view: View; label: string; mobileLabel: string; equipmentPage?: EquipmentPage }[]>> = {
  requests: {
    staff: [
      { view: "myRequests", label: "הבקשות שלי", mobileLabel: "הבקשות" },
      { view: "newRequest", label: "בקשה חדשה", mobileLabel: "חדשה" }
    ],
    handler: [
      { view: "updates", label: "מה חדש", mobileLabel: "מה חדש" },
      { view: "manageRequests", label: "ניהול בקשות", mobileLabel: "ניהול" },
      { view: "myRequests", label: "הבקשות שלי", mobileLabel: "שלי" },
      { view: "newRequest", label: "בקשה חדשה", mobileLabel: "חדשה" }
    ],
    admin: [
      { view: "updates", label: "מה חדש", mobileLabel: "מה חדש" },
      { view: "manageRequests", label: "ניהול בקשות", mobileLabel: "ניהול" },
      { view: "myRequests", label: "הבקשות שלי", mobileLabel: "שלי" },
      { view: "newRequest", label: "בקשה חדשה", mobileLabel: "חדשה" }
    ]
  },
  equipment: {
    staff: [
      { view: "equipment", equipmentPage: "devices", label: "מכשירים", mobileLabel: "מכשירים" },
      { view: "equipment", equipmentPage: "mine", label: "אצלי עכשיו", mobileLabel: "אצלי" }
    ],
    handler: [
      { view: "equipment", equipmentPage: "devices", label: "מכשירים", mobileLabel: "מכשירים" },
      { view: "equipment", equipmentPage: "mine", label: "השאלות פעילות", mobileLabel: "השאלות" },
      { view: "equipment", equipmentPage: "maintenance", label: "תחזוקה פתוחה", mobileLabel: "תחזוקה" },
      { view: "equipment", equipmentPage: "log", label: "יומן תחזוקה", mobileLabel: "יומן" }
    ],
    admin: [
      { view: "equipment", equipmentPage: "devices", label: "מכשירים", mobileLabel: "מכשירים" },
      { view: "equipment", equipmentPage: "mine", label: "השאלות פעילות", mobileLabel: "השאלות" },
      { view: "equipment", equipmentPage: "maintenance", label: "תחזוקה פתוחה", mobileLabel: "תחזוקה" },
      { view: "equipment", equipmentPage: "log", label: "יומן תחזוקה", mobileLabel: "יומן" },
      { view: "equipment", equipmentPage: "manage", label: "ניהול מכשירים", mobileLabel: "ניהול" }
    ]
  },
  admin: {
    staff: [],
    handler: [],
    admin: [
      { view: "users", label: "משתמשים", mobileLabel: "משתמשים" },
      { view: "students", label: "תלמידים", mobileLabel: "תלמידים" }
    ]
  }
};

function systemForView(view: View): PortalSystem {
  if (view === "equipment") return "equipment";
  if (view === "users" || view === "students") return "admin";
  return "requests";
}

function availableSystemsForRole(role: Role): PortalSystem[] {
  if (role === "admin") return ["requests", "equipment", "admin"];
  if (role === "handler") return ["requests", "equipment"];
  return ["requests"];
}

function defaultViewForSystem(system: PortalSystem, role: Role): View {
  if (system === "equipment") return "equipment";
  if (system === "admin") return "users";
  if (role === "staff") return "myRequests";
  return "updates";
}

function today() {
  return new Intl.DateTimeFormat("he-IL").format(new Date());
}

function displayDate(value?: string) {
  if (!value) return today();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("he-IL").format(parsed);
}

function displayDateTime(value?: string) {
  if (!value) return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date());
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(parsed);
}

function parseDateValue(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const match = value.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})(?:,?\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;

  const [, day, month, year, hour = "0", minute = "0"] = match;
  const fullYear = year.length === 2 ? Number(`20${year}`) : Number(year);
  const fallback = new Date(fullYear, Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function isWithinLastHours(value: string | undefined, hours: number) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  return Date.now() - parsed.getTime() <= hours * 60 * 60 * 1000;
}

function timeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function isAvailabilityBlockActive(block: DeviceAvailabilityBlock, now = new Date()) {
  if (!block.active || now.getDay() !== block.dayOfWeek) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(block.startTime);
  const end = timeToMinutes(block.endTime);
  return start <= end ? current >= start && current < end : current >= start || current < end;
}

function formatAvailabilityBlock(block: DeviceAvailabilityBlock) {
  return `יום ${hebrewWeekdays[block.dayOfWeek]} ${block.startTime}-${block.endTime}`;
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
  return deviceType === "אייפד" || deviceType === "אייפד אייר" || deviceType === "אייפד פרו";
}

function normalizeDeviceType(value?: string): DeviceType | undefined {
  const trimmed = value?.trim();
  return deviceTypes.find((type) => type === trimmed);
}

function normalizeCareProvider(value?: string): CareProvider | undefined {
  const trimmed = value?.trim();
  return careProviders.find((provider) => provider === trimmed);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function studentTemplateCsv() {
  const rows = [studentImportHeaders, ...studentImportExampleRows];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  return cells;
}

function parseStudentImportRows(text: string): Student[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const firstRow = rows[0].join(" ");
  const dataRows = firstRow.includes("שם") && firstRow.includes("כיתה") ? rows.slice(1) : rows;

  const parsed: Student[] = [];
  dataRows.forEach((row, index) => {
    const [name, classValue, deviceValue, providerValue, accessibilityValue, responsibilityValue, phoneValue, emailValue, accessoriesValue, appleIdValue, applePasswordValue, activeValue] = row;
    const fullName = name?.trim();
    const className = classValue?.trim();
    if (!fullName || !className) return;
    const deviceType = normalizeDeviceType(deviceValue) ?? "מחשב";
    const activeText = activeValue?.trim().toLowerCase();
    const active = !["לא", "false", "0", "מושבת", "מושבתת"].includes(activeText ?? "");

    parsed.push({
      id: Date.now() + index,
      fullName,
      className,
      deviceType,
      careProvider: normalizeCareProvider(providerValue) ?? "משרד החינוך",
      accessibilityDate: accessibilityValue?.trim() || undefined,
      deviceResponsibility: responsibilityValue?.trim() || undefined,
      deviceResponsibilityPhone: phoneValue?.trim() || undefined,
      deviceResponsibilityEmail: emailValue?.trim() || undefined,
      accessories: accessoriesValue?.trim() || undefined,
      appleId: isAppleDevice(deviceType) ? appleIdValue?.trim() || undefined : undefined,
      applePassword: isAppleDevice(deviceType) ? applePasswordValue?.trim() || undefined : undefined,
      active
    });
  });

  return parsed;
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
    createdAtIso: row.created_at ?? undefined,
    internalNote: row.internal_note ?? undefined,
    closingMessage: row.closing_message ?? undefined,
    handlerId: row.handler_id ? Number(row.handler_id) : undefined
  };
}

function mapTreatmentUpdate(row: any): TreatmentUpdate {
  return {
    id: Number(row.id),
    requestId: Number(row.request_id),
    authorId: Number(row.author_id),
    note: row.note,
    createdAt: displayDateTime(row.created_at),
    createdAtIso: row.created_at ?? undefined
  };
}

function mapSchoolDevice(row: any): SchoolDevice {
  return {
    id: Number(row.id),
    name: row.name,
    deviceType: row.device_type,
    serialNumber: row.serial_number ?? undefined,
    location: row.location ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    active: row.active
  };
}

function mapDeviceLoan(row: any): DeviceLoan {
  return {
    id: Number(row.id),
    deviceId: Number(row.device_id),
    borrowerId: Number(row.borrower_id),
    checkedOutAt: displayDateTime(row.checked_out_at),
    checkedOutAtIso: row.checked_out_at ?? undefined,
    expectedReturn: row.expected_return ?? undefined,
    returnedAt: row.returned_at ? displayDateTime(row.returned_at) : undefined,
    returnedAtIso: row.returned_at ?? undefined,
    checkoutNote: row.checkout_note ?? undefined,
    returnNote: row.return_note ?? undefined,
    status: row.status
  };
}

function mapDeviceMaintenance(row: any): DeviceMaintenance {
  return {
    id: Number(row.id),
    deviceId: Number(row.device_id),
    loanId: row.loan_id ? Number(row.loan_id) : undefined,
    reporterId: row.reporter_id ? Number(row.reporter_id) : undefined,
    handlerId: row.handler_id ? Number(row.handler_id) : undefined,
    note: row.note,
    status: row.status,
    createdAt: displayDateTime(row.created_at),
    createdAtIso: row.created_at ?? undefined,
    closedAt: row.closed_at ? displayDateTime(row.closed_at) : undefined
  };
}

function mapDeviceAvailabilityBlock(row: any): DeviceAvailabilityBlock {
  return {
    id: Number(row.id),
    deviceId: Number(row.device_id),
    dayOfWeek: Number(row.day_of_week),
    startTime: row.start_time,
    endTime: row.end_time,
    note: row.note ?? undefined,
    active: row.active
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

function requestPayload(request: TechRequest, includeHandler = true) {
  const payload: Record<string, unknown> = {
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

  if (includeHandler) {
    payload.handler_id = request.handlerId ?? null;
  }

  return payload;
}

function treatmentUpdatePayload(update: TreatmentUpdate) {
  return {
    request_id: update.requestId,
    author_id: update.authorId,
    note: update.note
  };
}

function schoolDevicePayload(device: SchoolDevice) {
  return {
    name: device.name,
    device_type: device.deviceType,
    serial_number: device.serialNumber || null,
    location: device.location || null,
    status: device.status,
    notes: device.notes || null,
    active: device.active
  };
}

function deviceLoanPayload(loan: DeviceLoan) {
  return {
    device_id: loan.deviceId,
    borrower_id: loan.borrowerId,
    expected_return: loan.expectedReturn || null,
    returned_at: loan.returnedAtIso || null,
    checkout_note: loan.checkoutNote || null,
    return_note: loan.returnNote || null,
    status: loan.status
  };
}

function deviceMaintenancePayload(item: DeviceMaintenance) {
  return {
    device_id: item.deviceId,
    loan_id: item.loanId ?? null,
    reporter_id: item.reporterId ?? null,
    handler_id: item.handlerId ?? null,
    note: item.note,
    status: item.status,
    closed_at: item.closedAt || null
  };
}

function deviceAvailabilityBlockPayload(block: DeviceAvailabilityBlock) {
  return {
    device_id: block.deviceId,
    day_of_week: block.dayOfWeek,
    start_time: block.startTime,
    end_time: block.endTime,
    note: block.note || null,
    active: block.active
  };
}

export default function Home() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [view, setView] = useState<View>("login");
  const [activeSystem, setActiveSystem] = useState<PortalSystem>("requests");
  const [equipmentPage, setEquipmentPage] = useState<EquipmentPage>("devices");
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [requests, setRequests] = useState<TechRequest[]>(initialRequests);
  const [treatmentUpdates, setTreatmentUpdates] = useState<TreatmentUpdate[]>(initialTreatmentUpdates);
  const [schoolDevices, setSchoolDevices] = useState<SchoolDevice[]>(initialSchoolDevices);
  const [deviceLoans, setDeviceLoans] = useState<DeviceLoan[]>(initialDeviceLoans);
  const [deviceMaintenance, setDeviceMaintenance] = useState<DeviceMaintenance[]>(initialDeviceMaintenance);
  const [deviceAvailabilityBlocks, setDeviceAvailabilityBlocks] = useState<DeviceAvailabilityBlock[]>(initialDeviceAvailabilityBlocks);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [dataLoaded, setDataLoaded] = useState(!isSupabaseConfigured);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [toast, setToast] = useState("");
  const [studentResponsibilityContactsSupported, setStudentResponsibilityContactsSupported] = useState(!isSupabaseConfigured);
  const [requestHandlerSupported, setRequestHandlerSupported] = useState(!isSupabaseConfigured);
  const [treatmentLogSupported, setTreatmentLogSupported] = useState(!isSupabaseConfigured);
  const [equipmentSupported, setEquipmentSupported] = useState(!isSupabaseConfigured);

  const authProfile = authEmail
    ? users.find((user) => user.email.toLowerCase() === authEmail.toLowerCase() && user.active) ?? null
    : null;
  const currentUser = (isSupabaseConfigured ? authProfile : users.find((user) => user.id === currentUserId)) ?? null;
  const role = currentUser?.role ?? "staff";
  const selectedRequest = requests.find((request) => request.id === selectedRequestId);
  const selectedRequestStudent = students.find((student) => student.id === selectedRequest?.studentId);
  const selectedRequestUpdates = selectedRequestId
    ? treatmentUpdates.filter((update) => update.requestId === selectedRequestId)
    : [];
  const isAuthenticated = Boolean(currentUser);
  const canManage = currentUser?.role === "handler" || currentUser?.role === "admin";
  const availableSystems = availableSystemsForRole(role);
  const activeSystemNav = navBySystem[activeSystem][role];

  function navigate(nextView: View) {
    setActiveSystem(systemForView(nextView));
    setView(nextView);
    setToast("");
  }

  function navigatePortalItem(item: { view: View; equipmentPage?: EquipmentPage }) {
    if (item.equipmentPage) {
      setEquipmentPage(item.equipmentPage);
    }
    navigate(item.view);
  }

  function switchSystem(nextSystem: PortalSystem) {
    setActiveSystem(nextSystem);
    setView(defaultViewForSystem(nextSystem, role));
    if (nextSystem === "equipment") {
      setEquipmentPage("devices");
    }
    setSelectedRequestId(null);
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
    setActiveSystem("requests");
    setView(defaultViewForSystem("requests", user.role));
    showToast(`נכנסת בתור ${user.name} (${roleLabels[user.role]}).`);
  }

  async function logout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setAuthEmail(null);
    }
    setCurrentUserId(null);
    setActiveSystem("requests");
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
        setActiveSystem("requests");
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
      setActiveSystem("requests");
      setView("login");
      setAuthNotice("");
      return;
    }

    const approvedUser = users.find((user) => user.email.toLowerCase() === authEmail.toLowerCase() && user.active);
    if (!approvedUser) {
      setCurrentUserId(null);
      setActiveSystem("requests");
      setView("login");
      setAuthNotice(`המייל ${authEmail} מחובר ב-Supabase אבל לא מוגדר כמשתמש פעיל במערכת. פנו לאדמין.`);
      return;
    }

    setAuthNotice("");
    setCurrentUserId(approvedUser.id);
    setView((currentView) => currentView === "login" ? defaultViewForSystem("requests", approvedUser.role) : currentView);
    setActiveSystem((currentSystem) => availableSystemsForRole(approvedUser.role).includes(currentSystem) ? currentSystem : "requests");
  }, [authEmail, authLoading, dataLoaded, users]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    async function loadData() {
      const [usersResult, studentsResult, requestsResult, contactColumnsResult, handlerColumnResult, treatmentUpdatesResult, devicesResult, loansResult, maintenanceResult, availabilityResult] = await Promise.all([
        supabase!.from("app_users").select("*").order("id"),
        supabase!.from("students").select("*").order("full_name"),
        supabase!.from("tech_requests").select("*").order("created_at", { ascending: false }),
        supabase!.from("students").select("device_responsibility_phone, device_responsibility_email").limit(1),
        supabase!.from("tech_requests").select("handler_id").limit(1),
        supabase!.from("request_treatment_updates").select("*").order("created_at", { ascending: true }),
        supabase!.from("school_devices").select("*").order("name"),
        supabase!.from("school_device_loans").select("*").order("checked_out_at", { ascending: false }),
        supabase!.from("school_device_maintenance").select("*").order("created_at", { ascending: false }),
        supabase!.from("school_device_availability_blocks").select("*").order("day_of_week")
      ]);

      if (usersResult.error || studentsResult.error || requestsResult.error) {
        showToast("לא הצלחתי לטעון נתונים מ-Supabase, מוצגים נתוני דמו מקומיים.");
        setDataLoaded(true);
        return;
      }

      setStudentResponsibilityContactsSupported(!contactColumnsResult.error);
      setRequestHandlerSupported(!handlerColumnResult.error);
      setTreatmentLogSupported(!treatmentUpdatesResult.error);
      setEquipmentSupported(!devicesResult.error && !loansResult.error && !maintenanceResult.error && !availabilityResult.error);
      setUsers((usersResult.data ?? []).map(mapUser));
      setStudents((studentsResult.data ?? []).map(mapStudent));
      setRequests((requestsResult.data ?? []).map(mapRequest));
      setTreatmentUpdates(treatmentUpdatesResult.error ? [] : (treatmentUpdatesResult.data ?? []).map(mapTreatmentUpdate));
      if (!devicesResult.error) setSchoolDevices((devicesResult.data ?? []).map(mapSchoolDevice));
      if (!loansResult.error) setDeviceLoans((loansResult.data ?? []).map(mapDeviceLoan));
      if (!maintenanceResult.error) setDeviceMaintenance((maintenanceResult.data ?? []).map(mapDeviceMaintenance));
      if (!availabilityResult.error) setDeviceAvailabilityBlocks((availabilityResult.data ?? []).map(mapDeviceAvailabilityBlock));
      setSelectedRequestId(null);
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

    const { data, error } = await supabase.from("tech_requests").insert(requestPayload(request, requestHandlerSupported)).select("*").single();
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
      return updated;
    }

    const { data, error } = await supabase
      .from("tech_requests")
      .update(requestPayload(updated, requestHandlerSupported))
      .eq("id", updated.id)
      .select("*")
      .single();
    if (error) {
      showToast("שמירת הבקשה בדאטה בייס נכשלה.");
      return null;
    }
    const saved = mapRequest(data);
    setRequests((items) => items.map((item) => (item.id === saved.id ? saved : item)));
    setSelectedRequestId(saved.id);
    showToast(successMessage);
    return saved;
  }

  async function addTreatmentUpdate(request: TechRequest, note: string) {
    const trimmed = note.trim();
    if (!trimmed || !currentUser) return;

    const optimistic: TreatmentUpdate = {
      id: Date.now(),
      requestId: request.id,
      authorId: currentUser.id,
      note: trimmed,
      createdAt: displayDateTime(new Date().toISOString()),
      createdAtIso: new Date().toISOString()
    };
    const updatedRequest = { ...request, internalNote: trimmed };

    if (!isSupabaseConfigured || !supabase || !treatmentLogSupported) {
      setTreatmentUpdates((items) => [...items, optimistic]);
      setRequests((items) => items.map((item) => (item.id === request.id ? updatedRequest : item)));
      setSelectedRequestId(request.id);
      showToast(treatmentLogSupported ? "העדכון נוסף ליומן הטיפול." : "העדכון נשמר מקומית. צריך להריץ SQL ליומן הטיפול כדי לשמור בדאטה בייס.");
      return;
    }

    const { data, error } = await supabase
      .from("request_treatment_updates")
      .insert(treatmentUpdatePayload(optimistic))
      .select("*")
      .single();

    if (error) {
      showToast("שמירת עדכון הטיפול נכשלה.");
      return;
    }

    setTreatmentUpdates((items) => [...items, mapTreatmentUpdate(data)]);
    await updateRequest(updatedRequest, "העדכון נוסף ליומן הטיפול.");
  }

  async function deleteRequest(request: TechRequest) {
    if (role !== "admin") {
      showToast("רק אדמין יכול למחוק בקשות.");
      return;
    }

    const approved = window.confirm(`למחוק את בקשה #${request.id}? הפעולה לא ניתנת לשחזור.`);
    if (!approved) return;

    if (!isSupabaseConfigured || !supabase) {
      setRequests((items) => items.filter((item) => item.id !== request.id));
      setTreatmentUpdates((items) => items.filter((item) => item.requestId !== request.id));
      setSelectedRequestId(null);
      showToast("הבקשה נמחקה.");
      return;
    }

    const { error } = await supabase.from("tech_requests").delete().eq("id", request.id);
    if (error) {
      showToast("מחיקת הבקשה נכשלה.");
      return;
    }

    setRequests((items) => items.filter((item) => item.id !== request.id));
    setTreatmentUpdates((items) => items.filter((item) => item.requestId !== request.id));
    setSelectedRequestId(null);
    showToast("הבקשה נמחקה מהדאטה בייס.");
  }

  async function sendRequestClosedEmail(requestId: number) {
    if (!isSupabaseConfigured || !supabase) {
      showToast("במצב דמו הבקשה נסגרה ללא שליחת מייל אמיתי.");
      return false;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      showToast("הבקשה נסגרה, אבל צריך להתחבר מחדש כדי לשלוח מייל.");
      return false;
    }

    const response = await fetch("/api/notifications/request-closed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ requestId })
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      const reason = typeof result?.reason === "string" ? result.reason : "";
      const message = result?.error === "missing_email_config"
        ? "הבקשה נסגרה, אבל הגדרות המייל ב-Vercel חסרות או לא תקינות."
        : reason === "auth"
          ? "הבקשה נסגרה, אבל Gmail דחה את פרטי השליחה. בדקו App Password."
          : reason === "recipient"
            ? "הבקשה נסגרה, אבל כתובת המייל של המגישה נדחתה."
            : reason === "connection"
              ? "הבקשה נסגרה, אבל השרת לא הצליח להתחבר ל-Gmail."
              : "הבקשה נסגרה, אבל שליחת המייל נכשלה.";
      showToast(message);
      return false;
    }

    showToast("הבקשה נסגרה ונשלח מייל למגישה.");
    return true;
  }

  async function closeRequest(updated: TechRequest, shouldSendEmail: boolean) {
    const saved = await updateRequest(updated, "הבקשה נסגרה ונשמרה בדאטה בייס.");

    if (saved && shouldSendEmail && saved.closingMessage?.trim()) {
      await sendRequestClosedEmail(saved.id);
    }
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
      showToast("פרטי המשתמשת נשמרו.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      showToast("צריך להתחבר מחדש כדי לערוך משתמשות.");
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: updated.id,
        previousEmail: current.email,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        classNames: updated.classNames ?? [],
        active: updated.active
      })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.user) {
      const message = result?.error === "cannot_disable_self"
        ? "אי אפשר להשבית את המשתמשת המחוברת כרגע."
        : result?.error === "missing_service_role_key"
          ? "צריך להגדיר SUPABASE_SERVICE_ROLE_KEY ב-Vercel כדי לערוך משתמשות ב-Auth."
          : "שמירת המשתמשת נכשלה.";
      showToast(message);
      return;
    }

    const saved = mapUser(result.user);
    setUsers((items) => items.map((item) => (item.id === id ? saved : item)));
    showToast("פרטי המשתמשת נשמרו.");
  }

  async function deleteUser(user: User) {
    if (user.id === currentUser?.id) {
      showToast("אי אפשר למחוק את המשתמשת המחוברת כרגע.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      const hasHistory = requests.some((request) => request.requesterId === user.id || request.handlerId === user.id) || treatmentUpdates.some((update) => update.authorId === user.id);
      setUsers((items) => hasHistory
        ? items.map((item) => item.id === user.id ? { ...item, active: false } : item)
        : items.filter((item) => item.id !== user.id)
      );
      showToast(hasHistory ? "המשתמשת הושבתה כדי לשמור היסטוריית טיפול ובקשות." : "המשתמשת נמחקה.");
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
          : result?.error === "linked_history_check_failed"
            ? "בדיקת היסטוריית המשתמשת נכשלה. נסו שוב."
            : "מחיקת המשתמשת נכשלה.";
      showToast(message);
      return;
    }

    if (result?.mode === "disabled" && result.user) {
      const saved = mapUser(result.user);
      setUsers((items) => items.map((item) => item.id === saved.id ? saved : item));
      showToast(result?.authWarning === "auth_user_delete_failed"
        ? "המשתמשת הושבתה במערכת, אבל מחיקת חשבון ההתחברות נכשלה."
        : "המשתמשת הושבתה ונחסמה מכניסה, כדי לשמור היסטוריית טיפול ובקשות."
      );
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

  async function deleteStudent(student: Student) {
    const hasRequests = requests.some((request) => request.studentId === student.id);

    if (!isSupabaseConfigured || !supabase) {
      setStudents((items) => hasRequests
        ? items.map((item) => item.id === student.id ? { ...item, active: false } : item)
        : items.filter((item) => item.id !== student.id)
      );
      showToast(hasRequests ? "התלמיד/ה הושבתו כדי לשמור היסטוריית בקשות." : "התלמיד/ה נמחקו מהרשימה.");
      return true;
    }

    if (hasRequests) {
      const { data, error } = await supabase.from("students").update({ active: false }).eq("id", student.id).select("*").single();
      if (error) {
        showToast("השבתת התלמיד/ה נכשלה.");
        return false;
      }
      setStudents((items) => items.map((item) => (item.id === student.id ? mapStudent(data) : item)));
      showToast("התלמיד/ה הושבתו כדי לשמור היסטוריית בקשות.");
      return true;
    }

    const { error } = await supabase.from("students").delete().eq("id", student.id);
    if (error) {
      showToast("מחיקת התלמיד/ה נכשלה.");
      return false;
    }
    setStudents((items) => items.filter((item) => item.id !== student.id));
    showToast("התלמיד/ה נמחקו מהדאטה בייס.");
    return true;
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


  async function createSchoolDevice(device: SchoolDevice) {
    if (!isSupabaseConfigured || !supabase || !equipmentSupported) {
      setSchoolDevices((items) => [...items, device]);
      showToast(equipmentSupported ? "המכשיר נוסף לרשימת הציוד." : "המכשיר נוסף מקומית. צריך להריץ SQL לציוד כדי לשמור בדאטה בייס.");
      return;
    }

    const { data, error } = await supabase.from("school_devices").insert(schoolDevicePayload(device)).select("*").single();
    if (error) {
      showToast("שמירת המכשיר בדאטה בייס נכשלה.");
      return;
    }
    setSchoolDevices((items) => [...items, mapSchoolDevice(data)]);
    showToast("המכשיר נשמר בדאטה בייס.");
  }

  async function checkoutSchoolDevice(device: SchoolDevice, borrowerId: number, note: string, expectedReturn?: string) {
    if (!currentUser) return;
    if (device.status !== "available") {
      showToast("המכשיר לא זמין להשאלה כרגע.");
      return;
    }

    const borrower = users.find((user) => user.id === borrowerId && user.active) ?? currentUser;
    const nowIso = new Date().toISOString();
    const loan: DeviceLoan = {
      id: Date.now(),
      deviceId: device.id,
      borrowerId: borrower.id,
      checkedOutAt: displayDateTime(nowIso),
      checkedOutAtIso: nowIso,
      expectedReturn: expectedReturn || undefined,
      checkoutNote: note || undefined,
      status: "open"
    };
    const updatedDevice = { ...device, status: "checked_out" as SchoolDeviceStatus, location: borrower.name };

    if (!isSupabaseConfigured || !supabase || !equipmentSupported) {
      setDeviceLoans((items) => [loan, ...items]);
      setSchoolDevices((items) => items.map((item) => item.id === device.id ? updatedDevice : item));
      showToast(equipmentSupported ? `המכשיר נרשם על שם ${borrower.name}.` : `המכשיר נרשם על שם ${borrower.name} מקומית. צריך להריץ SQL לציוד כדי לשמור בדאטה בייס.`);
      return;
    }

    const { data: loanData, error: loanError } = await supabase.from("school_device_loans").insert(deviceLoanPayload(loan)).select("*").single();
    if (loanError) {
      showToast("רישום ההשאלה נכשל.");
      return;
    }

    const { data: deviceData, error: deviceError } = await supabase.from("school_devices").update(schoolDevicePayload(updatedDevice)).eq("id", device.id).select("*").single();
    if (deviceError) {
      showToast("ההשאלה נרשמה, אבל עדכון מצב המכשיר נכשל.");
      setDeviceLoans((items) => [mapDeviceLoan(loanData), ...items]);
      return;
    }

    setDeviceLoans((items) => [mapDeviceLoan(loanData), ...items]);
    setSchoolDevices((items) => items.map((item) => item.id === device.id ? mapSchoolDevice(deviceData) : item));
    showToast(`המכשיר נרשם על שם ${borrower.name}.`);
  }

  async function createDeviceAvailabilityBlock(block: DeviceAvailabilityBlock) {
    if (!isSupabaseConfigured || !supabase || !equipmentSupported) {
      setDeviceAvailabilityBlocks((items) => [...items, block]);
      showToast(equipmentSupported ? "סגירת הזמינות נשמרה." : "סגירת הזמינות נשמרה מקומית. צריך להריץ SQL לציוד כדי לשמור בדאטה בייס.");
      return;
    }

    const { data, error } = await supabase.from("school_device_availability_blocks").insert(deviceAvailabilityBlockPayload(block)).select("*").single();
    if (error) {
      showToast("שמירת סגירת הזמינות נכשלה.");
      return;
    }
    setDeviceAvailabilityBlocks((items) => [...items, mapDeviceAvailabilityBlock(data)]);
    showToast("סגירת הזמינות נשמרה בדאטה בייס.");
  }

  async function returnSchoolDevice(loan: DeviceLoan, returnNote: string) {
    if (!currentUser) return;
    const device = schoolDevices.find((item) => item.id === loan.deviceId);
    if (!device) return;
    const trimmedNote = returnNote.trim();
    const nowIso = new Date().toISOString();
    const returnedLoan: DeviceLoan = {
      ...loan,
      returnedAt: displayDateTime(nowIso),
      returnedAtIso: nowIso,
      returnNote: trimmedNote || undefined,
      status: "returned"
    };
    const shouldOpenMaintenance = Boolean(trimmedNote);
    const updatedDevice = {
      ...device,
      status: "available" as SchoolDeviceStatus,
      location: "ארון תקשוב"
    };
    const maintenanceItem: DeviceMaintenance | null = shouldOpenMaintenance ? {
      id: Date.now() + 1,
      deviceId: device.id,
      loanId: loan.id,
      reporterId: currentUser.id,
      note: trimmedNote,
      status: "open",
      createdAt: displayDateTime(nowIso),
      createdAtIso: nowIso
    } : null;

    if (!isSupabaseConfigured || !supabase || !equipmentSupported) {
      setDeviceLoans((items) => items.map((item) => item.id === loan.id ? returnedLoan : item));
      setSchoolDevices((items) => items.map((item) => item.id === device.id ? updatedDevice : item));
      if (maintenanceItem) setDeviceMaintenance((items) => [maintenanceItem, ...items]);
      showToast(maintenanceItem ? "המכשיר הוחזר, נשאר זמין ונפתחה הערה לתחזוקה." : "המכשיר הוחזר וזמין להשאלה.");
      return;
    }

    const { data: loanData, error: loanError } = await supabase.from("school_device_loans").update(deviceLoanPayload(returnedLoan)).eq("id", loan.id).select("*").single();
    if (loanError) {
      showToast("רישום ההחזרה נכשל.");
      return;
    }

    const { data: deviceData, error: deviceError } = await supabase.from("school_devices").update(schoolDevicePayload(updatedDevice)).eq("id", device.id).select("*").single();
    if (deviceError) {
      showToast("ההחזרה נרשמה, אבל עדכון מצב המכשיר נכשל.");
      return;
    }

    let savedMaintenance: DeviceMaintenance | null = null;
    if (maintenanceItem) {
      const { data, error } = await supabase.from("school_device_maintenance").insert(deviceMaintenancePayload(maintenanceItem)).select("*").single();
      if (!error && data) savedMaintenance = mapDeviceMaintenance(data);
    }

    setDeviceLoans((items) => items.map((item) => item.id === loan.id ? mapDeviceLoan(loanData) : item));
    setSchoolDevices((items) => items.map((item) => item.id === device.id ? mapSchoolDevice(deviceData) : item));
    if (savedMaintenance) setDeviceMaintenance((items) => [savedMaintenance, ...items]);
    showToast(savedMaintenance ? "המכשיר הוחזר, נשאר זמין ונפתחה הערה לתחזוקה." : "המכשיר הוחזר וזמין להשאלה.");
  }

  async function updateDeviceMaintenance(item: DeviceMaintenance, status: MaintenanceStatus, deviceStatus?: SchoolDeviceStatus) {
    const updated: DeviceMaintenance = {
      ...item,
      status,
      handlerId: currentUser?.id ?? item.handlerId,
      closedAt: status === "closed" ? new Date().toISOString() : undefined
    };
    const device = schoolDevices.find((entry) => entry.id === item.deviceId);
    const updatedDevice = deviceStatus && device ? {
      ...device,
      status: deviceStatus,
      location: deviceStatus === "available" ? "ארון תקשוב" : "ממתין לבדיקת צוות טכנולוגיה"
    } : null;

    if (!isSupabaseConfigured || !supabase || !equipmentSupported) {
      setDeviceMaintenance((items) => items.map((entry) => entry.id === item.id ? updated : entry));
      if (updatedDevice) setSchoolDevices((items) => items.map((entry) => entry.id === updatedDevice.id ? updatedDevice : entry));
      showToast(deviceStatus === "repair" ? "המכשיר הוצא מזמינות והתחזוקה נשארה פתוחה." : status === "closed" ? "משימת התחזוקה נסגרה והמכשיר זמין." : "סטטוס התחזוקה עודכן.");
      return;
    }

    const { data, error } = await supabase.from("school_device_maintenance").update(deviceMaintenancePayload(updated)).eq("id", item.id).select("*").single();
    if (error) {
      showToast("עדכון התחזוקה נכשל.");
      return;
    }
    setDeviceMaintenance((items) => items.map((entry) => entry.id === item.id ? mapDeviceMaintenance(data) : entry));
    if (updatedDevice) {
      const { data: deviceData } = await supabase.from("school_devices").update(schoolDevicePayload(updatedDevice)).eq("id", updatedDevice.id).select("*").single();
      if (deviceData) setSchoolDevices((items) => items.map((entry) => entry.id === updatedDevice.id ? mapSchoolDevice(deviceData) : entry));
    }
    showToast(deviceStatus === "repair" ? "המכשיר הוצא מזמינות והתחזוקה נשארה פתוחה." : status === "closed" ? "משימת התחזוקה נסגרה והמכשיר זמין." : "סטטוס התחזוקה עודכן.");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src="/mashi-logo.png" alt="בית ספר משי" />
          </div>
          <h1>פורטל טכנולוגיה מסייעת</h1>
          <p>בקשות עבור ציוד תלמידים, שימוש בציוד בית ספרי וניהול מערכת במקום אחד.</p>
          <div className="brand-dots" aria-hidden="true">
            <span className="dot-yellow" />
            <span className="dot-lime" />
            <span className="dot-cyan" />
            <span className="dot-coral" />
          </div>
        </div>

        {isAuthenticated ? (
          <>
            <div className="portal-switcher" aria-label="בחירת מערכת">
              {availableSystems.map((system) => (
                <button
                  key={system}
                  className={`portal-switch-button ${activeSystem === system ? "active" : ""}`}
                  type="button"
                  onClick={() => switchSystem(system)}
                >
                  <strong>{systemLabels[system].title}</strong>
                  <span>{systemLabels[system].subtitle}</span>
                </button>
              ))}
            </div>
          </>
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

      {isAuthenticated && (
        <nav className="mobile-bottom-nav" aria-label="ניווט ראשי במובייל">
          {availableSystems.map((system) => (
            <button
              key={system}
              className={`mobile-bottom-button ${activeSystem === system ? "active" : ""}`}
              type="button"
              onClick={() => switchSystem(system)}
              aria-current={activeSystem === system ? "page" : undefined}
            >
              <MobileSystemIcon system={system} />
              <span>{systemLabels[system].mobileLabel}</span>
            </button>
          ))}
        </nav>
      )}

      <section className="main">
        {toast && <div className="toast">{toast}</div>}
        {isAuthenticated && view !== "login" && (
          <div className="portal-context-bar">
            <div>
              <span className="section-kicker">{systemLabels[activeSystem].title}</span>
              <p>{systemLabels[activeSystem].subtitle}</p>
            </div>
            <div className="portal-view-tabs" aria-label={`מסכים בתוך ${systemLabels[activeSystem].title}`}>
              {activeSystemNav.map((item) => {
                const isActive = item.equipmentPage ? view === item.view && equipmentPage === item.equipmentPage : view === item.view;
                return (
                  <button
                    key={`${item.view}-${item.equipmentPage ?? "main"}`}
                    className={isActive ? "active" : ""}
                    type="button"
                    onClick={() => navigatePortalItem(item)}
                  >
                    {item.mobileLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
            onCloseDetails={() => setSelectedRequestId(null)}
          />
        )}
        {view === "newRequest" && currentUser && (
          <NewRequest
            students={students}
            currentUser={currentUser}
            onCreate={createRequest}
          />
        )}
        {view === "updates" && canManage && currentUser && (
          <RecentUpdates
            requests={requests}
            users={users}
            treatmentUpdates={treatmentUpdates}
            onOpen={(id) => {
              setSelectedRequestId(id);
              navigate("manageRequests");
            }}
          />
        )}
        {view === "manageRequests" && canManage && currentUser && (
          <ManageRequests
            requests={requests}
            users={users}
            selectedRequest={selectedRequest}
            selectedRequestStudent={selectedRequestStudent}
            treatmentUpdates={treatmentUpdates}
            currentUser={currentUser}
            onSelect={setSelectedRequestId}
            onCloseDetails={() => setSelectedRequestId(null)}
            onUpdate={async (updated) => {
              await updateRequest(updated);
            }}
            onClose={closeRequest}
            onDelete={deleteRequest}
            onAddTreatmentUpdate={addTreatmentUpdate}
          />
        )}
        {view === "equipment" && currentUser && (
          <EquipmentHub
            devices={schoolDevices}
            loans={deviceLoans}
            maintenance={deviceMaintenance}
            users={users}
            currentUser={currentUser}
            canManage={canManage}
            onCreateDevice={createSchoolDevice}
            availabilityBlocks={deviceAvailabilityBlocks}
            onCheckout={checkoutSchoolDevice}
            onReturn={returnSchoolDevice}
            onCreateAvailabilityBlock={createDeviceAvailabilityBlock}
            equipmentPage={equipmentPage}
            onUpdateMaintenance={updateDeviceMaintenance}
          />
        )}
        {view === "users" && role === "admin" && currentUser && (
          <UsersAdmin
            users={users}
            currentUserId={currentUser.id}
            onInvite={createUser}
            onUpdate={(user) => patchUser(user.id, user)}
            onDelete={deleteUser}
          />
        )}
        {view === "students" && role === "admin" && (
          <StudentsAdmin
            students={students}
            requests={requests}
            onAdd={createStudent}
            onUpdate={updateStudent}
            onDelete={deleteStudent}
            onImport={importStudents}
          />
        )}
      </section>
    </main>
  );
}

function MobileSystemIcon({ system }: { system: PortalSystem }) {
  if (system === "equipment") {
    return (
      <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 7h12v11H6z" />
        <path d="M9 4h6" />
        <path d="M10 20h4" />
      </svg>
    );
  }

  if (system === "admin") {
    return (
      <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        <path d="M4 12h2M18 12h2M12 4v2M12 18v2" />
      </svg>
    );
  }

  return (
    <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10v16H7z" />
      <path d="M9.5 8h5M9.5 12h5M9.5 16h3" />
    </svg>
  );
}

function MobileNavIcon({ view }: { view: View }) {
  if (view === "updates") {
    return (
      <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6h14" />
        <path d="M5 12h9" />
        <path d="M5 18h6" />
        <path d="M17 11v7" />
        <path d="M14 14l3-3 3 3" />
      </svg>
    );
  }

  if (view === "manageRequests") {
    return (
      <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6h14M5 12h14M5 18h8" />
      </svg>
    );
  }

  if (view === "equipment") {
    return (
      <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 7h12v11H6z" />
        <path d="M9 4h6" />
        <path d="M10 20h4" />
      </svg>
    );
  }

  if (view === "myRequests") {
    return (
      <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10v16H7z" />
        <path d="M9.5 8h5M9.5 12h5M9.5 16h3" />
      </svg>
    );
  }

  if (view === "newRequest") {
    return (
      <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (view === "users") {
    return (
      <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M17 10a2.5 2.5 0 1 0 0-5" />
        <path d="M16 14.5a4.5 4.5 0 0 1 4.5 4.5" />
      </svg>
    );
  }

  if (view === "students") {
    return (
      <svg className="mobile-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4 4 8l8 4 8-4-8-4z" />
        <path d="M7 10.5V15c0 1.8 2.2 3 5 3s5-1.2 5-3v-4.5" />
        <path d="M20 8v6" />
      </svg>
    );
  }

  return null;
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


function RecentUpdates({
  requests,
  users,
  treatmentUpdates,
  onOpen
}: {
  requests: TechRequest[];
  users: User[];
  treatmentUpdates: TreatmentUpdate[];
  onOpen: (id: number) => void;
}) {
  const recentRequests = useMemo(
    () => requests.filter((request) => isWithinLastHours(request.createdAtIso ?? request.createdAt, 24)),
    [requests]
  );
  const recentTreatmentUpdates = useMemo(
    () => treatmentUpdates.filter((update) => isWithinLastHours(update.createdAtIso ?? update.createdAt, 24)),
    [treatmentUpdates]
  );
  const touchedRequestIds = new Set([...recentRequests.map((request) => request.id), ...recentTreatmentUpdates.map((update) => update.requestId)]);
  const touchedRequests = requests.filter((request) => touchedRequestIds.has(request.id));
  const openTouched = touchedRequests.filter((request) => request.status !== "closed").length;

  return (
    <>
      <Topbar title="מה חדש" subtitle="סיכום מהיר של בקשות ועדכוני טיפול מ-24 השעות האחרונות." />
      <section className="recent-summary-grid" aria-label="סיכום 24 שעות">
        <div className="recent-summary-card tone-new">
          <strong>{recentRequests.length}</strong>
          <span>בקשות חדשות</span>
        </div>
        <div className="recent-summary-card tone-progress">
          <strong>{recentTreatmentUpdates.length}</strong>
          <span>עדכוני טיפול</span>
        </div>
        <div className="recent-summary-card tone-waiting">
          <strong>{touchedRequests.length}</strong>
          <span>בקשות שנגעו בהן</span>
        </div>
        <div className="recent-summary-card tone-closed">
          <strong>{openTouched}</strong>
          <span>עדיין פתוחות</span>
        </div>
      </section>

      <section className="panel recent-panel">
        <div className="panel-header">
          <h3>פעילות אחרונה</h3>
          <span className="panel-count">24 שעות</span>
        </div>
        <div className="panel-body recent-activity-list">
          {!recentRequests.length && !recentTreatmentUpdates.length ? (
            <div className="empty compact">לא נרשמה פעילות חדשה ב-24 השעות האחרונות.</div>
          ) : (
            <>
              {recentRequests.map((request) => {
                const requester = users.find((user) => user.id === request.requesterId);
                return (
                  <button className="recent-activity-card" type="button" key={`request-${request.id}`} onClick={() => onOpen(request.id)}>
                    <span className="section-kicker">בקשה חדשה</span>
                    <strong>#{request.id} · {request.subjectName}</strong>
                    <span>{request.className} · {request.requestType}</span>
                    <p>{request.description}</p>
                    <em>{requester?.name ?? "לא ידוע"} · {request.createdAt}</em>
                  </button>
                );
              })}
              {recentTreatmentUpdates.map((update) => {
                const request = requests.find((item) => item.id === update.requestId);
                const author = users.find((user) => user.id === update.authorId);
                return (
                  <button className="recent-activity-card treatment" type="button" key={`update-${update.id}`} onClick={() => onOpen(update.requestId)}>
                    <span className="section-kicker">עדכון טיפול</span>
                    <strong>#{update.requestId} · {request?.subjectName ?? "בקשה"}</strong>
                    <span>{request?.className ?? ""}</span>
                    <p>{update.note}</p>
                    <em>{author?.name ?? "לא ידוע"} · {update.createdAt}</em>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function EquipmentHub({
  devices,
  loans,
  maintenance,
  availabilityBlocks,
  users,
  currentUser,
  canManage,
  onCreateDevice,
  onCheckout,
  onReturn,
  onCreateAvailabilityBlock,
  equipmentPage,
  onUpdateMaintenance
}: {
  devices: SchoolDevice[];
  loans: DeviceLoan[];
  maintenance: DeviceMaintenance[];
  availabilityBlocks: DeviceAvailabilityBlock[];
  users: User[];
  currentUser: User;
  canManage: boolean;
  onCreateDevice: (device: SchoolDevice) => void | Promise<void>;
  onCheckout: (device: SchoolDevice, borrowerId: number, note: string, expectedReturn?: string) => void | Promise<void>;
  onReturn: (loan: DeviceLoan, returnNote: string) => void | Promise<void>;
  onCreateAvailabilityBlock: (block: DeviceAvailabilityBlock) => void | Promise<void>;
  equipmentPage: EquipmentPage;
  onUpdateMaintenance: (item: DeviceMaintenance, status: MaintenanceStatus, deviceStatus?: SchoolDeviceStatus) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [deviceType, setDeviceType] = useState<SchoolDeviceType>("אייפד");
  const [serialNumber, setSerialNumber] = useState("");
  const [deviceNotes, setDeviceNotes] = useState("");
  const [filter, setFilter] = useState<"all" | SchoolDeviceStatus>("all");
  const [checkoutDevice, setCheckoutDevice] = useState<SchoolDevice | null>(null);
  const [checkoutNote, setCheckoutNote] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [checkoutBorrowerId, setCheckoutBorrowerId] = useState(currentUser.id);
  const [returnLoan, setReturnLoan] = useState<DeviceLoan | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [blockDeviceId, setBlockDeviceId] = useState(devices[0]?.id ?? 0);
  const [blockDayOfWeek, setBlockDayOfWeek] = useState(0);
  const [blockStartTime, setBlockStartTime] = useState("08:00");
  const [blockEndTime, setBlockEndTime] = useState("09:00");
  const [blockNote, setBlockNote] = useState("");
  const activeLoans = loans.filter((loan) => loan.status === "open");
  const manageableLoans = canManage ? activeLoans : activeLoans.filter((loan) => loan.borrowerId === currentUser.id);
  const openMaintenance = maintenance.filter((item) => item.status !== "closed");
  const maintenanceLog = maintenance
    .slice()
    .sort((first, second) => (parseDateValue(second.createdAtIso ?? second.createdAt)?.getTime() ?? 0) - (parseDateValue(first.createdAtIso ?? first.createdAt)?.getTime() ?? 0));
  const visibleDevices = devices.filter((device) => device.active && (filter === "all" || device.status === filter));
  const activeUsers = users.filter((user) => user.active);
  const activeAvailabilityBlocks = availabilityBlocks.filter((block) => block.active);

  const counts = {
    available: devices.filter((device) => device.active && device.status === "available").length,
    checkedOut: devices.filter((device) => device.active && device.status === "checked_out").length,
    repair: devices.filter((device) => device.active && device.status === "repair").length,
    total: devices.filter((device) => device.active).length
  };

  function borrowerName(deviceId: number) {
    const loan = activeLoans.find((item) => item.deviceId === deviceId);
    return users.find((user) => user.id === loan?.borrowerId)?.name ?? "לא ידוע";
  }

  function openCheckout(device: SchoolDevice) {
    setCheckoutDevice(device);
    setCheckoutBorrowerId(currentUser.id);
    setCheckoutNote("");
    setExpectedReturn("");
    setCheckoutBorrowerId(currentUser.id);
  }

  function openReturn(loan: DeviceLoan) {
    setReturnLoan(loan);
    setReturnNote("");
  }

  function closeEquipmentModal() {
    setCheckoutDevice(null);
    setCheckoutNote("");
    setExpectedReturn("");
    setReturnLoan(null);
    setReturnNote("");
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkoutDevice) return;
    await onCheckout(checkoutDevice, checkoutBorrowerId, checkoutNote.trim(), expectedReturn.trim() || undefined);
    closeEquipmentModal();
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returnLoan) return;
    await onReturn(returnLoan, returnNote.trim());
    closeEquipmentModal();
  }

  function submitDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onCreateDevice({
      id: Date.now(),
      name: name.trim(),
      deviceType,
      serialNumber: serialNumber.trim() || undefined,
      location: "ארון תקשוב",
      status: "available",
      notes: deviceNotes.trim() || undefined,
      active: true
    });
    setName("");
    setSerialNumber("");
    setDeviceNotes("");
  }

  function submitAvailabilityBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blockDeviceId || !blockStartTime || !blockEndTime) return;
    onCreateAvailabilityBlock({
      id: Date.now(),
      deviceId: blockDeviceId,
      dayOfWeek: blockDayOfWeek,
      startTime: blockStartTime,
      endTime: blockEndTime,
      note: blockNote.trim() || undefined,
      active: true
    });
    setBlockNote("");
  }

  function activeBlockForDevice(deviceId: number) {
    return activeAvailabilityBlocks.find((block) => block.deviceId === deviceId && isAvailabilityBlockActive(block));
  }

  return (
    <>
      <Topbar
        title="ציוד בית ספרי"
        subtitle="השאלה, החזרה ותחזוקה של מכשירים משותפים של צוות טכנולוגיה מסייעת. ציוד אישי של תלמידים נשאר במערכת הבקשות."
      />

      <div className="equipment-summary-grid" aria-label="תקציר ציוד בית ספרי">
        <button className={`equipment-summary-card tone-available ${filter === "available" ? "active" : ""}`} type="button" onClick={() => setFilter(filter === "available" ? "all" : "available")}>
          <strong>{counts.available}</strong>
          <span>זמינים להשאלה</span>
        </button>
        <button className={`equipment-summary-card tone-loaned ${filter === "checked_out" ? "active" : ""}`} type="button" onClick={() => setFilter(filter === "checked_out" ? "all" : "checked_out")}>
          <strong>{counts.checkedOut}</strong>
          <span>מושאלים עכשיו</span>
        </button>
        <button className={`equipment-summary-card tone-repair ${filter === "repair" ? "active" : ""}`} type="button" onClick={() => setFilter(filter === "repair" ? "all" : "repair")}>
          <strong>{counts.repair}</strong>
          <span>דורשים תחזוקה</span>
        </button>
        <button className={`equipment-summary-card ${filter === "all" ? "active" : ""}`} type="button" onClick={() => setFilter("all")}>
          <strong>{counts.total}</strong>
          <span>סה״כ ציוד פעיל</span>
        </button>
      </div>

      {equipmentPage === "devices" && (
        <section className="panel equipment-device-panel">
          <div className="panel-header">
            <div>
              <h3>מכשירים להשאלה</h3>
              <p>רשימת הציוד הבית ספרי המשותף. ציוד אישי של תלמידים נשאר במערכת הבקשות.</p>
            </div>
          </div>
          <div className="equipment-device-grid">
            {visibleDevices.map((device) => {
              const loan = activeLoans.find((item) => item.deviceId === device.id);
              const isMine = loan?.borrowerId === currentUser.id;
              const canReturnLoan = Boolean(loan && (isMine || canManage));
              const activeBlock = activeBlockForDevice(device.id);
              const isBlockedNow = Boolean(activeBlock);
              return (
                <article className={`equipment-device-card status-${isBlockedNow ? "blocked" : device.status}`} key={device.id}>
                  <div className="equipment-card-topline">
                    <span className={`equipment-status ${isBlockedNow ? "blocked" : device.status}`}>{isBlockedNow ? "סגור עכשיו" : schoolDeviceStatusLabels[device.status]}</span>
                    <span>{device.deviceType}</span>
                  </div>
                  <strong>{device.name}</strong>
                  <span className="equipment-meta">{device.serialNumber || "אין מספר סידורי"}</span>
                  <p>{device.status === "checked_out" ? `נמצא אצל ${borrowerName(device.id)}` : device.location || "לא צוין מיקום"}</p>
                  {activeBlock && <p className="equipment-note blocked">{formatAvailabilityBlock(activeBlock)}{activeBlock.note ? ` · ${activeBlock.note}` : ""}</p>}
                  {device.notes && <p className="equipment-note">{device.notes}</p>}
                  <div className="button-row compact-actions">
                    {device.status === "available" && !isBlockedNow && <button className="btn primary" type="button" onClick={() => openCheckout(device)}>לקיחה</button>}
                    {canReturnLoan && loan && <button className="btn" type="button" onClick={() => openReturn(loan)}>החזרה</button>}
                    {(device.status !== "available" || isBlockedNow) && !canReturnLoan && <span className="equipment-muted-action">לא זמין כרגע</span>}
                  </div>
                </article>
              );
            })}
            {!visibleDevices.length && <div className="empty soft-empty">אין מכשירים להצגה בסינון הזה.</div>}
          </div>
        </section>
      )}

      {equipmentPage === "mine" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>{canManage ? "השאלות פעילות" : "אצלי עכשיו"}</h3>
              <p>{canManage ? "ציוד בית ספרי שמושאל כרגע לכל אנשי הצוות, כולל החזרה בשם אחרים." : "ציוד בית ספרי שרשום כרגע על המשתמשת שלך."}</p>
            </div>
            <span className="section-count">{manageableLoans.length}</span>
          </div>
          <div className="panel-body equipment-loan-list equipment-list-wide">
            {manageableLoans.length ? manageableLoans.map((loan) => {
              const device = devices.find((item) => item.id === loan.deviceId);
              const borrower = users.find((user) => user.id === loan.borrowerId);
              return (
                <article className="equipment-loan-card" key={loan.id}>
                  <strong>{device?.name ?? "מכשיר"}</strong>
                  <span>אצל: {borrower?.name ?? "לא ידוע"}</span>
                  <span>נלקח: {loan.checkedOutAt}</span>
                  {loan.expectedReturn && <span>צפי החזרה: {loan.expectedReturn}</span>}
                  {loan.checkoutNote && <p>{loan.checkoutNote}</p>}
                  <button className="btn" type="button" onClick={() => openReturn(loan)}>החזרה</button>
                </article>
              );
            }) : <div className="empty compact">{canManage ? "אין ציוד מושאל כרגע." : "אין אצלך ציוד מושאל כרגע."}</div>}
          </div>
        </section>
      )}

      {equipmentPage === "maintenance" && canManage && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>תחזוקה פתוחה</h3>
              <p>הערות החזרה ותקלות שעדיין דורשות טיפול.</p>
            </div>
            <span className="section-count">{openMaintenance.length}</span>
          </div>
          <div className="panel-body equipment-maintenance-list equipment-list-wide">
            {openMaintenance.length ? openMaintenance.map((item) => {
              const device = devices.find((entry) => entry.id === item.deviceId);
              const reporter = users.find((user) => user.id === item.reporterId);
              return (
                <article className="equipment-maintenance-card" key={item.id}>
                  <div>
                    <strong>{device?.name ?? "מכשיר"}</strong>
                    <span>{maintenanceStatusLabels[item.status]} · {item.createdAt}</span>
                  </div>
                  <p>{item.note}</p>
                  {reporter && <span className="equipment-meta">דווח על ידי {reporter.name}</span>}
                  <div className="button-row compact-actions">
                    <button className="btn primary" type="button" onClick={() => onUpdateMaintenance(item, "closed", "available")}>להשאיר זמין ולסגור</button>
                    <button className="btn danger" type="button" onClick={() => onUpdateMaintenance(item, "progress", "repair")}>להוציא מזמינות</button>
                    {item.status === "open" && <button className="btn" type="button" onClick={() => onUpdateMaintenance(item, "progress")}>רק לסמן בטיפול</button>}
                  </div>
                </article>
              );
            }) : <div className="empty compact">אין משימות תחזוקה פתוחות.</div>}
          </div>
        </section>
      )}

      {equipmentPage === "log" && canManage && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>יומן אירועי תחזוקה</h3>
              <p>כל אירועי התחזוקה שנפתחו מהחזרות או נרשמו ידנית.</p>
            </div>
            <span className="section-count">{maintenanceLog.length}</span>
          </div>
          <div className="panel-body equipment-maintenance-list equipment-list-wide">
            {maintenanceLog.length ? maintenanceLog.map((item) => {
              const device = devices.find((entry) => entry.id === item.deviceId);
              const reporter = users.find((user) => user.id === item.reporterId);
              const handler = users.find((user) => user.id === item.handlerId);
              return (
                <article className="equipment-maintenance-card" key={item.id}>
                  <div>
                    <strong>{device?.name ?? "מכשיר"}</strong>
                    <span>{maintenanceStatusLabels[item.status]} · {item.createdAt}</span>
                  </div>
                  <p>{item.note}</p>
                  <span className="equipment-meta">
                    {reporter ? `דיווח: ${reporter.name}` : "דיווח: לא ידוע"}
                    {handler ? ` · טיפול: ${handler.name}` : ""}
                    {item.closedAt ? ` · נסגר: ${item.closedAt}` : ""}
                  </span>
                </article>
              );
            }) : <div className="empty compact">אין עדיין אירועי תחזוקה ביומן.</div>}
          </div>
        </section>
      )}

      {equipmentPage === "manage" && currentUser.role === "admin" && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>ניהול מכשירים</h3>
              <p>הוספת ציוד בית ספרי לרשימת ההשאלה.</p>
            </div>
          </div>
          <div className="panel-body equipment-management-grid">
            <div className="equipment-management-forms">
              <form className="equipment-add-form" onSubmit={submitDevice}>
                <strong className="equipment-form-title">הוספת מכשיר</strong>
                <div className="field">
                  <label htmlFor="schoolDeviceName">שם מכשיר</label>
                  <input id="schoolDeviceName" value={name} onChange={(event) => setName(event.target.value)} placeholder="לדוגמה: אייפד 04" />
                </div>
                <div className="field">
                  <label htmlFor="schoolDeviceType">סוג</label>
                  <select id="schoolDeviceType" value={deviceType} onChange={(event) => setDeviceType(event.target.value as SchoolDeviceType)}>
                    {schoolDeviceTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="schoolDeviceSerial">מספר סידורי</label>
                  <input id="schoolDeviceSerial" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="schoolDeviceNotes">הערות</label>
                  <textarea id="schoolDeviceNotes" value={deviceNotes} onChange={(event) => setDeviceNotes(event.target.value)} />
                </div>
                <button className="btn primary" type="submit">הוספת מכשיר</button>
              </form>

              <form className="equipment-add-form" onSubmit={submitAvailabilityBlock}>
                <strong className="equipment-form-title">סגירת זמינות קבועה</strong>
                <div className="field">
                  <label htmlFor="blockDevice">מכשיר</label>
                  <select id="blockDevice" value={blockDeviceId} onChange={(event) => setBlockDeviceId(Number(event.target.value))}>
                    {devices.filter((device) => device.active).map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="blockDay">יום</label>
                  <select id="blockDay" value={blockDayOfWeek} onChange={(event) => setBlockDayOfWeek(Number(event.target.value))}>
                    {hebrewWeekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
                  </select>
                </div>
                <div className="form-grid compact-time-grid">
                  <div className="field">
                    <label htmlFor="blockStart">משעה</label>
                    <input id="blockStart" type="time" value={blockStartTime} onChange={(event) => setBlockStartTime(event.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="blockEnd">עד שעה</label>
                    <input id="blockEnd" type="time" value={blockEndTime} onChange={(event) => setBlockEndTime(event.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="blockNote">סיבה / הערה</label>
                  <input id="blockNote" value={blockNote} onChange={(event) => setBlockNote(event.target.value)} placeholder="לדוגמה: שמור לשיעור קבוע" />
                </div>
                <button className="btn" type="submit">שמירת סגירה</button>
              </form>
            </div>

            <div className="equipment-admin-device-list">
              {devices.filter((device) => device.active).map((device) => {
                const blocks = activeAvailabilityBlocks.filter((block) => block.deviceId === device.id);
                return (
                  <article className="equipment-loan-card" key={device.id}>
                    <strong>{device.name}</strong>
                    <span>{device.deviceType} · {schoolDeviceStatusLabels[device.status]}</span>
                    <span>{device.serialNumber || "אין מספר סידורי"}</span>
                    {blocks.length > 0 && (
                      <div className="equipment-block-list">
                        {blocks.map((block) => <span key={block.id}>{formatAvailabilityBlock(block)}{block.note ? ` · ${block.note}` : ""}</span>)}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {checkoutDevice && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`לקיחת ${checkoutDevice.name}`}>
          <section className="modal equipment-action-modal">
            <div className="panel-header">
              <div>
                <h3>לקיחת מכשיר</h3>
                <p>{checkoutDevice.name} · {checkoutDevice.deviceType}</p>
              </div>
              <button className="btn" type="button" onClick={closeEquipmentModal}>סגירה</button>
            </div>
            <div className="panel-body">
              <form className="form-grid" onSubmit={submitCheckout}>
                {canManage && (
                  <div className="field full">
                    <label htmlFor="checkoutBorrower">נלקח עבור</label>
                    <select id="checkoutBorrower" value={checkoutBorrowerId} onChange={(event) => setCheckoutBorrowerId(Number(event.target.value))}>
                      {activeUsers.map((user) => (
                        <option key={user.id} value={user.id}>{user.name} - {roleLabels[user.role]}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field full">
                  <label htmlFor="checkoutNote">לאיזו פעילות / כיתה המכשיר נלקח?</label>
                  <textarea
                    id="checkoutNote"
                    value={checkoutNote}
                    onChange={(event) => setCheckoutNote(event.target.value)}
                    placeholder="לדוגמה: פעילות תקשורת בכיתה ד׳1"
                  />
                </div>
                <div className="field full">
                  <label htmlFor="expectedReturn">מתי צפויה החזרה?</label>
                  <input
                    id="expectedReturn"
                    value={expectedReturn}
                    onChange={(event) => setExpectedReturn(event.target.value)}
                    placeholder="אפשר להשאיר ריק"
                  />
                </div>
                <div className="field full button-row">
                  <button className="btn" type="button" onClick={closeEquipmentModal}>ביטול</button>
                  <button className="btn primary" type="submit">רישום לקיחה</button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}

      {returnLoan && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="החזרת מכשיר">
          <section className="modal equipment-action-modal">
            <div className="panel-header">
              <div>
                <h3>החזרת מכשיר</h3>
                <p>{devices.find((item) => item.id === returnLoan.deviceId)?.name ?? "מכשיר"}</p>
              </div>
              <button className="btn" type="button" onClick={closeEquipmentModal}>סגירה</button>
            </div>
            <div className="panel-body">
              <form className="form-grid" onSubmit={submitReturn}>
                <div className="field full">
                  <label htmlFor="returnNote">יש הערות, תקלה או חוסר בציוד?</label>
                  <textarea
                    id="returnNote"
                    value={returnNote}
                    onChange={(event) => setReturnNote(event.target.value)}
                    placeholder="אם הכל תקין אפשר להשאיר ריק. הערה תפתח משימת תחזוקה."
                  />
                </div>
                <div className="equipment-modal-hint">
                  הערה בהחזרה תעביר את המכשיר לתחזוקה עד שמטפל/ת או אדמין יסגרו אותה.
                </div>
                <div className="field full button-row">
                  <button className="btn" type="button" onClick={closeEquipmentModal}>ביטול</button>
                  <button className="btn primary" type="submit">רישום החזרה</button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function MyRequests({
  currentUser,
  requests,
  users,
  selectedRequestId,
  onNew,
  onOpen,
  onCloseDetails
}: {
  currentUser: User;
  requests: TechRequest[];
  users: User[];
  selectedRequestId: number | null;
  onNew: () => void;
  onOpen: (id: number) => void;
  onCloseDetails: () => void;
}) {
  const ownRequests = requests.filter((request) => request.requesterId === currentUser.id);
  const classRequests = requests.filter((request) => {
    const isAssignedClass = currentUser.classNames?.includes(request.className) ?? false;
    return isAssignedClass && request.requesterId !== currentUser.id;
  });
  const visibleRequests = [...ownRequests, ...classRequests];
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
          <span>נשלחו לתיקון</span>
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
          onCloseDetails={onCloseDetails}
          renderSelected={(request) => (
            <StaffRequestPreview
              request={request}
              requester={users.find((user) => user.id === request.requesterId)}
              handler={users.find((user) => user.id === request.handlerId)}
              currentUser={currentUser}
            />
          )}
        />
        <StaffRequestSection
          title="בקשות של הכיתות שלי"
          subtitle={currentUser.classNames?.length ? formatClassList(currentUser.classNames) : "לא הוגדרו כיתות למשתמשת הזו."}
          emptyText="אין כרגע בקשות נוספות לכיתות שלך."
          requests={classRequests}
          users={users}
          selectedId={selectedRequestId}
          onOpen={onOpen}
          onCloseDetails={onCloseDetails}
          renderSelected={(request) => (
            <StaffRequestPreview
              request={request}
              requester={users.find((user) => user.id === request.requesterId)}
              handler={users.find((user) => user.id === request.handlerId)}
              currentUser={currentUser}
            />
          )}
        />
      </div>
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
  onOpen,
  onCloseDetails,
  renderSelected
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  requests: TechRequest[];
  users: User[];
  treatmentUpdates?: TreatmentUpdate[];
  selectedId: number | null;
  onOpen: (id: number) => void;
  onCloseDetails: () => void;
  renderSelected?: (request: TechRequest) => ReactNode;
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
          <RequestCards requests={requests} users={users} selectedId={selectedId} onOpen={onOpen} onCloseDetails={onCloseDetails} renderSelected={renderSelected} />
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
  handler,
  currentUser
}: {
  request: TechRequest;
  requester?: User;
  handler?: User;
  currentUser: User;
}) {
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
          <div>
            <span>מטפל</span>
            <strong>{handler?.name ?? "טרם שובץ"}</strong>
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
  const [step, setStep] = useState(0);
  const [subjectType, setSubjectType] = useState<SubjectType>("student");
  const [studentId, setStudentId] = useState(activeStudents[0]?.id ?? 0);
  const [classSubject, setClassSubject] = useState("");
  const [requestType, setRequestType] = useState(requestTypes[0]);
  const [description, setDescription] = useState("");
  const [attempted, setAttempted] = useState("");

  const selectedStudent = activeStudents.find((student) => student.id === studentId);
  const subjectName = subjectType === "student" ? selectedStudent?.fullName ?? "" : classSubject.trim();
  const requestClassName = subjectType === "student" ? selectedStudent?.className ?? "" : classSubject.trim();
  const stepLabels = ["עבור מי", "סוג בקשה", "תיאור", "סיכום"];
  const canContinue = [
    Boolean(subjectName),
    Boolean(requestType),
    Boolean(description.trim()),
    Boolean(subjectName && description.trim())
  ][step];

  function goNext() {
    if (!canContinue) return;
    setStep((current) => Math.min(current + 1, stepLabels.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < stepLabels.length - 1) {
      goNext();
      return;
    }

    const request: TechRequest = {
      id: Date.now(),
      requesterId: currentUser.id,
      subjectType,
      studentId: subjectType === "student" ? selectedStudent?.id : undefined,
      subjectName,
      className: requestClassName,
      requestType,
      description,
      attempted,
      status: "new",
      createdAt: today(),
      createdAtIso: new Date().toISOString()
    };

    if (!request.subjectName || !description.trim()) return;
    onCreate(request);
  }

  return (
    <>
      <Topbar title="בקשה חדשה" subtitle="פתיחה קצרה וממוקדת של פנייה לטכנולוגיה מסייעת." />
      <section className="panel new-request-panel">
        <div className="panel-body">
          <form className="request-wizard" onSubmit={submit}>
            <div className="request-stepper" aria-label="שלבי פתיחת בקשה">
              {stepLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={`wizard-step ${index === step ? "active" : ""} ${index < step ? "done" : ""}`}
                  onClick={() => index <= step && setStep(index)}
                  disabled={index > step}
                >
                  <span>{index + 1}</span>
                  <strong>{label}</strong>
                </button>
              ))}
            </div>

            <div className="wizard-panel">
              {step === 0 && (
                <div className="wizard-step-content">
                  <div className="wizard-copy">
                    <h3>עבור מי הבקשה?</h3>
                    <p>בחרי תלמיד/ה מהרשימה, או פתחי בקשה עבור כיתה/קבוצה.</p>
                  </div>
                  <div className="field full">
                    <label>סוג הפנייה</label>
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
                    <div className="form-grid wizard-fields">
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
                        <span className="field-help">הכיתה מתמלאת אוטומטית.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="field full">
                      <label htmlFor="classSubject">שם הכיתה / הקבוצה</label>
                      <input id="classSubject" value={classSubject} onChange={(event) => setClassSubject(event.target.value)} placeholder="לדוגמה: כיתה ג׳ תקשורת או קבוצת קריאה" />
                    </div>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="wizard-step-content">
                  <div className="wizard-copy">
                    <h3>איזה סוג בקשה?</h3>
                    <p>בחרי את האפשרות שהכי קרובה למה שצריך.</p>
                  </div>
                  <div className="request-type-grid">
                    {requestTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`choice-card ${requestType === type ? "active" : ""}`}
                        onClick={() => setRequestType(type)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="wizard-step-content">
                  <div className="wizard-copy">
                    <h3>מה הצורך?</h3>
                    <p>כתבי חופשי. גם תיאור קצר מספיק כדי להתחיל טיפול.</p>
                  </div>
                  <div className="field full">
                    <label htmlFor="description">תיאור הצורך</label>
                    <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="מה הצורך? מתי זה קורה? מה יעזור לנו להבין את הבקשה?" required />
                  </div>
                  <div className="field full">
                    <label htmlFor="attempted">מה כבר נוסה?</label>
                    <textarea id="attempted" value={attempted} onChange={(event) => setAttempted(event.target.value)} placeholder="אם כבר ניסיתם פתרון, החלפתם ציוד או יש מידע נוסף - כתבו כאן." />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="wizard-step-content">
                  <div className="wizard-copy">
                    <h3>סיכום לפני שליחה</h3>
                    <p>בדקי שהפרטים נכונים לפני שהבקשה עוברת לטיפול.</p>
                  </div>
                  <div className="wizard-summary">
                    <div>
                      <span>עבור</span>
                      <strong>{subjectName || "לא נבחר"}</strong>
                    </div>
                    <div>
                      <span>כיתה</span>
                      <strong>{requestClassName || "לא הוזן"}</strong>
                    </div>
                    <div>
                      <span>סוג בקשה</span>
                      <strong>{requestType}</strong>
                    </div>
                    <div>
                      <span>מגישה</span>
                      <strong>{currentUser.name}</strong>
                    </div>
                    <div className="wide">
                      <span>תיאור הצורך</span>
                      <p>{description || "לא הוזן"}</p>
                    </div>
                    <div className="wide">
                      <span>מה כבר נוסה</span>
                      <p>{attempted || "לא הוזן מידע נוסף."}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="wizard-actions">
              {step > 0 && <button className="btn" type="button" onClick={goBack}>חזרה</button>}
              <button className="btn primary" type="submit" disabled={!canContinue}>
                {step === stepLabels.length - 1 ? "שליחת בקשה" : "המשך"}
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
  treatmentUpdates,
  currentUser,
  onSelect,
  onUpdate,
  onClose,
  onDelete,
  onAddTreatmentUpdate,
  onCloseDetails
}: {
  requests: TechRequest[];
  users: User[];
  selectedRequest?: TechRequest;
  selectedRequestStudent?: Student;
  treatmentUpdates: TreatmentUpdate[];
  currentUser: User;
  onSelect: (id: number) => void;
  onUpdate: (request: TechRequest) => void | Promise<void>;
  onClose: (request: TechRequest, shouldSendEmail: boolean) => void | Promise<void>;
  onDelete: (request: TechRequest) => void | Promise<void>;
  onAddTreatmentUpdate: (request: TechRequest, note: string) => void | Promise<void>;
  onCloseDetails: () => void;
}) {
  const [status, setStatus] = useState<RequestStatus | "all">("all");
  const [requestIdFilter, setRequestIdFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [requestTypeFilter, setRequestTypeFilter] = useState("all");
  const [requesterFilter, setRequesterFilter] = useState("all");
  const [handlerFilter, setHandlerFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [closingRequest, setClosingRequest] = useState<TechRequest | null>(null);

  const requesterOptions = useMemo(() => {
    const requesterIds = new Set(requests.map((request) => request.requesterId));
    return users.filter((user) => requesterIds.has(user.id));
  }, [requests, users]);

  const handlerOptions = useMemo(() => {
    const handlerIds = new Set(requests.map((request) => request.handlerId).filter((id): id is number => Boolean(id)));
    return users.filter((user) => user.role !== "staff" || handlerIds.has(user.id));
  }, [requests, users]);

  const activeFilterLabels = [
    status !== "all" ? `סטטוס: ${statusLabels[status]}` : "",
    requestIdFilter.trim() ? `מספר: ${requestIdFilter.trim()}` : "",
    subjectFilter.trim() ? `תלמיד/כיתה: ${subjectFilter.trim()}` : "",
    requestTypeFilter !== "all" ? `סוג: ${requestTypeFilter}` : "",
    requesterFilter !== "all" ? `מגישה: ${users.find((user) => user.id === Number(requesterFilter))?.name ?? "נבחרה"}` : "",
    handlerFilter === "unassigned" ? "מטפל/ת: טרם שובץ" : handlerFilter !== "all" ? `מטפל/ת: ${users.find((user) => user.id === Number(handlerFilter))?.name ?? "נבחרה"}` : ""
  ].filter(Boolean);

  const hasActiveFilters = activeFilterLabels.length > 0;

  function assignHandlerOnProgress(updated: TechRequest) {
    const original = requests.find((request) => request.id === updated.id);
    if (updated.status === "progress" && (!updated.handlerId || original?.status !== "progress")) {
      return { ...updated, handlerId: currentUser.id };
    }
    return updated;
  }

  function clearFilters() {
    setStatus("all");
    setRequestIdFilter("");
    setSubjectFilter("");
    setRequestTypeFilter("all");
    setRequesterFilter("all");
    setHandlerFilter("all");
  }

  const filtered = useMemo(() => {
    const idSearch = requestIdFilter.trim();
    const subjectSearch = subjectFilter.trim().toLowerCase();

    return requests.filter((request) => {
      if (status !== "all" && request.status !== status) return false;
      if (idSearch && !String(request.id).includes(idSearch.replace(/^#/, ""))) return false;
      if (subjectSearch && ![request.subjectName, request.className].join(" ").toLowerCase().includes(subjectSearch)) return false;
      if (requestTypeFilter !== "all" && request.requestType !== requestTypeFilter) return false;
      if (requesterFilter !== "all" && request.requesterId !== Number(requesterFilter)) return false;
      if (handlerFilter === "unassigned" && request.handlerId) return false;
      if (handlerFilter !== "all" && handlerFilter !== "unassigned" && request.handlerId !== Number(handlerFilter)) return false;
      return true;
    });
  }, [handlerFilter, requestIdFilter, requestTypeFilter, requesterFilter, requests, status, subjectFilter]);

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
        <Stat label="נשלחו לתיקון" value={stats.waiting} tone="waiting" active={status === "waiting"} onClick={() => setStatus("waiting")} />
        <Stat label="נסגרו" value={stats.closed} tone="closed" active={status === "closed"} onClick={() => setStatus("closed")} />
      </div>

      <div className="request-detail">
        <section className="panel">
          <div className="panel-header compact-request-header">
            <div>
              <h3>{status === "all" ? "כל הבקשות" : `בקשות בסטטוס ${statusLabels[status]}`}</h3>
              {hasActiveFilters && (
                <div className="active-filter-chips" aria-label="סינונים פעילים">
                  {activeFilterLabels.slice(0, 3).map((label) => <span key={label}>{label}</span>)}
                  {activeFilterLabels.length > 3 && <span>+{activeFilterLabels.length - 3}</span>}
                </div>
              )}
            </div>
            <div className="panel-header-actions">
              <span>{filtered.length} מתוך {requests.length} בקשות</span>
              <button className="btn" type="button" onClick={() => setFiltersOpen((open) => !open)}>
                {filtersOpen ? "סגירת סינון" : hasActiveFilters ? `סינון (${activeFilterLabels.length})` : "סינון"}
              </button>
              {hasActiveFilters && <button className="btn" type="button" onClick={clearFilters}>ניקוי</button>}
            </div>
          </div>
          {filtersOpen && (
            <div className="panel-body compact-panel-body filter-panel-body">
              <div className="request-filter-bar" aria-label="סינון בקשות">
                <div className="field compact-field tiny-field">
                  <label htmlFor="requestIdFilter">מספר</label>
                  <input id="requestIdFilter" value={requestIdFilter} onChange={(event) => setRequestIdFilter(event.target.value)} placeholder="#103" inputMode="numeric" />
                </div>
                <div className="field compact-field subject-field">
                  <label htmlFor="requestSubjectFilter">תלמיד/כיתה</label>
                  <input id="requestSubjectFilter" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} placeholder="שם או כיתה" />
                </div>
                <div className="field compact-field">
                  <label htmlFor="requestStatusFilter">סטטוס</label>
                  <select id="requestStatusFilter" value={status} onChange={(event) => setStatus(event.target.value as RequestStatus | "all")}>
                    <option value="all">כל הסטטוסים</option>
                    <option value="new">חדשה</option>
                    <option value="progress">בטיפול</option>
                    <option value="waiting">נשלח לתיקון</option>
                    <option value="closed">נסגרה</option>
                  </select>
                </div>
                <div className="field compact-field">
                  <label htmlFor="requestTypeFilter">סוג בקשה</label>
                  <select id="requestTypeFilter" value={requestTypeFilter} onChange={(event) => setRequestTypeFilter(event.target.value)}>
                    <option value="all">כל הסוגים</option>
                    {requestTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="field compact-field">
                  <label htmlFor="requesterFilter">מגישה</label>
                  <select id="requesterFilter" value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}>
                    <option value="all">כל המגישות</option>
                    {requesterOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                </div>
                <div className="field compact-field">
                  <label htmlFor="handlerFilter">מטפל/ת</label>
                  <select id="handlerFilter" value={handlerFilter} onChange={(event) => setHandlerFilter(event.target.value)}>
                    <option value="all">כל המטפלות</option>
                    <option value="unassigned">טרם שובץ</option>
                    {handlerOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
          <div className="panel-body">
            <RequestCards
              requests={filtered}
              users={users}
              treatmentUpdates={treatmentUpdates}
              selectedId={selectedRequest?.id ?? null}
              onOpen={onSelect}
              onCloseDetails={onCloseDetails}
              renderSelected={(request) => (
                <RequestDetails
                  request={request}
                  requester={users.find((user) => user.id === request.requesterId)}
                  handler={users.find((user) => user.id === request.handlerId)}
                  student={request.id === selectedRequest?.id ? selectedRequestStudent : undefined}
                  onUpdate={(updated) => onUpdate(assignHandlerOnProgress(updated))}
                  onClose={setClosingRequest}
                  onDelete={onDelete}
                  canDelete={currentUser.role === "admin"}
                  treatmentUpdates={request.id === selectedRequest?.id ? treatmentUpdates.filter((update) => update.requestId === request.id) : []}
                  treatmentAuthors={users}
                  currentUser={currentUser}
                  onAddTreatmentUpdate={onAddTreatmentUpdate}
                />
              )}
            />
          </div>
        </section>
      </div>

      {closingRequest && (
        <CloseRequestModal
          request={closingRequest}
          onCancel={() => setClosingRequest(null)}
          onClose={(updated, shouldSendEmail) => {
            setClosingRequest(null);
            onClose(updated, shouldSendEmail);
          }}
        />
      )}
    </>
  );
}

function RequestCards({
  requests,
  users,
  treatmentUpdates,
  selectedId,
  onOpen,
  onCloseDetails,
  renderSelected
}: {
  requests: TechRequest[];
  users: User[];
  treatmentUpdates?: TreatmentUpdate[];
  selectedId: number | null;
  onOpen: (id: number) => void;
  onCloseDetails?: () => void;
  renderSelected?: (request: TechRequest) => ReactNode;
}) {
  if (!requests.length) {
    return <div className="empty">אין בקשות שתואמות לחיפוש כרגע.</div>;
  }

  return (
    <div className="request-card-list">
      {requests.map((request) => {
        const requester = users.find((user) => user.id === request.requesterId);
        const handler = users.find((user) => user.id === request.handlerId);
        const latestUpdate = [...(treatmentUpdates ?? [])].reverse().find((update) => update.requestId === request.id);
        const latestUpdateAuthor = latestUpdate ? users.find((user) => user.id === latestUpdate.authorId) : undefined;
        const isSelected = selectedId === request.id;
        return (
          <div key={request.id} className="request-card-block">
            <button
              type="button"
              className={`request-card ${isSelected ? "selected" : ""}`}
              onClick={() => onOpen(request.id)}
            >
              <span className="request-card-topline">
                <span className="request-id">#{request.id}</span>
                <StatusPill status={request.status} />
              </span>
              <span className="request-card-main">
                <strong>{request.subjectName}</strong>
                <span className="class-badge">{request.className}</span>
              </span>
              <span className="request-card-tags">
                <span>{request.requestType}</span>
                <span>מגישה: {requester?.name ?? "לא ידוע"}</span>
                <span>מטפל: {handler?.name ?? "טרם שובץ"}</span>
              </span>
              <span className="request-card-desc">{request.description}</span>
              {latestUpdate && (
                <span className="request-card-latest-update">
                  <strong>עדכון אחרון:</strong>
                  <span>{latestUpdate.note}</span>
                  <em>{latestUpdateAuthor?.name ?? "לא ידוע"} · {latestUpdate.createdAt}</em>
                </span>
              )}
              {request.attempted && <span className="request-card-attempted">נוסה: {request.attempted}</span>}
              <span className="request-card-footer">
                <span>נפתחה: {request.createdAt}</span>
                <span className="request-card-action">פתיחת פרטים</span>
              </span>
            </button>
            {isSelected && renderSelected && (
              <div className="request-open-details">
                <button className="detail-close-button" type="button" onClick={onCloseDetails} aria-label="סגירת פרטי הבקשה">
                  <span aria-hidden="true">×</span>
                  סגירת פרטים
                </button>
                {renderSelected(request)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RequestDetails({
  request,
  requester,
  handler,
  student,
  onUpdate,
  onClose,
  onDelete,
  canDelete = false,
  treatmentUpdates = [],
  treatmentAuthors = [],
  currentUser,
  onAddTreatmentUpdate
}: {
  request?: TechRequest;
  requester?: User;
  handler?: User;
  student?: Student;
  onUpdate: (request: TechRequest) => void | Promise<void>;
  onClose: (request: TechRequest) => void | Promise<void>;
  onDelete?: (request: TechRequest) => void | Promise<void>;
  canDelete?: boolean;
  treatmentUpdates?: TreatmentUpdate[];
  treatmentAuthors?: User[];
  currentUser: User;
  onAddTreatmentUpdate: (request: TechRequest, note: string) => void | Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [treatmentNote, setTreatmentNote] = useState("");

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
          <span>מטפל</span>
          <strong>{handler?.name ?? "טרם שובץ"}</strong>
          {handler?.email && <p>{handler.email}</p>}
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
        <div className="treatment-log">
          <div className="treatment-log-header">
            <h4>יומן טיפול</h4>
            <span>{treatmentUpdates.length} עדכונים</span>
          </div>
          <div className="treatment-log-form">
            <div className="field full">
              <label htmlFor={`treatment-${request.id}`}>עדכון חדש ביומן</label>
              <textarea
                id={`treatment-${request.id}`}
                value={treatmentNote}
                onChange={(event) => setTreatmentNote(event.target.value)}
                placeholder="מה נעשה? עם מי דיברנו? מה השלב הבא?"
              />
            </div>
            <button
              className="btn primary"
              type="button"
              disabled={!treatmentNote.trim()}
              onClick={async () => {
                await onAddTreatmentUpdate(request, treatmentNote);
                setTreatmentNote("");
              }}
            >
              הוספת עדכון
            </button>
          </div>
          <div className="treatment-log-list">
            {treatmentUpdates.length ? (
              treatmentUpdates.map((update) => {
                const author = treatmentAuthors.find((user) => user.id === update.authorId);
                return (
                  <article className="treatment-log-entry" key={update.id}>
                    <div>
                      <strong>{author?.name ?? currentUser.name}</strong>
                      <span>{update.createdAt}</span>
                    </div>
                    <p>{update.note}</p>
                  </article>
                );
              })
            ) : (
              <div className="empty compact">אין עדיין עדכונים ביומן הטיפול.</div>
            )}
          </div>
        </div>
        <div className="field">
          <label htmlFor="status">סטטוס</label>
          <select id="status" value={request.status} onChange={(event) => onUpdate({ ...request, status: event.target.value as RequestStatus })}>
            <option value="new">חדשה</option>
            <option value="progress">בטיפול</option>
            <option value="waiting">נשלח לתיקון</option>
            <option value="closed">נסגרה</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="note">תקציר פנימי אחרון</label>
          <textarea id="note" value={note || request.internalNote || ""} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="button-row">
          <button className="btn" onClick={() => onUpdate({ ...request, internalNote: note || request.internalNote })}>
            שמירת הערה
          </button>
          <button className="btn primary" onClick={() => onClose(request)}>
            סגירת בקשה
          </button>
          {canDelete && onDelete && (
            <button className="btn danger" type="button" onClick={() => onDelete(request)}>
              מחיקת בקשה
            </button>
          )}
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
  onClose: (request: TechRequest, shouldSendEmail: boolean) => void | Promise<void>;
}) {
  const [internalNote, setInternalNote] = useState(request.internalNote ?? "");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const canSubmit = !sendEmail || message.trim().length > 0;

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
              {sendEmail && !message.trim() && <p className="inline-hint warning">כדי לשלוח מייל צריך למלא הודעה למגישה.</p>}
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
                disabled={!canSubmit}
                onClick={() =>
                  onClose({
                    ...request,
                    status: "closed",
                    internalNote,
                    closingMessage: sendEmail ? message.trim() : ""
                  }, sendEmail)
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
  onUpdate,
  onDelete
}: {
  users: User[];
  currentUserId: number;
  onInvite: (user: User, initialPassword: string) => void | Promise<void>;
  onUpdate: (user: User) => void | Promise<void>;
  onDelete: (user: User) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [classNamesText, setClassNamesText] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role>("staff");
  const [editClassNamesText, setEditClassNamesText] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [activityFilter, setActivityFilter] = useState<"all" | "active" | "inactive">("all");

  const editingUser = editingUserId ? users.find((user) => user.id === editingUserId) : null;

  const userCounts = useMemo(() => {
    return users.reduce(
      (counts, user) => {
        counts.total += 1;
        counts[user.role] += 1;
        if (user.active) counts.active += 1;
        return counts;
      },
      { total: 0, active: 0, staff: 0, handler: 0, admin: 0 }
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (activityFilter === "active" && !user.active) return false;
      if (activityFilter === "inactive" && user.active) return false;
      if (!normalizedSearch) return true;

      return [user.name, user.email, roleLabels[user.role], formatClassList(user.classNames)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [activityFilter, roleFilter, userSearch, users]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || initialPassword.length < 6) return;
    await onInvite({
      id: Date.now(),
      name: name.trim(),
      email: email.trim(),
      role,
      classNames: role === "staff" ? parseClassList(classNamesText) : undefined,
      active: true
    }, initialPassword);
    setName("");
    setEmail("");
    setRole("staff");
    setClassNamesText("");
    setInitialPassword("");
    setInviteModalOpen(false);
  }

  function openEditModal(user: User) {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditClassNamesText(formatClassList(user.classNames));
    setEditActive(user.active);
  }

  function closeEditModal() {
    setEditingUserId(null);
    setEditName("");
    setEditEmail("");
    setEditRole("staff");
    setEditClassNamesText("");
    setEditActive(true);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser || !editName.trim() || !editEmail.trim()) return;
    if (editingUser.id === currentUserId && !editActive) return;

    await onUpdate({
      ...editingUser,
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
      classNames: editRole === "staff" ? parseClassList(editClassNamesText) : undefined,
      active: editActive
    });
    closeEditModal();
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
      <Topbar
        title="ניהול משתמשים"
        subtitle="לאדמין בלבד: הוספת צוות, הגדרת סיסמה ראשונית ושינוי תפקידים."
        action={<button className="btn primary" type="button" onClick={() => setInviteModalOpen(true)}>הוספת משתמשת</button>}
      />

      <section className="users-summary-grid" aria-label="תקציר משתמשים">
        <div className="user-summary-card">
          <strong>{userCounts.total}</strong>
          <span>משתמשות במערכת</span>
        </div>
        <div className="user-summary-card">
          <strong>{userCounts.active}</strong>
          <span>פעילות</span>
        </div>
        <div className="user-summary-card">
          <strong>{userCounts.staff}</strong>
          <span>צוות</span>
        </div>
        <div className="user-summary-card">
          <strong>{userCounts.handler + userCounts.admin}</strong>
          <span>ניהול וטיפול</span>
        </div>
      </section>

      <section className="panel users-admin-panel">
        <div className="panel-header">
          <h3>משתמשים קיימים</h3>
          <span className="panel-count">{filteredUsers.length} מתוך {users.length}</span>
        </div>
        <div className="panel-body">
          <div className="users-toolbar">
            <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="חיפוש לפי שם, מייל, תפקיד או כיתה" />
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as Role | "all")} aria-label="סינון לפי תפקיד">
              <option value="all">כל התפקידים</option>
              <option value="staff">צוות</option>
              <option value="handler">מטפל/ת בבקשות</option>
              <option value="admin">אדמין</option>
            </select>
            <div className="segmented compact-segmented users-activity-filter" aria-label="סינון לפי סטטוס">
              <button type="button" className={`segment ${activityFilter === "all" ? "active" : ""}`} onClick={() => setActivityFilter("all")}>הכל</button>
              <button type="button" className={`segment ${activityFilter === "active" ? "active" : ""}`} onClick={() => setActivityFilter("active")}>פעילות</button>
              <button type="button" className={`segment ${activityFilter === "inactive" ? "active" : ""}`} onClick={() => setActivityFilter("inactive")}>מושבתות</button>
            </div>
          </div>
        </div>
        <div className="table-wrap user-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>משתמשת</th>
                <th>תפקיד</th>
                <th>כיתות משויכות</th>
                <th>סטטוס</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={!user.active ? "inactive-row" : undefined}>
                  <td data-label="משתמשת">
                    <div className="user-cell">
                      <span className="user-avatar" aria-hidden="true">{user.name.trim().charAt(0) || "מ"}</span>
                      <div>
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="תפקיד">
                    <span className={`role-pill role-${user.role}`}>{roleLabels[user.role]}</span>
                  </td>
                  <td data-label="כיתות משויכות">
                    {user.role === "staff" && user.classNames?.length ? (
                      <div className="user-class-list">
                        {user.classNames.map((className) => <span className="class-badge" key={className}>{className}</span>)}
                      </div>
                    ) : (
                      <span className="muted-cell">לא נדרש</span>
                    )}
                  </td>
                  <td data-label="סטטוס">
                    <span className={`user-status ${user.active ? "active" : "inactive"}`}>
                      <span className={`student-status-dot ${user.active ? "active" : "inactive"}`} />
                      {user.active ? "פעילה" : "מושבתת"}
                    </span>
                  </td>
                  <td data-label="פעולות">
                    <div className="user-actions">
                      {user.id === currentUserId && <span className="current-user-chip">המשתמשת הנוכחית</span>}
                      <button className="btn" type="button" onClick={() => openEditModal(user)}>
                        עריכה
                      </button>
                      <button className="btn danger" type="button" onClick={() => confirmDelete(user)} disabled={user.id === currentUserId}>
                        {user.active ? "השבתה / מחיקה" : "מחיקה"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && <div className="empty compact">לא נמצאו משתמשות שמתאימות לסינון הנוכחי.</div>}
        </div>
      </section>

      {inviteModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="הוספת משתמשת">
          <section className="modal user-form-modal">
            <div className="panel-header">
              <h3>הוספת משתמשת</h3>
              <button className="btn" type="button" onClick={() => setInviteModalOpen(false)}>סגירה</button>
            </div>
            <form className="panel-body form-grid" onSubmit={submit}>
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
          </section>
        </div>
      )}

      {editingUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`עריכת ${editingUser.name}`}>
          <section className="modal user-form-modal">
            <div className="panel-header">
              <h3>עריכת משתמשת</h3>
              <button className="btn" type="button" onClick={closeEditModal}>סגירה</button>
            </div>
            <form className="panel-body form-grid" onSubmit={submitEdit}>
              <div className="field">
                <label htmlFor="editUserName">שם מלא</label>
                <input id="editUserName" value={editName} onChange={(event) => setEditName(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="editUserEmail">מייל</label>
                <input id="editUserEmail" type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="editUserRole">תפקיד</label>
                <select id="editUserRole" value={editRole} onChange={(event) => setEditRole(event.target.value as Role)}>
                  <option value="staff">צוות</option>
                  <option value="handler">מטפל/ת בבקשות</option>
                  <option value="admin">אדמין</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="editUserClasses">כיתות משויכות</label>
                <input id="editUserClasses" value={editClassNamesText} onChange={(event) => setEditClassNamesText(event.target.value)} placeholder="לדוגמה: ג׳ תקשורת, ד׳1" disabled={editRole !== "staff"} />
              </div>
              <label className="field checkbox-field full" htmlFor="editUserActive">
                <input id="editUserActive" type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} disabled={editingUser.id === currentUserId} />
                <span>משתמשת פעילה</span>
              </label>
              {editingUser.id === currentUserId && <span className="field-help full">אי אפשר להשבית את המשתמשת המחוברת כרגע.</span>}
              <div className="field full button-row">
                <button className="btn primary" type="submit">
                  שמירת שינויים
                </button>
                <button className="btn" type="button" onClick={closeEditModal}>
                  ביטול
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function StudentsAdmin({
  students,
  requests,
  onAdd,
  onUpdate,
  onDelete,
  onImport
}: {
  students: Student[];
  requests: TechRequest[];
  onAdd: (student: Student) => void | Promise<void>;
  onUpdate: (student: Student) => void | Promise<void>;
  onDelete: (student: Student) => boolean | Promise<boolean>;
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
  const [studentHistoryFilter, setStudentHistoryFilter] = useState<"all" | "repairs">("all");
  const [historyStudentId, setHistoryStudentId] = useState<number | null>(null);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const studentRequestCounts = useMemo(() => {
    const counts = new Map<number, number>();
    requests.forEach((request) => {
      if (!request.studentId) return;
      counts.set(request.studentId, (counts.get(request.studentId) ?? 0) + 1);
    });
    return counts;
  }, [requests]);

  const studentRepairCounts = useMemo(() => {
    const counts = new Map<number, number>();
    requests.forEach((request) => {
      if (!request.studentId || request.requestType !== "תקלה בציוד") return;
      counts.set(request.studentId, (counts.get(request.studentId) ?? 0) + 1);
    });
    return counts;
  }, [requests]);

  const studentsWithRepairs = useMemo(
    () => students.filter((student) => (studentRepairCounts.get(student.id) ?? 0) > 0).length,
    [studentRepairCounts, students]
  );

  const filteredStudents = useMemo(() => {
    const normalizedSearch = studentSearch.trim().toLowerCase();

    return students.filter((student) => {
      const requestCount = studentRequestCounts.get(student.id) ?? 0;
      const repairCount = studentRepairCounts.get(student.id) ?? 0;
      if (studentHistoryFilter === "repairs" && repairCount === 0) return false;
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
        requestCount,
        repairCount,
        repairCount ? "תיקון תקלה ציוד" : ""
      ].filter(Boolean).join(" ").toLowerCase();

      return !normalizedSearch || searchText.includes(normalizedSearch);
    });
  }, [studentHistoryFilter, studentRepairCounts, studentRequestCounts, studentSearch, students]);

  const historyStudent = historyStudentId ? students.find((student) => student.id === historyStudentId) : null;
  const historyRequests = useMemo(() => {
    if (!historyStudentId) return [];
    return requests
      .filter((request) => request.studentId === historyStudentId)
      .sort((first, second) => second.id - first.id);
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
    setStudentFormOpen(true);
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

  function openNewStudent() {
    resetForm();
    setStudentFormOpen(true);
  }

  function closeStudentForm() {
    setStudentFormOpen(false);
    resetForm();
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
    closeStudentForm();
  }

  function downloadStudentTemplate() {
    const blob = new Blob([studentTemplateCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mashi-students-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importStudentsFromText(text: string) {
    const parsed = parseStudentImportRows(text);
    if (!parsed.length) return;
    onImport(parsed);
    setBulk("");
    setImportOpen(false);
  }

  function importStudents() {
    importStudentsFromText(bulk);
  }

  function uploadStudentImportFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importStudentsFromText(String(reader.result ?? ""));
    reader.readAsText(file, "utf-8");
  }

  async function confirmDeleteStudent(student: Student) {
    const requestCount = studentRequestCounts.get(student.id) ?? 0;
    const message = requestCount
      ? `להשבית את ${student.fullName}? יש לתלמיד/ה ${requestCount} פניות, ולכן נשמור את ההיסטוריה ולא נמחק לגמרי.`
      : `למחוק את ${student.fullName} מהרשימה?`;

    if (!window.confirm(message)) return;
    const didDelete = await onDelete(student);
    if (!didDelete) return;
    setHistoryStudentId(null);
    if (editingStudentId === student.id) {
      closeStudentForm();
    }
  }

  return (
    <>
      <Topbar
        title="ניהול תלמידים"
        subtitle="חיפוש מהיר, תיק תלמיד והיסטוריית פניות במקום אחד."
        action={(
          <>
            <button className="btn" type="button" onClick={() => setImportOpen(true)}>יבוא מטבלה</button>
            <button className="btn primary" type="button" onClick={openNewStudent}>הוספת תלמיד/ה</button>
          </>
        )}
      />

      <section className="panel students-directory-panel">
        <div className="panel-header">
          <h3>תלמידים</h3>
        </div>
        <div className="panel-body compact-panel-body">
          <div className="student-search-tools">
            <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="חיפוש לפי שם, כיתה, מכשיר, גורם מטפל או מספר תיקונים" />
            <div className="segmented compact-segmented" aria-label="סינון תלמידים לפי היסטוריית תיקונים">
              <button type="button" className={`segment ${studentHistoryFilter === "all" ? "active" : ""}`} onClick={() => setStudentHistoryFilter("all")}>
                כל התלמידים
              </button>
              <button type="button" className={`segment ${studentHistoryFilter === "repairs" ? "active" : ""}`} onClick={() => setStudentHistoryFilter("repairs")}>
                עם תיקונים
              </button>
            </div>
            <div className="student-search-summary">
              <strong>{filteredStudents.length}</strong>
              <span>מתוך {students.length} תלמידים · {studentsWithRepairs} עם תיקונים</span>
            </div>
          </div>
        </div>
        <div className="student-card-grid">
          {filteredStudents.length ? (
            filteredStudents.map((student) => {
              const requestCount = studentRequestCounts.get(student.id) ?? 0;
              const repairCount = studentRepairCounts.get(student.id) ?? 0;
              return (
                <button className="student-card" type="button" key={student.id} onClick={() => setHistoryStudentId(student.id)}>
                  <span className="student-card-topline">
                    <span className={`student-status-dot ${student.active ? "active" : "inactive"}`} />
                    <span>{student.active ? "פעיל/ה" : "מושבת/ת"}</span>
                  </span>
                  <strong>{student.fullName}</strong>
                  <span className="class-badge">{student.className}</span>
                  <span className="student-card-device">{student.deviceType || "לא הוזן מכשיר"}</span>
                  <span className="student-card-stats">
                    <span>{requestCount} פניות</span>
                    <span className={repairCount ? "repair" : ""}>{repairCount} תיקונים</span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="empty soft-empty">אין תלמידים שתואמים לחיפוש כרגע.</div>
          )}
        </div>
      </section>

      {studentFormOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editingStudent ? "עריכת תלמיד" : "הוספת תלמיד"}>
          <section className="modal student-form-modal">
            <div className="panel-header">
              <h3>{editingStudent ? "עריכת תלמיד/ה" : "הוספת תלמיד/ה"}</h3>
              <button className="btn" type="button" onClick={closeStudentForm}>סגירה</button>
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
                <div className="field full button-row">
                  <button className="btn" type="button" onClick={closeStudentForm}>ביטול</button>
                  <button className="btn primary" type="submit">שמירה</button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}

      {importOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="יבוא תלמידים מטבלה">
          <section className="modal student-import-modal">
            <div className="panel-header">
              <h3>יבוא תלמידים מטבלה</h3>
              <button className="btn" type="button" onClick={() => setImportOpen(false)}>סגירה</button>
            </div>
            <div className="panel-body">
              <div className="import-template-box">
                <div>
                  <strong>תבנית תלמידים למילוי</strong>
                  <p>הקובץ נפתח באקסל או Google Sheets וכולל את כל השדות שהמערכת יכולה לקלוט.</p>
                </div>
                <button className="btn" type="button" onClick={downloadStudentTemplate}>הורדת תבנית</button>
              </div>
              <div className="field">
                <label htmlFor="studentImportFile">העלאת קובץ לפי התבנית</label>
                <input
                  id="studentImportFile"
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={(event) => uploadStudentImportFile(event.target.files?.[0])}
                />
                <span className="field-help">אפשר לשמור מאקסל כ-CSV ולהעלות כאן.</span>
              </div>
              <div className="field">
                <label htmlFor="bulk">או הדבקת שורות מאקסל</label>
                <textarea id="bulk" value={bulk} onChange={(event) => setBulk(event.target.value)} placeholder={studentImportHeaders.join("\t")} />
              </div>
              <div className="button-row" style={{ marginTop: 12 }}>
                <button className="btn" type="button" onClick={() => setImportOpen(false)}>ביטול</button>
                <button className="btn primary" type="button" onClick={importStudents}>יבוא תלמידים</button>
              </div>
            </div>
          </section>
        </div>
      )}

      {historyStudent && (
        <div className="modal-backdrop student-record-backdrop" role="dialog" aria-modal="true" aria-label={`תיק תלמיד ${historyStudent.fullName}`}>
          <div className="student-record-modal">
            <StudentRecordPanel
              student={historyStudent}
              requests={historyRequests}
              onClose={() => setHistoryStudentId(null)}
              onEdit={() => {
                setHistoryStudentId(null);
                loadStudent(historyStudent);
              }}
              onDelete={() => confirmDeleteStudent(historyStudent)}
            />
          </div>
        </div>
      )}
    </>
  );
}

function StudentRecordPanel({
  student,
  requests,
  onClose,
  onEdit,
  onDelete
}: {
  student: Student;
  requests: TechRequest[];
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const stats = {
    total: requests.length,
    repairs: requests.filter((request) => request.requestType === "תקלה בציוד").length,
    open: requests.filter((request) => request.status !== "closed").length,
    progress: requests.filter((request) => request.status === "progress").length,
    waiting: requests.filter((request) => request.status === "waiting").length,
    closed: requests.filter((request) => request.status === "closed").length
  };
  const latestRequest = requests[0];

  return (
    <section className="panel student-record-panel">
      <div className="student-record-hero">
        <div>
          <span className="section-kicker">תיק תלמיד</span>
          <h3>{student.fullName}</h3>
          <p>{student.className} · {student.active ? "פעיל/ה" : "מושבת/ת"}</p>
        </div>
        <div className="button-row">
          {onEdit && <button className="btn" type="button" onClick={onEdit}>עריכה</button>}
          <button className="btn" type="button" onClick={onClose}>סגירה</button>
        </div>
      </div>
      <div className="panel-body student-record-body">
        <div className="student-record-stats" aria-label="תקציר פניות תלמיד">
          <div>
            <strong>{stats.total}</strong>
            <span>סה״כ פניות</span>
          </div>
          <div>
            <strong>{stats.repairs}</strong>
            <span>תיקונים</span>
          </div>
          <div>
            <strong>{stats.open}</strong>
            <span>פתוחות</span>
          </div>
          <div>
            <strong>{stats.progress}</strong>
            <span>בטיפול</span>
          </div>
          <div>
            <strong>{stats.waiting}</strong>
            <span>נשלחו לתיקון</span>
          </div>
          <div>
            <strong>{stats.closed}</strong>
            <span>נסגרו</span>
          </div>
        </div>

        <div className="student-record-grid">
          <section className="student-record-section">
            <h4>מכשיר והנגשה</h4>
            <dl className="record-fields">
              <div><dt>סוג מכשיר</dt><dd>{student.deviceType || "לא הוזן"}</dd></div>
              <div><dt>גורם מטפל</dt><dd>{student.careProvider || "לא הוזן"}</dd></div>
              <div><dt>תאריך הנגשה</dt><dd>{student.accessibilityDate || "לא הוזן"}</dd></div>
              <div><dt>עזרים נלווים</dt><dd>{student.accessories || "לא הוזן"}</dd></div>
              {isAppleDevice(student.deviceType) && (
                <>
                  <div><dt>אפל איידי</dt><dd>{student.appleId || "לא הוזן"}</dd></div>
                  <div><dt>סיסמה</dt><dd>{student.applePassword || "לא הוזן"}</dd></div>
                </>
              )}
            </dl>
          </section>

          <section className="student-record-section">
            <h4>אחריות מכשיר</h4>
            <dl className="record-fields">
              <div><dt>גורם אחריות</dt><dd>{student.deviceResponsibility || "לא הוזן"}</dd></div>
              <div><dt>טלפון</dt><dd>{student.deviceResponsibilityPhone || "לא הוזן"}</dd></div>
              <div><dt>אימייל</dt><dd>{student.deviceResponsibilityEmail || "לא הוזן"}</dd></div>
              <div><dt>פנייה אחרונה</dt><dd>{latestRequest ? `#${latestRequest.id} · ${statusLabels[latestRequest.status]}` : "אין עדיין"}</dd></div>
            </dl>
          </section>
        </div>

        <section className="student-record-section full">
          <div className="student-history-title">
            <h4>היסטוריית פניות</h4>
            {latestRequest && <span>האחרונה: #{latestRequest.id} · {latestRequest.createdAt}</span>}
          </div>
          {requests.length ? (
            <div className="student-history-list">
              {requests.map((request) => (
                <article key={request.id} className={`student-history-card status-${request.status}`}>
                  <div className="request-card-topline">
                    <span>#{request.id} · {request.createdAt}</span>
                    <StatusPill status={request.status} />
                  </div>
                  <strong>{request.requestType}</strong>
                  <span className="request-card-meta">{request.className}</span>
                  <p>{request.description}</p>
                  {request.attempted && <p><b>מה נוסה:</b> {request.attempted}</p>}
                  {request.internalNote && <p><b>הערה פנימית:</b> {request.internalNote}</p>}
                  {request.closingMessage && <p><b>הודעת סגירה:</b> {request.closingMessage}</p>}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">אין פניות מתועדות לתלמיד/ה הזה כרגע.</div>
          )}
        </section>

        {onDelete && (
          <section className="student-record-danger-zone">
            <div>
              <strong>{requests.length ? "השבתת תלמיד/ה" : "מחיקת תלמיד/ה"}</strong>
              <p>{requests.length ? "יש לתלמיד/ה פניות היסטוריות, לכן הפעולה תשבית את הרשומה ותשמור את התיעוד." : "אין לתלמיד/ה פניות היסטוריות, לכן אפשר למחוק את הרשומה מהרשימה."}</p>
            </div>
            <button className="btn danger subtle" type="button" onClick={onDelete}>{requests.length ? "השבתה" : "מחיקה"}</button>
          </section>
        )}
      </div>
    </section>
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
