import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendApplicationReceivedEmail } from "@/lib/email";

const TERMS_VERSION = "2026-04";

type Body = {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  password?: string;
  // Business address
  address?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  postcode?: string;
  country?: string;
  addressLat?: number | string | null;
  addressLng?: number | string | null;
  // Fleet address
  baseAddress?: string;
  baseAddress1?: string;
  baseAddress2?: string;
  baseCity?: string;
  baseProvince?: string;
  basePostcode?: string;
  baseCountry?: string;
  baseLat?: number | string | null;
  baseLng?: number | string | null;
};

function normalizeWebsite(v: string) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function parseCoordinate(value: string | number | null | undefined, kind: "lat" | "lng"): number | null {
  if (value === null || value === undefined) return null;
  let raw = String(value).trim().toUpperCase();
  if (!raw) return null;
  let sign = 1;
  if (kind === "lat") { if (raw.includes("S")) sign = -1; raw = raw.replace(/[NS]/g, ""); }
  if (kind === "lng") { if (raw.includes("W")) sign = -1; raw = raw.replace(/[EW]/g, ""); }
  raw = raw.replace(/,/g, ".").trim();
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return sign * num;
}

async function safeDeleteApplication(db: any, userId: string) {
  try { await db.from("partner_applications").delete().eq("user_id", userId); } catch {}
}

async function safeDeleteAuthUser(db: any, userId: string) {
  try { await db.auth.admin.deleteUser(userId); } catch {}
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    const companyName = String(body?.companyName || "").trim();
    const contactName = String(body?.contactName || "").trim();
    const email       = String(body?.email || "").trim().toLowerCase();
    const phone       = String(body?.phone || "").trim();
    const website     = String(body?.website || "").trim();
    const password    = String(body?.password || "");

    // Business address
    const address1 = String(body?.address1 || "").trim();
    const address2 = String(body?.address2 || "").trim();
    const city     = String(body?.city || "").trim();
    const province = String(body?.province || "").trim();
    const postcode = String(body?.postcode || "").trim();
    const country  = String(body?.country || "").trim();

    // Fleet address
    const baseAddress1 = String(body?.baseAddress1 || "").trim();
    const baseAddress2 = String(body?.baseAddress2 || "").trim();
    const baseCity     = String(body?.baseCity || "").trim();
    const baseProvince = String(body?.baseProvince || "").trim();
    const basePostcode = String(body?.basePostcode || "").trim();
    const baseCountry  = String(body?.baseCountry || "").trim();
    const baseLat      = parseCoordinate(body?.baseLat, "lat");
    const baseLng      = parseCoordinate(body?.baseLng, "lng");

    // Build full address strings
    const fullBusinessAddress = [address1, address2, city, province, postcode, country].filter(Boolean).join(", ");
    const fullBaseAddress     = String(body?.baseAddress || "").trim() ||
      [baseAddress1, baseAddress2, baseCity, baseProvince, basePostcode, baseCountry].filter(Boolean).join(", ");

    // Validation
    if (!companyName) return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    if (!contactName) return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
    if (!email)       return NextResponse.json({ error: "Email is required." }, { status: 400 });
    if (!phone)       return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    if (!password || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (!address1)    return NextResponse.json({ error: "Business address line 1 is required." }, { status: 400 });
    if (!province)    return NextResponse.json({ error: "Province / State is required." }, { status: 400 });
    if (!postcode)    return NextResponse.json({ error: "Postcode is required." }, { status: 400 });
    if (!country)     return NextResponse.json({ error: "Country is required." }, { status: 400 });

    const db = createServiceRoleSupabaseClient();

    // Create auth user
    const { data: createdUser, error: createUserErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: contactName, company_name: companyName },
    });

    if (createUserErr) return NextResponse.json({ error: createUserErr.message }, { status: 400 });

    const userId = String(createdUser?.user?.id || "").trim();
    if (!userId) return NextResponse.json({ error: "Could not create user account." }, { status: 500 });

    // Insert application — record terms acceptance at signup
    const { error: applicationErr } = await db.from("partner_applications").insert({
      user_id:            userId,
      company_name:       companyName,
      full_name:          contactName,
      email,
      phone,
      address:            fullBusinessAddress,
      address1,
      address2:           address2 || null,
      province:           province || null,
      postcode:           postcode || null,
      country:            country || null,
      website:            normalizeWebsite(website),
      status:             "pending",
      terms_accepted_at:  new Date().toISOString(),
      terms_version:      TERMS_VERSION,
    });

    if (applicationErr) {
      await safeDeleteAuthUser(db, userId);
      return NextResponse.json({ error: applicationErr.message }, { status: 400 });
    }

    // Upsert profile with both business and fleet addresses
    const { error: profileErr } = await db.from("partner_profiles").upsert({
      user_id:           userId,
      company_name:      companyName,
      contact_name:      contactName,
      phone,
      address:           fullBusinessAddress,
      address1:          address1 || null,
      address2:          address2 || null,
      province:          province || null,
      postcode:          postcode || null,
      country:           country || null,
      website:           normalizeWebsite(website),
      service_radius_km: 30,
      // Fleet address
      base_address:      fullBaseAddress || null,
      base_address1:     baseAddress1 || null,
      base_address2:     baseAddress2 || null,
      base_city:         baseCity || null,
      base_province:     baseProvince || null,
      base_postcode:     basePostcode || null,
      base_country:      baseCountry || null,
      base_lat:          baseLat,
      base_lng:          baseLng,
      role:              "partner",
    }, { onConflict: "user_id" });

    if (profileErr) {
      await safeDeleteApplication(db, userId);
      await safeDeleteAuthUser(db, userId);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    await sendApplicationReceivedEmail(email);

    return NextResponse.json({ ok: true, user_id: userId, email_sent: true }, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}