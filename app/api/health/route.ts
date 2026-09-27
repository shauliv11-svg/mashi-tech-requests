import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
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

export async function GET() {
  const checkedAt = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, database: "not_configured", checkedAt },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  let databaseError = false;
  try {
    const { error } = await supabase
      .from("app_users")
      .select("id", { head: true })
      .limit(1);
    databaseError = Boolean(error);
  } catch {
    databaseError = true;
  }

  if (databaseError) {
    return NextResponse.json(
      { ok: false, database: "error", checkedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { ok: true, database: "ok", checkedAt },
    { headers: { "Cache-Control": "no-store" } }
  );
}
