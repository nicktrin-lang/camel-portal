import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";

type Role = "admin" | "super_admin";

function isRole(value: any): value is Role {
  return value === "admin" || value === "super_admin";
}

async function getCurrentUserEmail() {
  const supabase = await createRouteHandlerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  return {
    email: (data?.user?.email || "").toLowerCase().trim(),
    error,
  };
}

async function requireSuperAdmin() {
  const { email, error } = await getCurrentUserEmail();

  if (error || !email) {
    return { ok: false as const, status: 401, email: "" };
  }

  const db = createServiceRoleSupabaseClient();

  const { data: adminRow, error: adminErr } = await db
    .from("admin_users")
    .select("role")
    .eq("email", email)
    .maybeSingle();

  if (adminErr) {
    return { ok: false as const, status: 400, email };
  }

  if (adminRow?.role !== "super_admin") {
    return { ok: false as const, status: 403, email };
  }

  return { ok: true as const, status: 200, email, db };
}

export async function GET() {
  try {
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireSuperAdmin();

    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Not signed in" : "Not authorized" },
        { status: gate.status }
      );
    }

    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").toLowerCase().trim();
    const role = String(body?.role || "admin");

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    if (!isRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { db } = gate;

    const { data, error } = await db
      .from("admin_users")
      .upsert({ email, role }, { onConflict: "email" })
      .select("id,email,role,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireSuperAdmin();

    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Not signed in" : "Not authorized" },
        { status: gate.status }
      );
    }

    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").toLowerCase().trim();
    const role = String(body?.role || "").trim();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    if (!isRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { db, email: currentUserEmail } = gate;

    if (email === currentUserEmail && role !== "super_admin") {
      return NextResponse.json(
        { error: "You cannot remove your own super_admin role." },
        { status: 400 }
      );
    }

    const { data, error } = await db
      .from("admin_users")
      .update({ role })
      .eq("email", email)
      .select("id,email,role,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const gate = await requireSuperAdmin();

    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Not signed in" : "Not authorized" },
        { status: gate.status }
      );
    }

    const body = await req.json().catch(() => null);
    const email = String(body?.email || "").toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const { db, email: currentUserEmail } = gate;

    if (email === currentUserEmail) {
      return NextResponse.json(
        { error: "You cannot delete your own admin record." },
        { status: 400 }
      );
    }

    const { error } = await db.from("admin_users").delete().eq("email", email);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}