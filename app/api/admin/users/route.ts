import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type Role = "staff" | "handler" | "admin";

const roles: Role[] = ["staff", "handler", "admin"];

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

async function requireAdmin(request: NextRequest, adminClient: NonNullable<ReturnType<typeof getAdminClient>>) {
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
    .select("id, email, role, active")
    .eq("email", email)
    .eq("active", true)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { error: "admin_required", status: 403 as const };
  }

  return { profile, email };
}

async function findAuthUserByEmail(adminClient: NonNullable<ReturnType<typeof getAdminClient>>, email: string) {
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw error;
  }

  return data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
}

function mapAppUser(row: any) {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    class_names: row.class_names ?? [],
    active: row.active
  };
}

export async function POST(request: NextRequest) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: "missing_service_role_key" }, { status: 500 });
  }

  const adminCheck = await requireAdmin(request, adminClient);
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = roles.includes(body?.role) ? body.role as Role : null;
  const classNames = Array.isArray(body?.classNames) ? body.classNames.filter((item: unknown) => typeof item === "string" && item.trim()).map((item: string) => item.trim()) : [];

  if (!name || !email || !role || password.length < 6) {
    return NextResponse.json({ error: "invalid_user_payload" }, { status: 400 });
  }

  const appUserPayload = {
    name,
    email,
    role,
    class_names: role === "staff" ? classNames : [],
    active: true
  };

  const { data: appUser, error: appUserError } = await adminClient
    .from("app_users")
    .upsert(appUserPayload, { onConflict: "email" })
    .select("*")
    .single();

  if (appUserError) {
    return NextResponse.json({ error: "app_user_save_failed" }, { status: 500 });
  }

  try {
    const existingAuthUser = await findAuthUserByEmail(adminClient, email);

    if (existingAuthUser) {
      const { error } = await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
        password,
        email_confirm: true,
        user_metadata: { name, role }
      });

      if (error) throw error;
    } else {
      const { error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role }
      });

      if (error) throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: "auth_user_save_failed" }, { status: 500 });
  }

  return NextResponse.json({ user: mapAppUser(appUser) });
}

export async function DELETE(request: NextRequest) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return NextResponse.json({ error: "missing_service_role_key" }, { status: 500 });
  }

  const adminCheck = await requireAdmin(request, adminClient);
  if ("error" in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";

  if (!Number.isFinite(id) || !email) {
    return NextResponse.json({ error: "invalid_delete_payload" }, { status: 400 });
  }

  if (email === adminCheck.email) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  }

  const { data: linkedRequests, error: linkedError } = await adminClient
    .from("tech_requests")
    .select("id")
    .eq("requester_id", id)
    .limit(1);

  if (linkedError) {
    return NextResponse.json({ error: "linked_request_check_failed" }, { status: 500 });
  }

  try {
    const existingAuthUser = await findAuthUserByEmail(adminClient, email);
    if (existingAuthUser) {
      const { error } = await adminClient.auth.admin.deleteUser(existingAuthUser.id);
      if (error) throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: "auth_user_delete_failed" }, { status: 500 });
  }

  if (linkedRequests?.length) {
    const { data: appUser, error } = await adminClient
      .from("app_users")
      .update({ active: false })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "app_user_disable_failed" }, { status: 500 });
    }

    return NextResponse.json({ mode: "disabled", user: mapAppUser(appUser) });
  }

  const { error } = await adminClient.from("app_users").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "app_user_delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ mode: "deleted", id });
}
