import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

type Role = "admin" | "super_admin";
function isRole(x: any): x is Role {
  return x === "admin" || x === "super_admin";
}

async function getCallerEmail() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data, error } = await authed.auth.getUser();
  const email = (data?.user?.email || "").toLowerCase().trim();
  return { email, error };
}

async function requireSuperAdmin() {
  const { email, error } = await getCallerEmail();
  if (error || !email) return { ok: false as const, status: 401, email: null };

  const db = createServiceRoleSupabaseClient();
  const { data: adminRow, error: adminErr } = await db
    .from("admin_users")
    .select("role")
    .eq("email", email)
    .maybeSingle();

  if (adminErr) return { ok: false as const, status: 400, email, msg: adminErr.message };
  if (adminRow?.role !== "super_admin") return { ok: false as const, status: 403, email };

  return { ok: true as const, email, db };
}

// GET list (super admin only)
export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Not signed in" : "Not authorized" },
      { status: gate.status }
    );
  }

  const { db } = gate;
  const { data, error } = await db
    .from("admin_users")
    .select("id,email,role,created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 200 });
}

// POST add admin (super admin only)
// body: { email, role? }
export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Not signed in" : "Not authorized" },
      { status: gate.status }
    );
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").toLowerCase().trim();
  const role = (String(body?.role || "admin") as Role);

  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  if (!isRole(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const { db } = gate;

  const { data: existing, error: exErr } = await db
    .from("admin_users")
    .select("id,email,role")
    .eq("email", email)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 });
  if (existing) return NextResponse.json({ error: "Admin already exists" }, { status: 409 });

  const { data, error } = await db
    .from("admin_users")
    .insert({ email, role })
    .select("id,email,role,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 200 });
}

// PATCH change role (super admin only)
// body: { email, role }
export async function PATCH(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Not signed in" : "Not authorized" },
      { status: gate.status }
    );
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").toLowerCase().trim();
  const role = body?.role;

  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  if (!isRole(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const { db, email: callerEmail } = gate;

  // prevent self-demotion out of super_admin (optional safety)
  if (email === callerEmail && role !== "super_admin") {
    return NextResponse.json({ error: "You cannot remove your own super_admin role." }, { status: 400 });
  }

  const { data, error } = await db
    .from("admin_users")
    .update({ role })
    .eq("email", email)
    .select("id,email,role,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 200 });
}

// DELETE remove admin (super admin only)
// body: { email }
export async function DELETE(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Not signed in" : "Not authorized" },
      { status: gate.status }
    );
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").toLowerCase().trim();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const { db, email: callerEmail } = gate;

  // prevent deleting yourself (optional safety)
  if (email === callerEmail) {
    return NextResponse.json({ error: "You cannot delete your own admin record." }, { status: 400 });
  }

  const { error } = await db.from("admin_users").delete().eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 200 });
}