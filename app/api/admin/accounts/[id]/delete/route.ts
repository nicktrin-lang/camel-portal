import { NextResponse } from "next/server";
import {
  createRouteHandlerSupabaseClient,
  createServiceRoleSupabaseClient,
} from "@/lib/supabase/server";
import { executePartnerDeletion, planPartnerDeletion } from "@/lib/portal/deletePartnerAccount";

// Admin "Delete account" for a partner (id = partner_applications.id). super_admin only.
// GET  → what would be deleted, and anything that blocks it (money history).
// POST → { confirm: "<partner email>" } deletes it. See lib/portal/deletePartnerAccount.ts.

async function requireSuperAdmin() {
  const authed = await createRouteHandlerSupabaseClient();
  const { data: userData, error: userErr } = await authed.auth.getUser();
  const email = (userData?.user?.email || "").toLowerCase().trim();
  if (userErr || !email) return { ok: false as const, status: 401, error: "Not signed in" };
  const db = createServiceRoleSupabaseClient();
  const { data: adminRow } = await db.from("admin_users").select("role").eq("email", email).maybeSingle();
  if (adminRow?.role !== "super_admin") return { ok: false as const, status: 403, error: "Only a super admin can delete accounts" };
  return { ok: true as const, db, email };
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const plan = await planPartnerDeletion(gate.db, id);
    if (!plan) return NextResponse.json({ error: "Partner account not found" }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const body = await req.json().catch(() => null);

    // Re-plan here rather than trusting anything from the browser.
    const plan = await planPartnerDeletion(gate.db, id);
    if (!plan) return NextResponse.json({ error: "Partner account not found" }, { status: 404 });
    if (String(body?.confirm || "").toLowerCase().trim() !== plan.email) {
      return NextResponse.json({ error: "Type the partner's email exactly to confirm" }, { status: 400 });
    }
    if (plan.blockers.length) {
      return NextResponse.json({ error: `Can't delete: this partner has ${plan.blockers.join(", ")}.` }, { status: 409 });
    }

    const result = await executePartnerDeletion(gate.db, plan);
    console.log(`admin delete-account: ${gate.email} deleted partner ${plan.email} (${plan.companyName})`, result);
    return NextResponse.json({ ok: true, ...result, stripe: plan.stripe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
