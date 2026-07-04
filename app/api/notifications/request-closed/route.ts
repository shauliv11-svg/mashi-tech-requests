import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function requireHandlerOrAdmin(request: NextRequest, adminClient: NonNullable<ReturnType<typeof getAdminClient>>) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return { error: "missing_token", status: 401 as const };
  }

  const { data: authUser, error: authError } = await adminClient.auth.getUser(token);
  const email = authUser.user?.email ? normalizeEmail(authUser.user.email) : "";

  if (authError || !email) {
    return { error: "invalid_token", status: 401 as const };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("app_users")
    .select("id, name, email, role, active")
    .eq("email", email)
    .eq("active", true)
    .single();

  if (profileError || !profile || !["handler", "admin"].includes(profile.role)) {
    return { error: "handler_or_admin_required", status: 403 as const };
  }

  return { profile };
}

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const secure = (process.env.SMTP_SECURE ?? "true") === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;
  const replyTo = process.env.EMAIL_REPLY_TO || undefined;

  if (!host || !Number.isFinite(port) || !user || !pass || !from) {
    return null;
  }

  return { host, port, secure, user, pass, from, replyTo };
}

function getSmtpErrorDetails(error: unknown) {
  const smtpError = error as { code?: unknown; command?: unknown; responseCode?: unknown };
  return {
    code: typeof smtpError.code === "string" ? smtpError.code : undefined,
    command: typeof smtpError.command === "string" ? smtpError.command : undefined,
    responseCode: typeof smtpError.responseCode === "number" ? smtpError.responseCode : undefined
  };
}

function getSmtpFailureReason(error: unknown) {
  const details = getSmtpErrorDetails(error);

  if (details.code === "EAUTH" || details.responseCode === 535 || details.responseCode === 534) {
    return "auth";
  }

  if (details.command === "RCPT TO" || details.responseCode === 550 || details.responseCode === 553) {
    return "recipient";
  }

  if (["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS"].includes(details.code ?? "")) {
    return "connection";
  }

  return "unknown";
}

export async function POST(request: NextRequest) {
  const adminClient = getAdminClient();
  const mailConfig = getMailConfig();

  if (!adminClient) {
    return NextResponse.json({ error: "missing_service_role_key" }, { status: 500 });
  }

  if (!mailConfig) {
    return NextResponse.json({ error: "missing_email_config" }, { status: 500 });
  }

  const authCheck = await requireHandlerOrAdmin(request, adminClient);
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const body = await request.json().catch(() => null);
  const requestId = Number(body?.requestId);

  if (!Number.isFinite(requestId)) {
    return NextResponse.json({ error: "invalid_request_id" }, { status: 400 });
  }

  const { data: techRequest, error: requestError } = await adminClient
    .from("tech_requests")
    .select("id, requester_id, subject_name, class_name, request_type, description, attempted, status, closing_message")
    .eq("id", requestId)
    .single();

  if (requestError || !techRequest) {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }

  if (techRequest.status !== "closed") {
    return NextResponse.json({ error: "request_not_closed" }, { status: 400 });
  }

  const closingMessage = String(techRequest.closing_message ?? "").trim();
  if (!closingMessage) {
    return NextResponse.json({ error: "missing_closing_message" }, { status: 400 });
  }

  const { data: requester, error: requesterError } = await adminClient
    .from("app_users")
    .select("id, name, email")
    .eq("id", techRequest.requester_id)
    .single();

  if (requesterError || !requester?.email) {
    return NextResponse.json({ error: "requester_not_found" }, { status: 404 });
  }

  const subject = `בקשה #${techRequest.id} נסגרה - ${techRequest.subject_name}`;
  const safeName = escapeHtml(requester.name || "צוות יקר");
  const safeSubjectName = escapeHtml(techRequest.subject_name || "");
  const safeClassName = escapeHtml(techRequest.class_name || "");
  const safeRequestType = escapeHtml(techRequest.request_type || "");
  const safeMessage = escapeHtml(closingMessage).replaceAll("\n", "<br />");
  const safeHandler = escapeHtml(authCheck.profile.name || "צוות הטכנולוגיה");

  const text = `שלום ${requester.name || ""},\n\nהבקשה #${techRequest.id} עבור ${techRequest.subject_name} נסגרה.\n\nהודעת צוות הטכנולוגיה:\n${closingMessage}\n\nמטפל/ת: ${authCheck.profile.name || "צוות הטכנולוגיה"}\n\nמערכת בקשות טכנולוגיה מסייעת - משי`;

  const html = `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;line-height:1.7;color:#17233a;max-width:640px;margin:0 auto">
      <h2 style="color:#102aa4;margin:0 0 12px">הבקשה נסגרה</h2>
      <p>שלום ${safeName},</p>
      <p>הבקשה <strong>#${techRequest.id}</strong> נסגרה במערכת בקשות טכנולוגיה מסייעת.</p>
      <div style="border:1px solid #d9e8f3;border-radius:12px;padding:14px;margin:16px 0;background:#f5fbff">
        <p style="margin:0"><strong>עבור:</strong> ${safeSubjectName}</p>
        <p style="margin:0"><strong>כיתה:</strong> ${safeClassName}</p>
        <p style="margin:0"><strong>סוג בקשה:</strong> ${safeRequestType}</p>
      </div>
      <div style="border:1px solid #d9e8f3;border-radius:12px;padding:14px;margin:16px 0;background:#ffffff">
        <strong>הודעת צוות הטכנולוגיה:</strong>
        <p style="margin:8px 0 0">${safeMessage}</p>
      </div>
      <p style="color:#607083">מטפל/ת: ${safeHandler}</p>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    secure: mailConfig.secure,
    auth: {
      user: mailConfig.user,
      pass: mailConfig.pass
    }
  });

  try {
    await transporter.sendMail({
      from: mailConfig.from,
      to: requester.email,
      replyTo: mailConfig.replyTo,
      subject,
      text,
      html
    });
  } catch (error) {
    const reason = getSmtpFailureReason(error);
    console.error("request_closed_email_failed", { reason, ...getSmtpErrorDetails(error) });
    return NextResponse.json({ error: "email_send_failed", reason }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
