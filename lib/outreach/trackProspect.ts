import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

// Records a step of the outreach funnel against the prospect the email was sent to
// (OUTREACH_FUNNEL_SCHEMA.sql). Server-only. Never throws: tracking must not be able
// to break the landing page or a partner's signup.
export type FunnelEvent = "landing" | "signup_started" | "signed_up";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isProspectRef(ref: unknown): ref is string {
  return typeof ref === "string" && UUID.test(ref);
}

export async function trackProspect(ref: unknown, event: FunnelEvent, userId?: string | null): Promise<boolean> {
  if (!isProspectRef(ref)) return false;
  try {
    const db = createServiceRoleSupabaseClient();
    const { data, error } = await db.rpc("outreach_track", { p_id: ref, p_event: event, p_user: userId ?? null });
    if (error) { console.warn(`outreach track ${event} failed:`, error.message); return false; }
    return data === true;
  } catch (e: any) {
    console.warn(`outreach track ${event} failed:`, e?.message);
    return false;
  }
}
