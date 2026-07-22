import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
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

  const { error } = await supabase
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (error) {
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
