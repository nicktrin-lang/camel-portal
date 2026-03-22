import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { sendApplicationReceivedEmail } from "@/lib/email";

type Body = {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  password?: string;
  address1?: string;
  address2?: string;
  province?: string;
  postcode?: string;
  country?: string;
  baseAddress?: string;
  baseLat?: number | string | null;
  baseLng?: number | string | null;
};

function normalizeWebsite(v: string) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function buildAddressString(opts: {
  line1: string;
  line2: string;
  province: string;
  postcode: string;
  countryName: string;
}) {
  const parts = [
    opts.line1.trim(),
    opts.line2.trim(),
    [opts.province.trim(), opts.postcode.trim()].filter(Boolean).join(" "),
    opts.countryName.trim(),
  ].filter(Boolean);

  return parts.join(", ");
}

function parseCoordinate(
  value: string | number | null | undefined,
  kind: "lat" | "lng"
): number | null {
  if (value === null || value === undefined) return null;

  let raw = String(value).trim().toUpperCase();
  if (!raw) return null;

  let sign = 1;

  if (kind === "lat") {
    if (raw.includes("S")) sign = -1;
    raw = raw.replace(/[NS]/g, "");
  }

  if (kind === "lng") {
    if (raw.includes("W")) sign = -1;
    raw = raw.replace(/[EW]/g, "");
  }

  raw = raw.replace(/,/g, ".").trim();

  const num = Number(raw);
  if (!Number.isFinite(num)) return null;

  return sign * num;
}

async function safeDeleteApplication(db: any, userId: string) {
  try {
    await db.from("partner_applications").delete().eq("user_id", userId);
  } catch (e) {
    console.error("⚠️ Failed cleanup delete partner_applications for user:", userId, e);
  }
}

async function safeDeleteAuthUser(db: any, userId: string) {
  try {
    await db.auth.admin.deleteUser(userId);
  } catch (e) {
    console.error("⚠️ Failed cleanup delete auth user:", userId, e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    const companyName = String(body?.companyName || "").trim();
    const contactName = String(body?.contactName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const website = String(body?.website || "").trim();
    const password = String(body?.password || "");

    const address1 = String(body?.address1 || "").trim();
    const address2 = String(body?.address2 || "").trim();
    const province = String(body?.province || "").trim();
    const postcode = String(body?.postcode || "").trim();
    const country = String(body?.country || "").trim();

    const baseAddress = String(body?.baseAddress || "").trim();
    const baseLat = parseCoordinate(body?.baseLat, "lat");
    const baseLng = parseCoordinate(body?.baseLng, "lng");

    console.log("🚀 complete-signup called for:", email);

    if (!companyName) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    if (!contactName) {
      return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: "Phone is required." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (!address1) {
      return NextResponse.json(
        { error: "Business address line 1 is required." },
        { status: 400 }
      );
    }

    if (!province) {
      return NextResponse.json({ error: "Province / State is required." }, { status: 400 });
    }

    if (!postcode) {
      return NextResponse.json({ error: "Postcode is required." }, { status: 400 });
    }

    if (!country) {
      return NextResponse.json({ error: "Country is required." }, { status: 400 });
    }

    if (!baseAddress) {
      return NextResponse.json({ error: "Car fleet address is required." }, { status: 400 });
    }

    if (baseLat === null || baseLng === null) {
      return NextResponse.json(
        { error: "Car fleet latitude and longitude must be valid numbers." },
        { status: 400 }
      );
    }

    const db = createServiceRoleSupabaseClient();

    const fullBusinessAddress = buildAddressString({
      line1: address1,
      line2: address2,
      province,
      postcode,
      countryName: country,
    });

    console.log("👤 Creating auth user:", email);

    const { data: createdUser, error: createUserErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: contactName,
        company_name: companyName,
      },
    });

    if (createUserErr) {
      console.error("❌ createUserErr:", createUserErr.message);
      return NextResponse.json({ error: createUserErr.message }, { status: 400 });
    }

    const userId = String(createdUser?.user?.id || "").trim();

    if (!userId) {
      return NextResponse.json(
        { error: "Could not create user account." },
        { status: 500 }
      );
    }

    console.log("✅ Auth user created:", userId);

    const applicationPayload = {
      user_id: userId,
      company_name: companyName,
      full_name: contactName,
      email,
      phone,
      address: fullBusinessAddress,
      address1,
      address2,
      province,
      postcode,
      country,
      website: normalizeWebsite(website),
      status: "pending",
    };

    const { error: applicationErr } = await db
      .from("partner_applications")
      .insert(applicationPayload);

    if (applicationErr) {
      console.error("❌ applicationErr:", applicationErr.message);
      await safeDeleteAuthUser(db, userId);
      return NextResponse.json({ error: applicationErr.message }, { status: 400 });
    }

    console.log("✅ Partner application inserted");

    const profilePayload = {
      user_id: userId,
      company_name: companyName,
      contact_name: contactName,
      phone,
      address: fullBusinessAddress,
      address1,
      address2,
      province,
      postcode,
      country,
      website: normalizeWebsite(website),
      service_radius_km: 30,
      base_address: baseAddress,
      base_lat: baseLat,
      base_lng: baseLng,
      role: "partner",
    };

    const { error: profileErr } = await db
      .from("partner_profiles")
      .upsert(profilePayload, { onConflict: "user_id" });

    if (profileErr) {
      console.error("❌ profileErr:", profileErr.message);
      await safeDeleteApplication(db, userId);
      await safeDeleteAuthUser(db, userId);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    console.log("✅ Partner profile upserted");
    console.log("📧 Sending application received email to:", email);

    const emailResult = await sendApplicationReceivedEmail(email);
    console.log("✅ Application received email sent:", emailResult);

    return NextResponse.json(
      {
        ok: true,
        user_id: userId,
        email_sent: true,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("❌ complete-signup route failed:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}