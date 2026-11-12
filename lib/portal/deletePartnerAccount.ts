import type { SupabaseClient } from "@supabase/supabase-js";

// Hard-deletes a partner account (admin "Delete account", super_admin only): the
// application, profile, fleet, drivers, bids and request matches, and the logins of the
// partner and its drivers. Built for clearing test accounts.
//
// It REFUSES when the partner has any money history (bookings, commission invoices,
// chargeback recovery): those rows are the accounting record and are never deleted here.
//
// A login is kept (only the partner data goes) when its email is an admin_users row or
// the same login is also a customer: deleting the auth user would lock that person out.
//
// Not transactional: each step is a separate delete. Every step is idempotent, so if one
// fails the preview shows what's left and running it again finishes the job.

type Db = SupabaseClient;

export type DeletePlan = {
  applicationId: string;
  userId: string | null;
  email: string;
  companyName: string;
  counts: { fleet: number; drivers: number; bids: number; matches: number; suggestions: number };
  blockers: string[];                   // non-empty = refused
  keepLogin: string | null;             // why the partner's own login is kept, if it is
  driverLogins: { id: string; email: string | null; keep: string | null }[];
  stripe: { accountId: string | null; recipientId: string | null };
};

async function count(db: Db, table: string, column: string, value: string): Promise<number> {
  const { count: n, error } = await db.from(table).select(column, { count: "exact", head: true }).eq(column, value);
  if (error) throw new Error(`Counting ${table} failed: ${error.message}`);
  return n ?? 0;
}

/** Why a login must survive, or null if it can go. */
async function loginKeepReason(db: Db, userId: string, email: string | null, partnerUserId: string): Promise<string | null> {
  const e = String(email || "").toLowerCase().trim();
  if (e) {
    const { data: admin } = await db.from("admin_users").select("role").eq("email", e).maybeSingle();
    if (admin) return `${e} is an admin (${admin.role})`;
  }
  const { data: customer } = await db.from("customer_profiles").select("id").eq("user_id", userId).maybeSingle();
  if (customer) return "this login is also a customer account";
  if (userId !== partnerUserId) {
    const { data: otherPartner } = await db.from("partner_applications").select("id").eq("user_id", userId).maybeSingle();
    if (otherPartner) return "this login is also another partner account";
  }
  return null;
}

export async function planPartnerDeletion(db: Db, applicationId: string): Promise<DeletePlan | null> {
  const { data: app, error } = await db.from("partner_applications")
    .select("id, user_id, email, company_name").eq("id", applicationId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!app) return null;

  const userId = String(app.user_id || "").trim() || null;
  const plan: DeletePlan = {
    applicationId: app.id,
    userId,
    email: String(app.email || "").toLowerCase().trim(),
    companyName: String(app.company_name || ""),
    counts: { fleet: 0, drivers: 0, bids: 0, matches: 0, suggestions: 0 },
    blockers: [],
    keepLogin: null,
    driverLogins: [],
    stripe: { accountId: null, recipientId: null },
  };
  if (!userId) return plan; // application only: nothing else can reference it

  const [bookings, invoices, recovery] = await Promise.all([
    count(db, "partner_bookings", "partner_user_id", userId),
    count(db, "commission_invoices", "partner_user_id", userId),
    count(db, "partner_recovery_ledger", "partner_user_id", userId),
  ]);
  if (bookings)  plan.blockers.push(`${bookings} booking${bookings === 1 ? "" : "s"}`);
  if (invoices)  plan.blockers.push(`${invoices} commission invoice${invoices === 1 ? "" : "s"}`);
  if (recovery)  plan.blockers.push(`${recovery} chargeback recovery entr${recovery === 1 ? "y" : "ies"}`);

  [plan.counts.fleet, plan.counts.drivers, plan.counts.bids, plan.counts.matches, plan.counts.suggestions] = await Promise.all([
    count(db, "partner_fleet", "user_id", userId),
    count(db, "partner_drivers", "partner_user_id", userId),
    count(db, "partner_bids", "partner_user_id", userId),
    count(db, "request_partner_matches", "partner_user_id", userId),
    count(db, "partner_suggestions", "partner_user_id", userId),
  ]);

  plan.keepLogin = await loginKeepReason(db, userId, plan.email, userId);

  const { data: drivers } = await db.from("partner_drivers").select("auth_user_id, email").eq("partner_user_id", userId);
  for (const d of drivers ?? []) {
    if (!d.auth_user_id) continue;
    plan.driverLogins.push({ id: d.auth_user_id, email: d.email ?? null, keep: await loginKeepReason(db, d.auth_user_id, d.email, userId) });
  }

  const { data: profile } = await db.from("partner_profiles")
    .select("stripe_account_id, stripe_recipient_id").eq("user_id", userId).maybeSingle();
  plan.stripe = { accountId: profile?.stripe_account_id ?? null, recipientId: profile?.stripe_recipient_id ?? null };
  return plan;
}

export async function executePartnerDeletion(db: Db, plan: DeletePlan): Promise<{ deletedLogins: number; keptLogins: string[] }> {
  if (plan.blockers.length) throw new Error(`Refused: this partner has ${plan.blockers.join(", ")}.`);
  const del = async (table: string, column: string, value: string) => {
    const { error } = await db.from(table).delete().eq(column, value);
    if (error) throw new Error(`Deleting from ${table} failed: ${error.message}`);
  };
  const keptLogins: string[] = [];
  let deletedLogins = 0;

  if (plan.userId) {
    const u = plan.userId;
    // Children before parents: matches and bids point at fleet rows.
    await del("request_partner_matches", "partner_user_id", u);
    await del("partner_bids", "partner_user_id", u);
    await del("partner_suggestions", "partner_user_id", u);
    await del("partner_fleet", "user_id", u);
    await del("partner_drivers", "partner_user_id", u);
    await del("partner_members", "user_id", u);
    await del("partner_profiles", "user_id", u);
    const { error: unlinkErr } = await db.from("outreach_prospects").update({ signed_up_user_id: null }).eq("signed_up_user_id", u);
    if (unlinkErr) throw new Error(`Unlinking outreach prospect failed: ${unlinkErr.message}`);
  }
  await del("partner_applications", "id", plan.applicationId);

  const logins = [
    ...(plan.userId ? [{ id: plan.userId, email: plan.email, keep: plan.keepLogin }] : []),
    ...plan.driverLogins,
  ];
  for (const l of logins) {
    if (l.keep) { keptLogins.push(`${l.email || l.id}: ${l.keep}`); continue; }
    const { error } = await db.auth.admin.deleteUser(l.id);
    // Already gone counts as done, so a re-run after a partial failure succeeds.
    if (error && !/not.?found/i.test(error.message)) throw new Error(`Deleting login ${l.email || l.id} failed: ${error.message}`);
    deletedLogins++;
  }
  return { deletedLogins, keptLogins };
}
