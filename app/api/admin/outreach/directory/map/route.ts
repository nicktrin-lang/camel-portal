import { NextResponse } from "next/server";
import { requireDirectoryAdmin } from "@/lib/outreach/requireDirectoryAdmin";
import { computeLiveReadiness } from "@/lib/portal/computeLiveReadiness";

// Map data for the Car Hire Directory: every directory place in one country with a
// position, plus Camel's approved partners (live or not) so coverage gaps are visible.
// Points are sent as compact tuples; Italy alone is ~8,000 places.

const PAGE = 1000;
const ISO = /^[A-Z]{2}$/;

// The map's colour key. Order matters: added beats email, email beats scan outcome.
function pointStatus(r: { prospect_id: string | null; email: string | null; scan_status: string }) {
  if (r.prospect_id) return "added";
  if (r.email) return "email";
  return r.scan_status; // none | no_website | failed | pending
}

export async function GET(req: Request) {
  try {
    const auth = await requireDirectoryAdmin();
    if ("error" in auth) return auth.error;
    const { db } = auth;

    const url = new URL(req.url);
    const country = (url.searchParams.get("country") || "").toUpperCase();
    const chains = url.searchParams.get("chains") === "1";
    if (!ISO.test(country)) return NextResponse.json({ error: "Choose a country" }, { status: 400 });

    // [id, lat, lng, status, name, town, phone, website, email, is_chain]
    const points: (string | number | boolean | null)[][] = [];
    for (let from = 0; ; from += PAGE) {
      let q = db.from("outreach_directory")
        .select("id, lat, lng, name, town, phone, website, email, scan_status, prospect_id, is_chain")
        .eq("country", country).not("lat", "is", null).not("lng", "is", null)
        .order("id").range(from, from + PAGE - 1);
      if (!chains) q = q.eq("is_chain", false);
      const { data, error } = await q;
      if (error) throw error;
      for (const r of data ?? []) {
        points.push([r.id, r.lat, r.lng, pointStatus(r), r.name, r.town, r.phone, r.website, r.email, r.is_chain]);
      }
      if (!data || data.length < PAGE) break;
    }

    // Camel's own partners: approved applications with a base location.
    const { data: apps, error: appErr } = await db.from("partner_applications")
      .select("user_id").eq("status", "approved").not("user_id", "is", null);
    if (appErr) throw appErr;
    const userIds = [...new Set((apps ?? []).map((a) => String(a.user_id)))];
    const partners: { name: string; address: string | null; lat: number; lng: number; live: boolean }[] = [];
    if (userIds.length) {
      const { data: profiles, error: profErr } = await db.from("partner_profiles")
        .select("user_id, company_name, base_address, base_lat, base_lng")
        .in("user_id", userIds).not("base_lat", "is", null).not("base_lng", "is", null);
      if (profErr) throw profErr;
      const live = await Promise.all((profiles ?? []).map((p) => computeLiveReadiness(p.user_id).then((r) => r.isLive).catch(() => false)));
      (profiles ?? []).forEach((p, i) => partners.push({
        name: p.company_name || "Partner", address: p.base_address, lat: Number(p.base_lat), lng: Number(p.base_lng), live: live[i],
      }));
    }

    return NextResponse.json({ points, partners });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
